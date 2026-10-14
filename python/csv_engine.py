"""
csv_engine.py — 在瀏覽器 (Pyodide) 裡執行的「任意 CSV」多元線性迴歸分析引擎

流程（CRISP-DM 精簡版）：
    1. inspect_csv(bytes)          讀檔、判斷編碼 / 分隔符號 / 標題列、分析每個欄位的型態
    2. analyze(bytes, target)      清洗 → 編碼 → 切分 80/20 → 五種特徵選擇 → 每個 K 的模型與檢定
    兩者都回傳 JSON 字串，給 app.js 直接畫圖；格式和 model_data.js 的資料集完全相同。

出錯時一律丟出 CsvError("原因｜建議")，網頁會把原因顯示在「載入失敗」旁邊。

五種特徵選擇演算法（全部只用訓練集決定順序，測試集只用來評分）：
    Forward SFS  前向逐步選擇：每輪加入讓交叉驗證 RMSE 最低的特徵
    Lasso        L1 正則化路徑：特徵「越早出現非零係數」越重要
    RFE          遞迴特徵消除：標準化後線性迴歸，反覆刪掉係數最小的特徵
    ElasticNet   L1+L2 正則化路徑（l1_ratio = 0.5）：同 Lasso 的進場順序
    Exhaustive   窮舉法：每個 K 都試遍所有組合，挑交叉驗證 RMSE 最低的
"""

import csv
import io
import json
import math
import re
from itertools import combinations

import numpy as np
import pandas as pd
from scipy import stats
from sklearn.feature_selection import RFE
from sklearn.linear_model import LinearRegression, enet_path, lasso_path
from sklearn.model_selection import KFold, train_test_split
from sklearn.preprocessing import StandardScaler

RANDOM_STATE = 42
MAX_BYTES = 10 * 1024 * 1024          # 檔案上限 10 MB
MIN_ROWS = 10                         # 至少 10 筆有效資料
MAX_ROWS = 5000                       # 超過就隨機抽樣（瀏覽器運算速度考量）
MAX_FEATURES = 10                     # 特徵上限（窮舉法 2^10 = 1023 種組合）
MAX_CATEGORY_LEVELS = 15              # 類別欄位最多 15 種值，超過視為文字欄位略過
MAX_SLIDERS = 6
MAX_POINTS = 500                      # 散佈圖最多畫 500 點（離群值一定會畫）
ALGOS = ["Forward SFS", "Lasso", "RFE", "ElasticNet", "Exhaustive"]
MISSING_TOKENS = {"", "na", "n/a", "nan", "null", "none", "?", "-", "--", "#n/a", "missing"}
ID_NAMES = {"id", "index", "no", "no.", "編號", "序號", "unnamed: 0", "row", "rowid", "#"}
TARGET_HINTS = ["profit", "price", "medv", "target", "charges", "sales", "revenue", "y",
                "label", "score", "salary", "income", "cost", "value", "amount", "利潤",
                "價格", "房價", "營收", "銷售", "目標"]
BOSTON_COLS = ["crim", "zn", "indus", "chas", "nox", "rm", "age", "dis", "rad", "tax",
               "ptratio", "b", "lstat", "medv"]


class CsvError(Exception):
    """可預期的資料問題：訊息格式為「原因｜建議」，直接顯示給使用者"""


# ----------------------------------------------------------------------
# 1. 讀檔：編碼、分隔符號、標題列
# ----------------------------------------------------------------------
def _to_bytes(data):
    if isinstance(data, (bytes, bytearray)):
        return bytes(data)
    if isinstance(data, memoryview):
        return data.tobytes()
    if isinstance(data, str):
        return data.encode("utf-8")
    try:                                  # Pyodide 的 JsProxy（Uint8Array）
        return bytes(data.to_py())
    except Exception:
        return bytes(data)


def _decode(raw):
    if len(raw) == 0:
        raise CsvError("檔案是空的（0 bytes）｜請確認選到的是有內容的 CSV 檔")
    if len(raw) > MAX_BYTES:
        raise CsvError(f"檔案太大（{len(raw) / 1024 / 1024:.1f} MB，上限 10 MB）"
                       "｜請先刪減欄位或筆數再上傳")
    if raw[:2] == b"PK":
        raise CsvError("這是 Excel 檔（.xlsx / .zip），不是 CSV"
                       "｜請在 Excel 選「另存新檔 → CSV UTF-8（逗號分隔）」再上傳")
    if raw[:4] == b"%PDF":
        raise CsvError("這是 PDF 檔，不是 CSV｜請上傳 .csv 文字檔")
    if raw[:1024].count(b"\x00") > 10:
        raise CsvError("檔案內容是二進位格式，不是文字 CSV"
                       "｜請確認副檔名是 .csv，且可以用記事本打開看到文字")
    for enc in ("utf-8-sig", "cp950", "big5hkscs", "gb18030"):
        try:
            return raw.decode(enc), enc
        except UnicodeDecodeError:
            continue
    return raw.decode("latin-1"), "latin-1"


def _sniff_delimiter(text):
    lines = [l for l in text.splitlines() if l.strip()][:30]
    if not lines:
        raise CsvError("檔案裡沒有任何文字資料｜請確認 CSV 不是空白檔")
    sample = "\n".join(lines)
    try:
        return csv.Sniffer().sniff(sample, delimiters=",;\t|").delimiter
    except csv.Error:
        counts = {d: sum(l.count(d) for l in lines) for d in [",", ";", "\t", "|"]}
        best = max(counts, key=counts.get)
        return best if counts[best] > 0 else ","


def _is_number_like(s):
    s = str(s).strip().replace(",", "")
    try:
        float(s)
        return True
    except ValueError:
        return False


def _read_table(raw):
    text, encoding = _decode(raw)
    head = text.lstrip()[:200].lower()
    if head.startswith("<!doctype") or head.startswith("<html") or "<head" in head:
        raise CsvError("讀到的是網頁 (HTML)，不是 CSV"
                       "｜如果是網址，請改用「Raw / 直連下載」的網址（GitHub 要按 Raw）")
    if head.startswith("{") or head.startswith("["):
        raise CsvError("內容是 JSON 格式，不是 CSV｜請轉成 CSV（逗號分隔的表格）再上傳")
    delim = _sniff_delimiter(text)
    warnings = []

    def _parse(header):
        try:
            return pd.read_csv(io.StringIO(text), sep=delim, header=header, dtype=str,
                               skipinitialspace=True, keep_default_na=False,
                               engine="python", skip_blank_lines=True)
        except pd.errors.ParserError as e:
            m = re.search(r"line (\d+)", str(e))
            where = f"第 {m.group(1)} 行附近" if m else "某一行"
            raise CsvError(f"CSV 格式錯誤：{where}的欄位數和標題列不一致"
                           "｜請檢查該行是否多了逗號、少了欄位，或文字中的逗號沒有用雙引號包起來")
        except pd.errors.EmptyDataError:
            raise CsvError("檔案裡沒有可讀取的資料｜請確認 CSV 不是空白檔")

    df = _parse(0)
    # 無標題列偵測：如果「標題」大多是數字，代表第一列其實是資料
    headers = [str(c) for c in df.columns]
    if len(headers) >= 2 and sum(_is_number_like(h) for h in headers) / len(headers) >= 0.7:
        df = _parse(None)
        n = df.shape[1]
        df.columns = BOSTON_COLS if n == 14 else [f"Col_{i + 1}" for i in range(n)]
        warnings.append("第一列看起來是數字資料，已判定為「無標題列」並自動命名欄位"
                        + ("（14 欄 → 套用 Boston Housing 欄名）" if n == 14 else "（Col_1、Col_2…）"))

    df.columns = [_safe(c) or f"Col_{i + 1}" for i, c in enumerate(df.columns)]
    # 移除完全空白的欄與列（Excel 常見的尾端空欄 "Unnamed: 5"）
    df = df.replace(r"^\s*$", "", regex=True)
    empty_cols = [c for c in df.columns if (df[c].astype(str).str.strip() == "").all()]
    if empty_cols:
        df = df.drop(columns=empty_cols)
        warnings.append(f"已移除 {len(empty_cols)} 個完全空白的欄位")
    df = df[~(df.astype(str).apply(lambda r: r.str.strip() == "").all(axis=1))]
    df = df.reset_index(drop=True)

    if df.shape[1] < 2:
        raise CsvError(f"只讀到 {df.shape[1]} 個欄位，無法做迴歸（至少要 1 個目標 + 1 個特徵）"
                       "｜可能分隔符號不是逗號、分號或 Tab，或檔案只有一欄")
    if len(df) < MIN_ROWS:
        raise CsvError(f"資料只有 {len(df)} 筆，太少了（至少需要 {MIN_ROWS} 筆）"
                       "｜請提供更多資料列，建議 30 筆以上結果才穩定")
    dup = df.columns[df.columns.duplicated()].tolist()
    if dup:
        df.columns = _dedupe(df.columns)
        warnings.append(f"欄位名稱重複（{', '.join(dup)}），已自動加上編號區分")
    meta = {"encoding": encoding, "sep": delim,
            "delimiter": {",": "逗號 ,", ";": "分號 ;", "\t": "Tab", "|": "直線 |"}.get(delim, delim)}
    return df, meta, warnings


def _safe(s):
    """移除可能被當成 HTML 的字元（欄位名稱、類別值會顯示在網頁上）"""
    return re.sub(r"[<>\"'`]", "", str(s)).strip()


def _dedupe(cols):
    seen, out = {}, []
    for c in cols:
        if c in seen:
            seen[c] += 1
            out.append(f"{c}_{seen[c]}")
        else:
            seen[c] = 0
            out.append(c)
    return out


# ----------------------------------------------------------------------
# 2. 欄位型態判斷
# ----------------------------------------------------------------------
def _clean_numeric(series, delim):
    s = series.astype(str).str.strip()
    s = s.where(~s.str.lower().isin(MISSING_TOKENS), None)
    s = s.str.replace(r"^(NT\$|US\$|\$|€|£|¥)", "", regex=True)
    s = s.str.replace(r"[%\s]", "", regex=True)
    if delim == ";":                                  # 歐式格式 1.234,5 → 1234.5（只處理含逗號的值）
        has_comma = s.str.contains(",", regex=False, na=False)
        s = s.where(~has_comma, s.str.replace(".", "", regex=False).str.replace(",", ".", regex=False))
    else:
        s = s.str.replace(",", "", regex=False)       # 千分位 1,234
    s = s.str.replace(r"^\((.*)\)$", r"-\1", regex=True)   # 會計格式 (123) = -123
    return pd.to_numeric(s, errors="coerce")


def _profile_columns(df, delim):
    cols = []
    for c in df.columns:
        raw = df[c].astype(str).str.strip()
        is_missing = raw.str.lower().isin(MISSING_TOKENS)
        n_present = int((~is_missing).sum())
        info = {"name": c, "missing": int(is_missing.sum()), "unique": 0, "role": "empty",
                "can_target": False}
        if n_present == 0:
            cols.append(info)
            continue
        num = _clean_numeric(df[c], delim)
        ok_ratio = num.notna().sum() / n_present
        if ok_ratio >= 0.95:
            vals = num.dropna()
            info["unique"] = int(vals.nunique())
            info["is_number"] = True
            if info["unique"] <= 1:
                info["role"] = "constant"
            elif _looks_like_id(c, vals, len(df)):
                info["role"] = "id"
            else:
                info["role"] = "numeric"
                info["can_target"] = True
                info["binary"] = info["unique"] == 2
        else:
            vals = raw[~is_missing]
            info["unique"] = int(vals.nunique())
            if info["unique"] <= 1:
                info["role"] = "constant"
            elif info["unique"] <= MAX_CATEGORY_LEVELS:
                info["role"] = "categorical"
            else:
                info["role"] = "text"
            bad = vals[num[~is_missing].isna()].head(3).tolist()
            info["sample_non_numeric"] = bad
        cols.append(info)
    return cols


def _looks_like_id(name, vals, n):
    if str(name).strip().lower() in ID_NAMES:
        return True
    if len(vals) == n and vals.nunique() == n and np.allclose(vals, np.round(vals)):
        d = np.diff(vals.to_numpy())
        return bool(len(d) and np.all(d == 1))
    return False


def _suggest_target(profile):
    cands = [c for c in profile if c["can_target"] and not c.get("binary")]
    if not cands:
        cands = [c for c in profile if c["can_target"]]
    if not cands:
        return None
    for hint in TARGET_HINTS:
        for c in cands:
            if c["name"].strip().lower() == hint:
                return c["name"]
    for hint in TARGET_HINTS:
        for c in cands:
            if hint in c["name"].strip().lower() and len(hint) > 2:
                return c["name"]
    return cands[-1]["name"]


ROLE_LABEL = {"numeric": "數值特徵", "categorical": "類別特徵（自動編碼）", "id": "ID 欄（略過）",
              "constant": "常數欄（略過）", "text": "文字欄（種類太多，略過）",
              "empty": "空白欄（略過）"}


def inspect_csv(data, filename="data.csv"):
    """回傳欄位分析結果（JSON 字串），讓使用者選擇目標欄位"""
    raw = _to_bytes(data)
    df, meta, warnings = _read_table(raw)
    profile = _profile_columns(df, meta["sep"])
    for p in profile:
        p["role_label"] = ROLE_LABEL[p["role"]]
    targets = [p["name"] for p in profile if p["can_target"]]
    const_num = [p["name"] for p in profile if p.get("is_number") and p["role"] == "constant"]
    if not targets and const_num:
        raise CsvError(f"數值欄位（{', '.join(const_num)}）每一筆的值都一樣，沒有東西可以預測"
                       "｜目標欄位的數值必須有變化；請確認資料是否正確")
    if not targets:
        non_num = [p for p in profile if p["role"] in ("categorical", "text")]
        example = ""
        if non_num and non_num[0].get("sample_non_numeric"):
            example = f"（例如欄位「{non_num[0]['name']}」含有「{non_num[0]['sample_non_numeric'][0]}」）"
        raise CsvError(f"找不到任何數值欄位可以當預測目標{example}"
                       "｜線性迴歸的目標 (y) 必須是數字；請確認數字欄位沒有混入文字或單位")
    usable = [p for p in profile if p["role"] in ("numeric", "categorical")]
    if len(usable) < 2:
        raise CsvError("可用欄位不足：除了目標以外沒有任何數值或類別特徵"
                       "｜至少需要 1 個目標欄位 + 1 個特徵欄位（ID、常數、空白、長文字欄會被略過）")
    return json.dumps({
        "ok": True, "filename": filename, "n_rows": int(len(df)), "n_cols": int(df.shape[1]),
        "encoding": meta["encoding"], "delimiter": meta["delimiter"], "columns": profile,
        "targets": targets, "suggested_target": _suggest_target(profile), "warnings": warnings,
    }, ensure_ascii=False)


# ----------------------------------------------------------------------
# 3. 統計與模型工具
# ----------------------------------------------------------------------
def _ols(X, y):
    X1 = np.column_stack([np.ones(len(X)), X])
    beta, *_ = np.linalg.lstsq(X1, y, rcond=None)
    return beta


def _predict(beta, X):
    return beta[0] + X @ beta[1:]


class _CV:
    """
    訓練集 K-fold（重複 3 次）交叉驗證 RMSE，結果快取。
    每個 fold 先算好 XᵀX、Xᵀy（含截距），之後任何特徵組合只要解一個小矩陣，
    速度和資料筆數無關（窮舉法 1,023 種組合也很快）。
    """

    def __init__(self, X, y):
        n = len(y)
        k = max(2, min(5, n // 3))
        X1 = np.column_stack([np.ones(n), X])
        self.folds = []
        for rep in range(3):
            kf = KFold(n_splits=k, shuffle=True, random_state=RANDOM_STATE + rep)
            for tr, va in kf.split(X):
                A, B = X1[tr], X1[va]
                self.folds.append((A.T @ A, A.T @ y[tr], B.T @ B, B.T @ y[va],
                                   float(y[va] @ y[va]), float(y[va].sum()), len(va)))
        self.n_splits = k
        self.cache = {}

    def score(self, idx):
        key = tuple(sorted(idx))
        if key not in self.cache:
            s = [0] + [j + 1 for j in key]
            rmses, r2s = [], []
            for Gt, gt, Gv, gv, yy, ys, nv in self.folds:
                b = np.linalg.lstsq(Gt[np.ix_(s, s)], gt[s], rcond=None)[0]
                sse = max(yy - 2 * b @ gv[s] + b @ Gv[np.ix_(s, s)] @ b, 0.0)
                rmses.append(math.sqrt(sse / nv))
                sst = yy - ys * ys / nv
                r2s.append(1 - sse / sst if sst > 0 else 0.0)
            r = np.array(rmses)
            self.cache[key] = (float(r.mean()), float(r.std(ddof=1) / math.sqrt(len(r))),
                               float(np.mean(r2s)))
        return self.cache[key]


def _entry_order(path_coefs, corr_abs):
    """正則化路徑上，特徵第一次出現非零係數的位置越早越重要"""
    p, n_alpha = path_coefs.shape
    entry = []
    for j in range(p):
        nz = np.nonzero(np.abs(path_coefs[j]) > 1e-10)[0]
        entry.append(nz[0] if len(nz) else n_alpha + 1)
    return sorted(range(p), key=lambda j: (entry[j], -corr_abs[j]))


def _alpha_grid(Xs, yc, l1_ratio, n=200):
    """正則化強度由大到小（跨 scikit-learn 版本都相容，不依賴 n_alphas 參數）"""
    a_max = float(np.max(np.abs(Xs.T @ yc))) / (len(yc) * l1_ratio)
    a_max = a_max if a_max > 0 else 1.0
    return np.geomspace(a_max, a_max * 1e-4, n)


def _finite(v, default=0.0):
    try:
        v = float(v)
    except (TypeError, ValueError):
        return default
    return v if math.isfinite(v) else default


# ----------------------------------------------------------------------
# 4. 主分析
# ----------------------------------------------------------------------
def analyze(data, target, filename="data.csv"):
    raw = _to_bytes(data)
    df, meta, warnings = _read_table(raw)
    delim = meta["sep"]
    profile = {p["name"]: p for p in _profile_columns(df, delim)}

    if target not in profile:
        raise CsvError(f"找不到目標欄位「{target}」｜請重新選擇目標欄位")
    if not profile[target]["can_target"]:
        raise CsvError(f"目標欄位「{target}」不是數值（判定為{ROLE_LABEL[profile[target]['role']]}）"
                       "｜線性迴歸只能預測數字，請改選數值欄位")

    # --- 清洗：目標缺失的列刪除 ---
    y_all = _clean_numeric(df[target], delim)
    miss_y = int(y_all.isna().sum())
    df = df[y_all.notna()].reset_index(drop=True)
    y_all = y_all.dropna().reset_index(drop=True)
    if miss_y:
        warnings.append(f"目標欄位有 {miss_y} 筆缺失，已刪除這些列")
    if len(df) < MIN_ROWS:
        raise CsvError(f"刪除目標缺失值後只剩 {len(df)} 筆，少於 {MIN_ROWS} 筆"
                       "｜請補齊目標欄位的數值")
    if profile[target].get("binary"):
        warnings.append(f"目標「{target}」只有 2 種值（像是 0/1 分類），線性迴歸結果僅供參考，"
                        "分類問題建議改用邏輯迴歸")

    # --- 抽樣 ---
    n_original = len(df)
    if len(df) > MAX_ROWS:
        keep = df.sample(n=MAX_ROWS, random_state=RANDOM_STATE).index.sort_values()
        df, y_all = df.loc[keep].reset_index(drop=True), y_all.loc[keep].reset_index(drop=True)
        warnings.append(f"資料共 {n_original:,} 筆，為了瀏覽器運算速度已隨機抽樣 {MAX_ROWS:,} 筆分析")

    num_cols = [c for c, p in profile.items() if c != target and p["role"] == "numeric"]
    cat_cols = [c for c, p in profile.items() if c != target and p["role"] == "categorical"]
    skipped = {c: p["role"] for c, p in profile.items()
               if c != target and p["role"] not in ("numeric", "categorical")}
    if skipped:
        short = {"id": "ID 欄", "constant": "常數欄", "text": "種類太多的文字欄", "empty": "空白欄"}
        warnings.append("已略過欄位：" + "、".join(f"{c}（{short[r]}）" for c, r in skipped.items()))
    if not num_cols and not cat_cols:
        raise CsvError("除了目標欄位外，沒有可用的特徵"
                       "｜其他欄位都是 ID、常數、空白或種類太多的文字；至少需要 1 個數值或類別特徵")

    # --- 數值特徵：缺失補中位數 ---
    feats = pd.DataFrame(index=df.index)
    for c in num_cols:
        v = _clean_numeric(df[c], delim)
        m = int(v.isna().sum())
        if m:
            v = v.fillna(v.median())
            warnings.append(f"「{c}」有 {m} 筆缺失，已補中位數")
        feats[c] = v.astype(float)

    # --- 類別特徵：最常見的值當基準組，其餘做 dummy（Two dummies 的推廣） ---
    categoricals = []
    for c in cat_cols:
        s = df[c].astype(str).map(_safe)
        miss = s.str.lower().isin(MISSING_TOKENS)
        if miss.any():
            s = s.where(~miss, s[~miss].mode().iloc[0])
            warnings.append(f"「{c}」有 {int(miss.sum())} 筆缺失，已補最常見的類別")
        levels = s.value_counts()
        baseline = levels.index[0]
        dummies = {}
        for lv in levels.index[1:]:
            name = f"{c}_{lv}"
            feats[name] = (s == lv).astype(float)
            dummies[lv] = name
        categoricals.append({"column": c, "baseline": baseline,
                             "levels": [{"value": baseline, "dummy": None}] +
                                       [{"value": lv, "dummy": d} for lv, d in dummies.items()]})

    # 完全相同的欄位（例如重複資料）只留一個
    dup_feats = feats.columns[feats.T.duplicated()].tolist()
    if dup_feats:
        feats = feats.drop(columns=dup_feats)
        warnings.append(f"以下特徵和其他欄位完全相同，已移除：{', '.join(dup_feats)}")
    feats = feats.loc[:, feats.std() > 0]

    y = y_all.to_numpy(float)
    if np.std(y) == 0:
        raise CsvError(f"目標欄位「{target}」每一筆的值都一樣，沒有東西可以預測｜請改選其他數值欄位")

    # --- 切分訓練 / 測試集 ---
    n = len(y)
    n_test = max(3, int(round(n * 0.2)))
    idx_tr, idx_te = train_test_split(np.arange(n), test_size=n_test, random_state=RANDOM_STATE)

    # --- 特徵上限：取和目標相關性最高的前 N 個（只用訓練集計算） ---
    max_feat = min(MAX_FEATURES, len(idx_tr) - 3)
    if max_feat < 1:
        raise CsvError(f"資料太少（訓練集只有 {len(idx_tr)} 筆），無法估計模型｜請提供至少 {MIN_ROWS} 筆資料")
    corr_tr = feats.iloc[idx_tr].apply(lambda col: abs(np.corrcoef(col, y[idx_tr])[0, 1])
                                       if col.iloc[:].std() > 0 else 0).fillna(0)
    if feats.shape[1] > max_feat:
        keep = corr_tr.sort_values(ascending=False).index[:max_feat].tolist()
        dropped = [c for c in feats.columns if c not in keep]
        feats = feats[keep]
        warnings.append(f"特徵共 {len(keep) + len(dropped)} 個，超過上限 {max_feat} 個，"
                        f"已保留和目標相關性最高的 {max_feat} 個（略過：{', '.join(dropped)}）")
    if feats.shape[1] == 0:
        raise CsvError("清洗後沒有任何有變化的特徵（所有特徵都是常數）｜請檢查資料內容")

    names = list(feats.columns)
    p = len(names)
    X = feats.to_numpy(float)
    Xtr, Xte, ytr, yte = X[idx_tr], X[idx_te], y[idx_tr], y[idx_te]
    corr_abs = [float(corr_tr.get(c, 0)) for c in names]

    # --- 五種特徵選擇演算法：決定每個 K 要用哪些特徵 ---
    cv = _CV(Xtr, ytr)
    orders = {}

    # (1) Forward SFS
    sel, remain = [], list(range(p))
    while remain:
        best = min(remain, key=lambda j: (cv.score(sel + [j])[0], -corr_abs[j]))
        sel.append(best)
        remain.remove(best)
    orders["Forward SFS"] = [sel[:k] for k in range(1, p + 1)]

    sc = StandardScaler().fit(Xtr)
    Xs = sc.transform(Xtr)
    yc = ytr - ytr.mean()
    # (2) Lasso 路徑
    _, coefs, _ = lasso_path(Xs, yc, alphas=_alpha_grid(Xs, yc, 1.0))
    lo = _entry_order(coefs, corr_abs)
    orders["Lasso"] = [lo[:k] for k in range(1, p + 1)]
    # (3) RFE
    if p > 1:
        rank = RFE(LinearRegression(), n_features_to_select=1).fit(Xs, ytr).ranking_
        ro = sorted(range(p), key=lambda j: rank[j])
    else:
        ro = [0]
    orders["RFE"] = [ro[:k] for k in range(1, p + 1)]
    # (4) ElasticNet 路徑
    _, coefs_en, _ = enet_path(Xs, yc, l1_ratio=0.5, alphas=_alpha_grid(Xs, yc, 0.5))
    eo = _entry_order(coefs_en, corr_abs)
    orders["ElasticNet"] = [eo[:k] for k in range(1, p + 1)]
    # (5) Exhaustive：每個 K 都窮舉所有組合
    ex = []
    for k in range(1, p + 1):
        best = min(combinations(range(p), k), key=lambda comb: cv.score(list(comb))[0])
        ex.append(sorted(best, key=lambda j: sel.index(j)))   # 依前向選擇順序排列，方便閱讀
    orders["Exhaustive"] = ex

    # --- 每個特徵組合的完整報告（快取） ---
    label_col = categoricals[0]["column"] if categoricals else None
    labels = df[label_col].astype(str).map(_safe).tolist() if label_col else None
    if n > MAX_POINTS:
        point_idx = np.sort(np.random.RandomState(RANDOM_STATE).choice(n, MAX_POINTS, replace=False))
        warnings.append(f"散佈圖只顯示隨機 {MAX_POINTS} 個樣本點（Top 10 離群值一定會顯示），指標仍以全部資料計算")
    else:
        point_idx = np.arange(n)
    is_test = np.zeros(n, dtype=bool)
    is_test[idx_te] = True
    report_cache = {}

    def report(idx):
        key = tuple(sorted(idx))
        if key not in report_cache:
            report_cache[key] = _report(key, names, X, y, idx_tr, idx_te, labels, is_test, cv, point_idx)
        r = dict(report_cache[key])
        # 係數表依「加入順序」排列
        order = {names[j]: i for i, j in enumerate(idx)}
        coefs_sorted = [r["coefficients"][0]] + sorted(r["coefficients"][1:],
                                                       key=lambda c: order[c["feature"]])
        r["coefficients"] = coefs_sorted
        r["features"] = [names[j] for j in idx]
        r["k"] = len(idx)
        return r

    models, rec_k, low_k = {}, {}, {}
    for algo in ALGOS:
        steps = [report(idx) for idx in orders[algo]]
        models[algo] = steps
        best = min(steps, key=lambda s: s["cv_rmse"])
        thr = best["cv_rmse"] + best["cv_rmse_se"]
        rec = min((s for s in steps if s["cv_rmse"] <= thr), key=lambda s: s["k"])
        rec_k[algo], low_k[algo] = rec["k"], best["k"]

    # --- 模擬器設定 ---
    fwd_names = [names[j] for j in sel]
    sliders = []
    for f in [c for c in fwd_names if c in num_cols][:MAX_SLIDERS]:
        v = feats[f]
        lo_, hi_ = float(v.min()), float(v.max())
        span = hi_ - lo_ if hi_ > lo_ else max(abs(hi_), 1.0)
        step = _nice_step(span / 100)
        sliders.append({"id": f"slider_custom_{len(sliders)}", "field": f, "label": f,
                        "min": _round_to(lo_ - span * 0.05, step, math.floor),
                        "max": _round_to(hi_ + span * 0.05, step, math.ceil),
                        "step": step, "default": _round_to(float(v.median()), step, round),
                        "icon": ["fa-flask", "fa-chart-pie", "fa-gauge-high", "fa-wave-square",
                                 "fa-sliders", "fa-ruler"][len(sliders) % 6],
                        "color": ["var(--cyan-neon)", "var(--indigo-neon)", "var(--amber-neon)",
                                  "var(--emerald-neon)", "var(--rose-neon)", "var(--cyan-neon)"][len(sliders) % 6]})
    sim_cats = [c for c in categoricals if any(lv["dummy"] in names for lv in c["levels"] if lv["dummy"])]
    presets = [{"name": "📊 中位數基準", "values": {s["field"]: s["default"] for s in sliders},
                "categories": {c["column"]: c["baseline"] for c in sim_cats}}]
    if sliders:
        presets.append({"name": "⬆️ 全部取高 (P90)",
                        "values": {s["field"]: _round_to(float(feats[s["field"]].quantile(0.9)), s["step"], round) for s in sliders},
                        "categories": {c["column"]: c["baseline"] for c in sim_cats}})
        presets.append({"name": "⬇️ 全部取低 (P10)",
                        "values": {s["field"]: _round_to(float(feats[s["field"]].quantile(0.1)), s["step"], round) for s in sliders},
                        "categories": {c["column"]: c["baseline"] for c in sim_cats}})

    # --- 原始資料（給「瀏覽資料集」視窗用） ---
    show_cols = [c for c in df.columns if c != target][:6]
    col_vals = {}
    for c in show_cols:
        if profile[c]["role"] in ("numeric", "id"):
            v = _clean_numeric(df[c], delim)
            col_vals[c] = [None if pd.isna(x) else _finite(x, None) for x in v]
        else:
            col_vals[c] = [_safe(x) for x in df[c].astype(str)]
    records = []
    for i in range(n):
        r = {"Index": i}
        for c in show_cols:
            r[c] = col_vals[c][i]
        r[target] = float(y[i])
        records.append(r)

    name = _safe(re.sub(r"\.(csv|txt|tsv)$", "", str(filename), flags=re.I)) or "Custom CSV"
    fwd_rec = rec_k["Forward SFS"]
    fwd_step = models["Forward SFS"][fwd_rec - 1]
    cfg = {
        "id": "custom", "name": name,
        "fullName": "多元線性回歸",
        "badge": "Custom CSV · Python (Pyodide)",
        "target": target, "targetLabel": target, "targetUnit": "", "isCurrency": False,
        "description": (f"自訂資料集「{name}」：{n:,} 筆有效資料（訓練 {len(idx_tr)} / 測試 {len(idx_te)}），"
                        f"候選特徵 {p} 個。瀏覽器內以 Python scikit-learn 執行五種特徵選擇，"
                        f"RMSE / MAE / R² 皆為測試集成績；依 1-SE 法則，前向選擇推薦 K = {fwd_rec}"
                        f"（{', '.join(fwd_step['features'])}），測試集 R² = {fwd_step['r2'] * 100:.1f}%。"),
        "tags": [f'<i class="fa-solid fa-database"></i> {n:,} 筆資料（訓練 {len(idx_tr)} / 測試 {len(idx_te)}）',
                 f'<i class="fa-solid fa-bullseye"></i> 目標欄位：{_esc(target)}',
                 f'<i class="fa-solid fa-filter"></i> {p} 個候選特徵（{len(num_cols)} 數值 / {len(categoricals)} 類別）',
                 f'<i class="fa-brands fa-python"></i> scikit-learn in Browser (Pyodide)',
                 f'<i class="fa-solid fa-star"></i> 1-SE 推薦 K = {fwd_rec}'],
        "recordCount": n, "records": records, "models": models, "targetMedian": float(np.median(y)),
        "recommendedK": rec_k, "lowestCvK": low_k,
        "simulator": {"type": "custom", "sliders": sliders, "categoricals": sim_cats, "presets": presets,
                      "numericMedians": {c: float(feats[c].median()) for c in names if c in num_cols}},
        "warnings": warnings,
        "engineInfo": {"encoding": meta["encoding"], "delimiter": meta["delimiter"],
                       "n_rows_original": n_original, "n_train": int(len(idx_tr)),
                       "n_test": int(len(idx_te)), "cv": f"{cv.n_splits}-fold × 3 次",
                       "features": names},
    }
    return json.dumps(cfg, ensure_ascii=False, allow_nan=False)


def _report(key, names, X, y, idx_tr, idx_te, labels, is_test, cv, point_idx):
    cols = list(key)
    Xtr, ytr = X[np.ix_(idx_tr, cols)], y[idx_tr]
    Xte, yte = X[np.ix_(idx_te, cols)], y[idx_te]
    n_tr, k = len(ytr), len(cols)
    X1 = np.column_stack([np.ones(n_tr), Xtr])
    beta = _ols(Xtr, ytr)
    res_tr = ytr - X1 @ beta
    sse = float(res_tr @ res_tr)
    sst = float(np.sum((ytr - ytr.mean()) ** 2))
    df_res = max(n_tr - k - 1, 1)
    sigma2 = sse / df_res
    cov = sigma2 * np.linalg.pinv(X1.T @ X1)
    se = np.sqrt(np.clip(np.diag(cov), 0, None))
    with np.errstate(divide="ignore", invalid="ignore"):
        t = np.where(se > 0, beta / se, 0.0)
    pv = 2 * stats.t.sf(np.abs(t), df_res)
    tcrit = stats.t.ppf(0.975, df_res)
    r2_tr = 1 - sse / sst if sst > 0 else 0.0
    f_stat = ((sst - sse) / k) / sigma2 if sigma2 > 0 else 0.0
    f_p = float(stats.f.sf(f_stat, k, df_res)) if sigma2 > 0 else 0.0

    vif = [1.0] * k
    if k > 1:
        for j in range(k):
            others = np.delete(Xtr, j, axis=1)
            b = _ols(others, Xtr[:, j])
            e = Xtr[:, j] - _predict(b, others)
            s_t = float(np.sum((Xtr[:, j] - Xtr[:, j].mean()) ** 2))
            r2_j = 1 - float(e @ e) / s_t if s_t > 0 else 1.0
            vif[j] = 1 / (1 - r2_j) if r2_j < 1 - 1e-9 else 1e6

    coefs = [{"feature": "Intercept (β₀)", "coef": _finite(beta[0]), "stderr": _finite(se[0]),
              "tstat": _finite(t[0]), "pvalue": _finite(pv[0], 1.0),
              "ci_lower": _finite(beta[0] - tcrit * se[0]), "ci_upper": _finite(beta[0] + tcrit * se[0]),
              "vif": None}]
    for i, j in enumerate(cols):
        coefs.append({"feature": names[j], "coef": _finite(beta[i + 1]), "stderr": _finite(se[i + 1]),
                      "tstat": _finite(t[i + 1]), "pvalue": _finite(pv[i + 1], 1.0),
                      "ci_lower": _finite(beta[i + 1] - tcrit * se[i + 1]),
                      "ci_upper": _finite(beta[i + 1] + tcrit * se[i + 1]),
                      "vif": _finite(vif[i], 1e6)})

    # 測試集成績
    pred_te = _predict(beta, Xte)
    e_te = yte - pred_te
    n_te = len(yte)
    rmse = math.sqrt(float(np.mean(e_te ** 2)))
    mae = float(np.mean(np.abs(e_te)))
    sst_te = float(np.sum((yte - yte.mean()) ** 2))
    r2 = 1 - float(e_te @ e_te) / sst_te if sst_te > 0 else 0.0
    adj = (1 - (1 - r2) * (n_te - 1) / (n_te - k - 1)) if n_te - k - 1 > 0 else \
          (1 - (1 - r2_tr) * (n_tr - 1) / df_res)

    # 全部資料的預測（散佈圖 + 離群值）
    pred_all = _predict(beta, X[:, cols])
    res_all = y - pred_all
    pts = []
    for i in point_idx:
        lab = labels[i] if labels else f"Sample #{i}"
        pts.append({"index": int(i), "state": f"{lab} · {'測試' if is_test[i] else '訓練'}",
                    "actual": _finite(y[i]), "predicted": round(_finite(pred_all[i]), 6),
                    "residual": round(_finite(res_all[i]), 6)})
    order = np.argsort(-np.abs(res_all))[:10]
    outliers = [{"rank": r + 1, "index": int(i), "actual": _finite(y[i]),
                 "predicted": _finite(pred_all[i]), "residual": _finite(res_all[i]),
                 "abs_error": _finite(abs(res_all[i])),
                 "pct_error": _finite(abs(res_all[i]) / max(abs(y[i]), 1e-9) * 100)}
                for r, i in enumerate(order)]

    cv_rmse, cv_se, cv_r2 = cv.score(cols)
    return {"rmse": rmse, "mae": mae, "r2": _finite(r2), "adj_r2": _finite(adj),
            "f_stat": _finite(f_stat), "f_pvalue": _finite(f_p, 1.0), "coefficients": coefs,
            "outliers": outliers, "all_points": pts, "cv_rmse": cv_rmse, "cv_rmse_se": cv_se,
            "cv_r2": cv_r2, "train_r2": _finite(r2_tr)}


def _nice_step(x):
    if x <= 0 or not math.isfinite(x):
        return 1.0
    mag = 10 ** math.floor(math.log10(x))
    for m in (1, 2, 5, 10):
        if x <= m * mag:
            return float(m * mag)
    return float(10 * mag)


def _round_to(v, step, fn):
    r = fn(v / step) * step
    return float(round(r, 10))


def _esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            .replace('"', "&quot;"))
