"""
AIOT 專案：50 Startups 多元線性迴歸 — 完整整合版
Part 1：Model B（Two dummies）+ CRISP-DM + 離群值分析
Part 2：Forward Selection 特徵選擇 + 決策折線圖 + 模型比較
Part 3：五種熱門特徵選擇方法（相關係數 / Lasso / 隨機森林 / RFECV / 前向選擇）+ 共識投票 + 分析報告

State 編碼（Two dummies）：
    California → FL=0, NY=0（基準組，California = 1 - FL - NY）
    Florida    → FL=1, NY=0
    New York   → FL=0, NY=1

執行方式：
    pip install requests pandas numpy scikit-learn matplotlib seaborn joblib
    python startup_full_pipeline.py                  # 用 requests 從 GitHub 抓資料
    python startup_full_pipeline.py 50_Startups.csv  # 或改用本機檔案

輸出：
    主控台：各階段模型、係數、交叉驗證與測試集數據
    startup_final_model.pkl            最終部署模型

圖表（目前停用，MAKE_CHARTS = True 才會輸出）：
    【圖表 01】01_data_understanding.png          資料探索圖
    【圖表 02】02_forward_selection_decision.png  前向選擇決策折線圖 + 結果表
    【圖表 03】03_scatter_regression_outliers.png 散佈圖 + 迴歸線 + Top 10 離群值
    【圖表 04】04_feature_selection_methods.png   五種方法的特徵分數 + 共識矩陣
    【圖表 05】05_method_comparison.png           各方法特徵組合的成效比較
"""

import io
import sys
import numpy as np
import pandas as pd
import requests
import matplotlib
matplotlib.use("Agg")                      # 無視窗環境也能存圖
import matplotlib.pyplot as plt
import matplotlib.ticker
import seaborn as sns
import joblib

from sklearn.model_selection import train_test_split, KFold, RepeatedKFold
from sklearn.linear_model import LinearRegression, LassoCV
from sklearn.feature_selection import f_regression, RFECV
from sklearn.ensemble import RandomForestRegressor
from sklearn.inspection import permutation_importance
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error

URL = ("https://raw.githubusercontent.com/Avik-Jain/100-Days-Of-ML-Code/master/datasets/50_Startups.csv")
RANDOM_STATE = 42
TARGET = "Profit"
NUM_COLS = ["R&D Spend", "Administration", "Marketing Spend"]
DUMMY_COLS = ["State_Florida", "State_New York"]           # California 為基準組
FEATURES = NUM_COLS + DUMMY_COLS                            # Model B 的 5 個特徵

# 圖表開關：目前只跑模型與測試數據，所有圖表都已標註為【圖表 01】～【圖表 05】
# 需要圖表時，把 MAKE_CHARTS 改成 True 即可輸出
MAKE_CHARTS = False

# 圖表配色（藍 / 橘 已通過色盲安全檢查；文字一律用深灰）
C_BLUE, C_ORANGE, C_INK, C_MUTED, C_GRID = "#2a78d6", "#eb6834", "#333333", "#8a8a8a", "#e6e6e6"


def section(title):
    print("\n" + "=" * 72)
    print(title)
    print("=" * 72)


def style_axes(ax):
    ax.grid(True, color=C_GRID, linewidth=0.8)
    ax.set_axisbelow(True)
    for sp in ["top", "right"]:
        ax.spines[sp].set_visible(False)


# ----------------------------------------------------------------------
# 共用函式
# ----------------------------------------------------------------------
def load_data(url=URL):
    """用 requests 從 URL 抓 CSV，轉成 DataFrame"""
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    return pd.read_csv(io.StringIO(response.text))


def add_two_dummies(frame):
    """State → 兩個 dummy 欄位（FL、NY），California 為基準 (0, 0)"""
    out = frame.copy()
    out["State_Florida"] = (out["State"] == "Florida").astype(int)
    out["State_New York"] = (out["State"] == "New York").astype(int)
    return out


def evaluate_performance(y_true, y_pred):
    """回傳 (RMSE, R²)"""
    return np.sqrt(mean_squared_error(y_true, y_pred)), r2_score(y_true, y_pred)


def adjusted_r2(r2, n, p):
    return 1 - (1 - r2) * (n - 1) / (n - p - 1) if n - p - 1 > 0 else np.nan


N_SPLITS, N_REPEATS = 5, 5
N_CV_RUNS = N_SPLITS * N_REPEATS


def cv_performance(X, y, cols, n_splits=N_SPLITS, n_repeats=N_REPEATS):
    """
    重複 K-fold 交叉驗證（5-fold × 5 次 = 25 次），回傳 RMSE / R² 的平均與標準差。
    只看一次切分容易受運氣影響，重複多次比較穩定。
    """
    rkf = RepeatedKFold(n_splits=n_splits, n_repeats=n_repeats, random_state=RANDOM_STATE)
    rmses, r2s = [], []
    for tr, va in rkf.split(X):
        model = LinearRegression().fit(X.iloc[tr][cols], y.iloc[tr])
        rmse, r2 = evaluate_performance(y.iloc[va], model.predict(X.iloc[va][cols]))
        rmses.append(rmse)
        r2s.append(r2)
    return np.mean(rmses), np.std(rmses), np.mean(r2s), np.std(r2s)


def forward_selection(X_train, y_train, max_features=None):
    """
    前向選擇：從 0 個特徵開始，每一輪把剩下的特徵逐一加入試算，
    挑出讓 CV RMSE 最小（同分時 R² 最大）的特徵加入。
    只用訓練集做交叉驗證來挑，測試集留到最後評估，避免偷看答案。
    """
    remaining = list(X_train.columns)
    selected, history = [], []
    max_features = max_features or len(remaining)
    while remaining and len(selected) < max_features:
        scores = []
        for f in remaining:
            rmse, rmse_sd, r2, r2_sd = cv_performance(X_train, y_train, selected + [f])
            scores.append((rmse, -r2, f, rmse_sd, r2, r2_sd))
        rmse, _, best_f, rmse_sd, r2, r2_sd = min(scores)
        selected.append(best_f)
        remaining.remove(best_f)
        history.append({"n": len(selected), "features": selected.copy(), "added": best_f,
                        "cv_rmse": rmse, "cv_rmse_sd": rmse_sd,
                        "cv_rmse_se": rmse_sd / np.sqrt(N_CV_RUNS),     # 標準誤 = 標準差 / √次數
                        "cv_r2": r2, "cv_r2_sd": r2_sd})
        print(f"  第 {len(selected)} 輪：加入 {best_f:<16} "
              f"CV RMSE = {rmse:>10,.2f} ± {rmse_sd:,.0f}   CV R² = {r2:.4f}")
    return history


def to_markdown(df_table):
    """DataFrame → Markdown 表格（不需要額外安裝 tabulate）"""
    cols = list(df_table.columns)
    lines = ["| " + " | ".join(cols) + " |", "|" + "|".join(["---"] * len(cols)) + "|"]
    for _, row in df_table.iterrows():
        lines.append("| " + " | ".join(str(v) for v in row.values) + " |")
    return "\n".join(lines)


# ======================================================================
# 1. Business Understanding（商業理解）
# ======================================================================
section("1. Business Understanding 商業理解")
print("""目標：根據新創公司在『研發、行政、行銷』的支出與所在州別，預測公司利潤 (Profit)。
商業問題：
  - 哪些支出真正影響利潤？是否需要全部特徵？（→ Part 2 前向選擇）
  - 精簡後的模型是否比全特徵 Model B 更好？
成功標準：測試集 R² ≥ 0.90；準確度在統計上分不出高下時，選特徵較少的模型（1-SE rule）。""")


# ======================================================================
# 2. Data Understanding（資料理解）
# ======================================================================
section("2. Data Understanding 資料理解")
df = pd.read_csv(sys.argv[1]) if len(sys.argv) > 1 else load_data()
print(f"資料筆數與欄位數：{df.shape}")
print("\n前 5 筆：\n", df.head())
print("\n缺失值：\n", df.isnull().sum())
print("\n各州公司數：\n", df["State"].value_counts())
print("\n數值欄位與 Profit 的相關係數：")
print(df[NUM_COLS + [TARGET]].corr()[TARGET].sort_values(ascending=False).round(3))

# 【圖表 01】資料探索圖（熱圖、散佈圖、箱型圖、分布）→ 01_data_understanding.png
if MAKE_CHARTS:
    fig, axes = plt.subplots(2, 3, figsize=(16, 9))
    sns.heatmap(df[NUM_COLS + [TARGET]].corr(), annot=True, fmt=".2f", cmap="Blues", ax=axes[0, 0])
    axes[0, 0].set_title("Correlation Heatmap")
    for ax, col in zip([axes[0, 1], axes[0, 2], axes[1, 0]], NUM_COLS):
        sns.regplot(data=df, x=col, y=TARGET, ax=ax, color=C_BLUE,
                    scatter_kws={"s": 25}, line_kws={"color": C_INK, "lw": 2})
        ax.set_title(f"{col} vs Profit")
    sns.boxplot(data=df, x="State", y=TARGET, ax=axes[1, 1], color=C_BLUE)
    axes[1, 1].set_title("Profit by State")
    sns.histplot(df[TARGET], kde=True, ax=axes[1, 2], color=C_BLUE)
    axes[1, 2].set_title("Profit Distribution")
    plt.tight_layout()
    plt.savefig("01_data_understanding.png", dpi=120)
    plt.close()
    print("\n已儲存圖檔：01_data_understanding.png")


# ======================================================================
# 3. Data Preparation（資料準備）
# ======================================================================
section("3. Data Preparation 資料準備")
df[NUM_COLS] = df[NUM_COLS].fillna(df[NUM_COLS].median())
df = df.dropna(subset=["State", TARGET]).reset_index(drop=True)
df = add_two_dummies(df)
print("Two dummies 編碼對照：")
print(df[["State"] + DUMMY_COLS].drop_duplicates("State").to_string(index=False))

X, y = df[FEATURES], df[TARGET]
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=RANDOM_STATE)
print(f"\n訓練集 {len(X_train)} 筆、測試集 {len(X_test)} 筆；候選特徵：{FEATURES}")


# ======================================================================
# 4. Modeling（建模）
# ======================================================================
section("4. Modeling 建模")

# 4-1 Model B：全部 5 個特徵
model_b = LinearRegression().fit(X_train, y_train)
coef = pd.Series(model_b.coef_, index=FEATURES)
print("[4-1] Model B（全部 5 個特徵）係數：")
print(f"  截距 (California 基準) {model_b.intercept_:>14,.2f}")
for f, c in coef.items():
    print(f"  {f:<22} {c:>14,.4f}")

# 4-2 Part 2：Forward Selection（1 ~ 5 個特徵）
print("\n[4-2] Forward Selection（依訓練集 RepeatedKFold 5×5 挑選）")
history = forward_selection(X_train, y_train, max_features=len(FEATURES))

# 每個特徵組合：在訓練集重訓，用測試集評估
for h in history:
    m = LinearRegression().fit(X_train[h["features"]], y_train)
    h["test_rmse"], h["test_r2"] = evaluate_performance(y_test, m.predict(X_test[h["features"]]))
    h["test_adj_r2"] = adjusted_r2(h["test_r2"], len(X_test), h["n"])

# 決策規則：一個標準誤法則 (1-SE rule)，只看訓練集的交叉驗證，不看測試集
#   Step A：找出 CV RMSE 最低的特徵數 k_min
#   Step B：門檻 = 最低 CV RMSE + 它的 1 個標準誤
#   Step C：在 CV RMSE ≤ 門檻 的組合中，選「特徵最少」的
#   理由：差距小於 1 個標準誤，代表準確度在統計上分不出高下，那就選比較簡單的模型
k_min_h = min(history, key=lambda h: h["cv_rmse"])
K_MIN = k_min_h["n"]
THRESHOLD = k_min_h["cv_rmse"] + k_min_h["cv_rmse_se"]
best = min((h for h in history if h["cv_rmse"] <= THRESHOLD), key=lambda h: h["n"])
BEST_K, SELECTED = best["n"], best["features"]
print(f"\n決策過程（1-SE rule）：")
print(f"  A. CV RMSE 最低：{K_MIN} 個特徵，{k_min_h['cv_rmse']:,.2f}"
      f"（標準誤 {k_min_h['cv_rmse_se']:,.2f}）")
print(f"  B. 門檻 = {k_min_h['cv_rmse']:,.2f} + {k_min_h['cv_rmse_se']:,.2f} = {THRESHOLD:,.2f}")
for h in history:
    ok = "≤ 門檻 ✓" if h["cv_rmse"] <= THRESHOLD else "> 門檻 ✗"
    print(f"     {h['n']} 個特徵：CV RMSE {h['cv_rmse']:>10,.2f}  {ok}")
print(f"  C. → 決策：選 {BEST_K} 個特徵（門檻內最簡單）：{SELECTED}")


# ======================================================================
# 5. Evaluation（評估）
# ======================================================================
section("5. Evaluation 評估")

# 5-1 前向選擇結果表（Markdown）
fs_table = pd.DataFrame({
    "Number of Features": [h["n"] for h in history],
    "Selected Features": [", ".join(h["features"]) for h in history],
    "CV RMSE (train)": [f"{h['cv_rmse']:,.2f} ± {h['cv_rmse_sd']:,.0f}" for h in history],
    "CV R² (train)": [f"{h['cv_r2']:.4f}" for h in history],
    "Test RMSE": [f"{h['test_rmse']:,.2f}" for h in history],
    "Test R²": [f"{h['test_r2']:.4f}" for h in history],
    "Decision": ["✅ Selected" if h["n"] == BEST_K else
                 ("Model B (all)" if h["n"] == len(FEATURES) else "") for h in history]})
fs_md = to_markdown(fs_table)
print("[5-1] Forward Selection 結果：\n")
print(fs_md)


# 5-2 決策折線圖：RMSE / R² 隨特徵數變化 + 結果表
def draw_decision_chart(path="02_forward_selection_decision.png"):
    """
    決策折線圖：上方兩張折線（RMSE、R² 隨特徵數變化），中間是決策步驟說明，下方是結果表。
    所有說明都放在圖例與文字框，不用浮動標註，換成真實資料版面也不會亂掉。
    """
    from matplotlib.lines import Line2D
    from matplotlib.patches import Patch

    ks = [h["n"] for h in history]
    cv_rmse = np.array([h["cv_rmse"] for h in history])
    cv_rmse_se = np.array([h["cv_rmse_se"] for h in history])        # 色帶 = ±1 標準誤
    cv_r2 = np.array([h["cv_r2"] for h in history])
    cv_r2_se = np.array([h["cv_r2_sd"] for h in history]) / np.sqrt(N_CV_RUNS)
    te_rmse = np.array([h["test_rmse"] for h in history])
    te_r2 = np.array([h["test_r2"] for h in history])
    bi, mi, ai = ks.index(BEST_K), ks.index(K_MIN), len(ks) - 1

    # 版面用固定座標（左, 下, 寬, 高，皆為整張圖的比例）：上方折線圖 → 圖例 → 決策步驟 → 結果表
    fig = plt.figure(figsize=(16, 12))
    ax1 = fig.add_axes([0.06, 0.47, 0.41, 0.43])
    ax2 = fig.add_axes([0.56, 0.47, 0.41, 0.43])
    ax_t = fig.add_axes([0.06, 0.03, 0.91, 0.22])

    panels = [(ax1, cv_rmse, cv_rmse_se, te_rmse, "RMSE", "RMSE by Number of Features",
               "lower is better"),
              (ax2, cv_r2, cv_r2_se, te_r2, "R-squared", "R-squared by Number of Features",
               "higher is better")]
    for ax, cv, se, te, ylab, title, hint in panels:
        ax.axvspan(BEST_K - 0.3, BEST_K + 0.3, color=C_BLUE, alpha=0.07, zorder=0)
        ax.fill_between(ks, cv - se, cv + se, color=C_BLUE, alpha=0.13, linewidth=0, zorder=1)
        ax.plot(ks, cv, "-o", color=C_BLUE, lw=2, ms=8, mec="white", mew=1.5, zorder=3)
        ax.plot(ks, te, "--s", color=C_ORANGE, lw=2, ms=7, mec="white", mew=1.5, zorder=3)
        # 重點標記：選中 = 實心圈、最低 CV RMSE = 三角形、Model B（全特徵）= 方框
        ax.scatter([BEST_K], [cv[bi]], s=300, facecolor="none", edgecolor=C_INK, lw=2.2, zorder=5)
        if K_MIN != BEST_K:
            ax.scatter([K_MIN], [cv[mi]], s=150, marker="^", facecolor="none",
                       edgecolor=C_INK, lw=1.5, zorder=5)
        if BEST_K != ks[-1]:
            ax.scatter([ks[-1]], [cv[ai]], s=230, marker="s", facecolor="none",
                       edgecolor=C_MUTED, lw=1.6, zorder=5)
        handles = [
            Line2D([], [], color=C_BLUE, marker="o", lw=2, mec="white",
                   label="CV on train (used to decide)"),
            Patch(color=C_BLUE, alpha=0.25, label="CV ±1 standard error"),
            Line2D([], [], color=C_ORANGE, marker="s", ls="--", lw=2, mec="white",
                   label="Test set (final check only)"),
            Line2D([], [], ls="none", marker="o", ms=13, mfc="none", mec=C_INK, mew=2,
                   label=f"Selected: {BEST_K} features")]
        if K_MIN != BEST_K:
            handles.append(Line2D([], [], ls="none", marker="^", ms=10, mfc="none", mec=C_INK,
                                  label=f"Lowest CV RMSE: {K_MIN} features"))
        if BEST_K != ks[-1]:
            handles.append(Line2D([], [], ls="none", marker="s", ms=11, mfc="none", mec=C_MUTED,
                                  label=f"Model B: all {ks[-1]} features"))
        if ylab == "RMSE":
            ax.axhline(THRESHOLD, color=C_INK, lw=1.2, ls=":", zorder=2)
            handles.append(Line2D([], [], color=C_INK, ls=":", lw=1.2,
                                  label=f"1-SE threshold = {THRESHOLD:,.0f}"))
            ax.yaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda v, _: f"{v:,.0f}"))
        ax.set_xticks(ks)
        ax.set_xlim(ks[0] - 0.4, ks[-1] + 0.4)
        ax.set_xlabel("Number of Features")
        ax.set_ylabel(ylab)
        ax.set_title(f"{title}  ({hint})", fontsize=12)
        style_axes(ax)
        ax.legend(handles=handles, loc="upper center", bbox_to_anchor=(0.5, -0.13),
                  ncol=3, frameon=False, fontsize=8.5, columnspacing=1.2, handletextpad=0.5)

    # 中間：決策步驟
    k_min_h = history[mi]
    steps = (f"Decision steps (1-SE rule):   "
             f"A. Lowest CV RMSE = {k_min_h['cv_rmse']:,.0f} at {K_MIN} features   →   "
             f"B. Threshold = {k_min_h['cv_rmse']:,.0f} + 1 SE ({k_min_h['cv_rmse_se']:,.0f})"
             f" = {THRESHOLD:,.0f}   →   "
             f"C. Fewest features under threshold = {BEST_K}   ✔")
    fig.text(0.515, 0.295, steps, ha="center", va="center", fontsize=10.5, color=C_INK,
             bbox=dict(boxstyle="round,pad=0.6", facecolor="#f5f8fd", edgecolor="#c9daf2"))

    # 下方：結果表（選中的那一列反白）
    ax_t.axis("off")
    rows = [[h["n"], ", ".join(h["features"]), f"{h['cv_rmse']:,.0f}",
             "✔" if h["cv_rmse"] <= THRESHOLD else "✘", f"{h['cv_r2']:.4f}",
             f"{h['test_rmse']:,.0f}", f"{h['test_r2']:.4f}"] for h in history]
    tbl = ax_t.table(cellText=rows,
                     colLabels=["# Features", "Selected Features", "CV RMSE", "≤ Threshold",
                                "CV R²", "Test RMSE", "Test R²"],
                     colWidths=[0.08, 0.46, 0.09, 0.09, 0.09, 0.09, 0.09],
                     cellLoc="center", bbox=[0, 0, 1, 1])
    tbl.auto_set_font_size(False)
    tbl.set_fontsize(9.5)
    for (r, c), cell in tbl.get_celld().items():
        cell.set_edgecolor(C_GRID)
        if c == 1 and r > 0:
            cell.set_text_props(ha="left")
            cell.PAD = 0.02
        if r == 0:
            cell.set_text_props(fontweight="bold", color=C_INK)
            cell.set_facecolor("#f2f2f2")
        elif rows[r - 1][0] == BEST_K:
            cell.set_facecolor("#dfeafa")
            cell.set_text_props(fontweight="bold")

    fig.suptitle("Forward Selection — How the number of features is decided",
                 fontsize=14, color=C_INK, y=0.965)
    plt.savefig(path, dpi=130, bbox_inches="tight")
    plt.close()
    print(f"\n已儲存圖檔：{path}")


# 【圖表 02】前向選擇決策折線圖 → 02_forward_selection_decision.png
if MAKE_CHARTS:
    draw_decision_chart()


# ======================================================================
# 5-3 五種熱門特徵選擇方法（全部只用訓練集，測試集留到最後）
# ======================================================================
section("5-3. 五種特徵選擇方法 Feature Selection Methods")
kf5 = KFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
rkf55 = RepeatedKFold(n_splits=N_SPLITS, n_repeats=N_REPEATS, random_state=RANDOM_STATE)
P = len(FEATURES)
methods = {}      # 名稱 → {"family", "score", "score_label", "selected", "rule"}

# (1) 相關係數／統計檢定（Filter）：F 檢定，p < 0.05 保留
F_stat, p_val = f_regression(X_train, y_train)
corr = X_train.apply(lambda c: np.corrcoef(c, y_train)[0, 1])
methods["1. Correlation / F-test"] = {
    "family": "Filter", "score": pd.Series(-np.log10(np.clip(p_val, 1e-300, 1)), index=FEATURES),
    "score_label": "-log10(p-value)", "threshold": -np.log10(0.05),
    "selected": [f for f, p in zip(FEATURES, p_val) if p < 0.05],
    "rule": "keep if p < 0.05"}

# (2) Lasso（Embedded）：標準化 + LassoCV 自動挑 alpha，係數不為 0 保留
lasso = Pipeline([("sc", StandardScaler()),
                  ("reg", LassoCV(cv=kf5, random_state=RANDOM_STATE, max_iter=50000))])
lasso.fit(X_train, y_train)
lasso_coef = pd.Series(lasso["reg"].coef_, index=FEATURES)
methods["2. Lasso (L1)"] = {
    "family": "Embedded", "score": lasso_coef.abs(), "score_label": "|standardized coef|",
    "threshold": None, "selected": [f for f in FEATURES if abs(lasso_coef[f]) > 1e-8],
    "rule": f"keep if coef != 0 (alpha = {lasso['reg'].alpha_:,.1f})"}

# (3) 樹模型特徵重要度（Embedded）：隨機森林 + 交叉驗證的 permutation importance
#     打亂某個特徵後，驗證集 RMSE 上升越多 → 越重要；用驗證折計算，不會被過擬合誤導
perm_all, rf_builtin = [], []
for tr, va in kf5.split(X_train):
    rf = RandomForestRegressor(n_estimators=300, random_state=RANDOM_STATE)
    rf.fit(X_train.iloc[tr], y_train.iloc[tr])
    rf_builtin.append(rf.feature_importances_)
    pi = permutation_importance(rf, X_train.iloc[va], y_train.iloc[va], n_repeats=10,
                                scoring="neg_root_mean_squared_error",
                                random_state=RANDOM_STATE)
    perm_all.append(pi.importances)                       # shape: (特徵數, 10)
perm_all = np.concatenate(perm_all, axis=1)              # (特徵數, 50)
perm_mean = pd.Series(perm_all.mean(axis=1), index=FEATURES)
perm_se = pd.Series(perm_all.std(axis=1) / np.sqrt(perm_all.shape[1]), index=FEATURES)
methods["3. Random Forest importance"] = {
    "family": "Embedded", "score": perm_mean, "score_err": perm_se,
    "score_label": "permutation importance (RMSE increase)", "threshold": 0,
    "selected": [f for f in FEATURES if perm_mean[f] - perm_se[f] > 0],
    "rule": "keep if importance - 1 SE > 0"}

# (4) RFECV（Wrapper）：標準化放在 Pipeline 內，交叉驗證自動決定保留幾個
rfecv = RFECV(Pipeline([("sc", StandardScaler()), ("reg", LinearRegression())]),
              importance_getter="named_steps.reg.coef_", cv=rkf55,
              scoring="neg_root_mean_squared_error", min_features_to_select=1)
rfecv.fit(X_train, y_train)
methods["4. RFECV"] = {
    "family": "Wrapper", "score": pd.Series(P - rfecv.ranking_ + 1, index=FEATURES),
    "score_label": "keep priority (higher = eliminated later)", "threshold": None,
    "selected": [f for f, keep in zip(FEATURES, rfecv.support_) if keep],
    "rule": f"CV picks {rfecv.n_features_} features"}

# (5) 逐步選擇：前向選擇 + 1-SE rule（前面 4-2 已完成）
add_order = {h["added"]: h["n"] for h in history}
methods["5. Forward selection"] = {
    "family": "Wrapper", "score": pd.Series({f: P - add_order[f] + 1 for f in FEATURES}),
    "score_label": "keep priority (higher = added earlier)", "threshold": None,
    "selected": SELECTED, "rule": f"1-SE rule picks {BEST_K} features"}

for name, m in methods.items():
    print(f"{name:<30} [{m['family']:<8}] {m['rule']:<38} → {m['selected']}")
print("\n補充：隨機森林內建 (impurity) 重要度：",
      dict(zip(FEATURES, np.round(np.mean(rf_builtin, axis=0), 3))))

# 共識投票：被 ≥ 3 種方法選中的特徵
votes = pd.Series({f: sum(f in m["selected"] for m in methods.values()) for f in FEATURES})
votes = votes.sort_values(ascending=False)
CONSENSUS = [f for f in FEATURES if votes[f] >= 3] or [votes.index[0]]
print("\n共識投票（5 種方法中被選中的次數）：")
for f, v in votes.items():
    print(f"  {f:<18} {'■' * v}{'□' * (5 - v)}  {v}/5")
print(f"→ 共識特徵（≥ 3 票）：{CONSENSUS}")

# 補充數據分析：VIF（變異數膨脹因子）檢查共線性；> 5 有疑慮、> 10 嚴重
def compute_vif(Xf):
    out = {}
    for c in Xf.columns:
        others = Xf.drop(columns=c)
        r2_c = LinearRegression().fit(others, Xf[c]).score(others, Xf[c])
        out[c] = np.inf if r2_c >= 1 else 1 / (1 - r2_c)
    return pd.Series(out)


vif = compute_vif(X_train)
print("\nVIF（共線性檢查，> 5 有疑慮、> 10 嚴重）：")
print(vif.round(2).to_string())


# ----------------------------------------------------------------------
# 5-4 圖：五種方法的特徵分數 + 共識矩陣
# ----------------------------------------------------------------------
def draw_methods_chart(path="04_feature_selection_methods.png"):
    C_OFF = "#c9c9c9"
    fig, axes = plt.subplots(2, 3, figsize=(17, 10.5))
    order = list(votes.index)[::-1]                        # 依票數排序（橫條圖由下往上）
    for ax, (name, m) in zip(axes.flat[:5], methods.items()):
        sc = m["score"].reindex(order)
        cols = [C_BLUE if f in m["selected"] else C_OFF for f in order]
        err = m.get("score_err")
        ax.barh(order, sc.values, color=cols, height=0.6,
                xerr=None if err is None else err.reindex(order).values,
                error_kw=dict(ecolor=C_INK, lw=1, capsize=3))
        xmax = max(sc.max(), 0) if sc.max() > 0 else 1
        fmt_v = (lambda v: f"{v:.2f}") if "p-value" in m["score_label"] else \
                (lambda v: f"{v:,.0f}") if "priority" not in m["score_label"] else (lambda v: "")
        for i, f in enumerate(order):
            val = fmt_v(sc[f])
            mark = ("✔ kept" if f in m["selected"] else "✘ dropped") + (f"  ({val})" if val else "")
            ax.text(max(sc[f], 0) + xmax * 0.02, i, mark, va="center", fontsize=8.5,
                    color=C_INK if f in m["selected"] else C_MUTED)
        if m["threshold"] is not None:
            ax.axvline(m["threshold"], color=C_INK, ls=":", lw=1.2)
        ax.set_xlim(min(0, sc.min() * 1.1), xmax * 1.45)
        ax.set_title(f"{name}  [{m['family']}]\nRule: {m['rule']}", fontsize=10.5)
        ax.set_xlabel(m["score_label"], fontsize=9)
        style_axes(ax)
        ax.grid(axis="y", visible=False)

    # 第 6 格：共識矩陣
    ax = axes.flat[5]
    names = [n.split(". ")[1].replace(" importance", "").replace(" / F-test", "")
             for n in methods]
    rows = list(votes.index)
    for i, f in enumerate(rows):
        for j, m in enumerate(methods.values()):
            on = f in m["selected"]
            ax.add_patch(plt.Rectangle((j, i), 0.92, 0.85, color=C_BLUE if on else "#f0f0f0"))
            ax.text(j + 0.46, i + 0.43, "✔" if on else "", ha="center", va="center",
                    color="white", fontsize=12, fontweight="bold")
        v = votes[f]
        ax.text(len(methods) + 0.2, i + 0.43, f"{v}/5", va="center", fontsize=10,
                fontweight="bold" if f in CONSENSUS else "normal",
                color=C_INK if f in CONSENSUS else C_MUTED)
    ax.set_xlim(-0.05, len(methods) + 1)
    ax.set_ylim(len(rows), -0.15)
    ax.set_xticks([j + 0.46 for j in range(len(methods))] + [len(methods) + 0.45])
    ax.set_xticklabels(names + ["Votes"], rotation=30, ha="right", fontsize=9)
    ax.set_yticks([i + 0.43 for i in range(len(rows))])
    ax.set_yticklabels([f"{f}  ★" if f in CONSENSUS else f for f in rows], fontsize=9.5)
    ax.tick_params(length=0)
    for sp in ax.spines.values():
        sp.set_visible(False)
    ax.set_title(f"Consensus: features chosen by ≥ 3 of 5 methods (★)\n→ {', '.join(CONSENSUS)}",
                 fontsize=10.5)

    fig.suptitle("Five feature selection methods — which features does each one keep?   "
                 "(blue = kept, gray = dropped; training set only)",
                 fontsize=13.5, color=C_INK, y=0.995)
    plt.tight_layout(rect=[0, 0, 1, 0.965])
    plt.savefig(path, dpi=130)
    plt.close()
    print(f"\n已儲存圖檔：{path}")


# 【圖表 04】五種方法特徵分數 + 共識矩陣 → 04_feature_selection_methods.png
if MAKE_CHARTS:
    draw_methods_chart()


# ----------------------------------------------------------------------
# 5-5 各方法選出的特徵組合，成效比較 + 最終決策（同樣用 1-SE rule）
# ----------------------------------------------------------------------
section("5-5. 各方法特徵組合成效比較 & 最終決策")
short = {"1. Correlation / F-test": "F-test", "2. Lasso (L1)": "Lasso",
         "3. Random Forest importance": "RF importance", "4. RFECV": "RFECV",
         "5. Forward selection": "Forward"}
raw = [("Model B (all)", FEATURES)] + [(short[n], m["selected"]) for n, m in methods.items()]
raw.append(("Consensus", CONSENSUS))
# 選出相同特徵組合的方法合併成一列（例如 "F-test + RFECV + Forward"）
candidates = {}
for name, cols in raw:
    key = tuple(sorted(cols))
    if key in candidates:
        candidates[key]["names"].append(name)
    else:
        candidates[key] = {"names": [name], "cols": cols}
candidates = {" + ".join(v["names"]): v["cols"] for v in candidates.values()}

perf = []
for name, cols in candidates.items():
    if not cols:
        continue
    cv_rmse, cv_sd, cv_r2, _ = cv_performance(X_train, y_train, cols)
    m_ = LinearRegression().fit(X_train[cols], y_train)
    pred = m_.predict(X_test[cols])
    te_rmse, te_r2 = evaluate_performance(y_test, pred)
    perf.append({"name": name, "cols": cols, "n": len(cols), "cv_rmse": cv_rmse,
                 "cv_se": cv_sd / np.sqrt(N_CV_RUNS), "cv_r2": cv_r2,
                 "test_rmse": te_rmse, "test_mae": mean_absolute_error(y_test, pred),
                 "test_r2": te_r2, "test_adj_r2": adjusted_r2(te_r2, len(X_test), len(cols))})

perf.sort(key=lambda r: (r["n"], r["cv_rmse"]))              # 依特徵數排序：簡單 → 複雜
best_cv = min(perf, key=lambda r: r["cv_rmse"])
THRESH2 = best_cv["cv_rmse"] + best_cv["cv_se"]
final = min((r for r in perf if r["cv_rmse"] <= THRESH2), key=lambda r: (r["n"], r["cv_rmse"]))
FINAL_COLS, FINAL_NAME = final["cols"], final["name"]

perf_table = pd.DataFrame({
    "Candidate": [r["name"] for r in perf],
    "# Features": [r["n"] for r in perf],
    "Features": [", ".join(r["cols"]) for r in perf],
    "CV RMSE (train)": [f"{r['cv_rmse']:,.0f} ± {r['cv_se']:,.0f}" for r in perf],
    "≤ 1-SE threshold": ["✔" if r["cv_rmse"] <= THRESH2 else "✘" for r in perf],
    "Test RMSE": [f"{r['test_rmse']:,.0f}" for r in perf],
    "Test R²": [f"{r['test_r2']:.4f}" for r in perf],
    "Test Adj R²": [f"{r['test_adj_r2']:.4f}" for r in perf],
    "Decision": ["✅ Final" if r is final else "" for r in perf]})
perf_md = to_markdown(perf_table)
print(perf_md)
print(f"\n決策（1-SE rule）：CV RMSE 最低 = {best_cv['cv_rmse']:,.0f}（{best_cv['name']}），"
      f"門檻 = {THRESH2:,.0f}")
print(f"→ 門檻內特徵最少的是「{FINAL_NAME}」：{FINAL_COLS}")
print("是否達成商業目標 R² ≥ 0.90：", "✅ 達成" if final["test_r2"] >= 0.90 else "❌ 未達成")


def draw_comparison_chart(path="05_method_comparison.png"):
    from matplotlib.lines import Line2D
    labels = [r["name"].replace(" + ", "\n+ ") + f"\n({r['n']} features)" for r in perf]
    xs = np.arange(len(perf))
    fi = perf.index(final)
    fig = plt.figure(figsize=(17, 11))
    ax1 = fig.add_axes([0.06, 0.48, 0.42, 0.42])
    ax2 = fig.add_axes([0.56, 0.48, 0.42, 0.42])
    ax_t = fig.add_axes([0.06, 0.08, 0.92, 0.19])
    for ax, key, err_key, te_key, ylab, hint in [
            (ax1, "cv_rmse", "cv_se", "test_rmse", "RMSE", "lower is better"),
            (ax2, "cv_r2", None, "test_r2", "R-squared", "higher is better")]:
        cv = np.array([r[key] for r in perf])
        te = np.array([r[te_key] for r in perf])
        ax.axvspan(fi - 0.35, fi + 0.35, color=C_BLUE, alpha=0.08, zorder=0)
        if err_key:
            ax.errorbar(xs, cv, yerr=[r[err_key] for r in perf], fmt="-o", color=C_BLUE, lw=2,
                        ms=8, mec="white", mew=1.5, ecolor=C_BLUE, elinewidth=2, capsize=4,
                        zorder=3)
            ax.axhline(THRESH2, color=C_INK, ls=":", lw=1.2, zorder=2)
        else:
            ax.plot(xs, cv, "-o", color=C_BLUE, lw=2, ms=8, mec="white", mew=1.5, zorder=3)
        ax.plot(xs, te, "--s", color=C_ORANGE, lw=2, ms=8, mec="white", mew=1.5, zorder=3)
        ax.scatter([fi], [cv[fi]], s=300, facecolor="none", edgecolor=C_INK, lw=2.2, zorder=5)
        ax.set_xticks(xs)
        ax.set_xticklabels(labels, fontsize=8.5)
        ax.set_xlim(-0.5, len(perf) - 0.5)
        ax.set_ylabel(ylab)
        ax.set_title(f"{ylab} of each method's feature subset  ({hint})", fontsize=11.5)
        style_axes(ax)
        handles = [Line2D([], [], marker="o", color=C_BLUE, mec="white", lw=2,
                          label="CV on train (used to decide)" + (" ±1 SE" if err_key else "")),
                   Line2D([], [], ls="--", marker="s", color=C_ORANGE, mec="white", lw=2,
                          label="Test set (final check only)"),
                   Line2D([], [], ls="none", marker="o", ms=13, mfc="none", mec=C_INK, mew=2,
                          label=f"Final: {FINAL_NAME}")]
        if err_key:
            handles.append(Line2D([], [], color=C_INK, ls=":",
                                  label=f"1-SE threshold = {THRESH2:,.0f}"))
            ax.yaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda v, _: f"{v:,.0f}"))
        ax.legend(handles=handles, loc="upper center", bbox_to_anchor=(0.5, -0.2), ncol=2,
                  frameon=False, fontsize=8.5)

    ax_t.axis("off")
    rows = [[r["name"], r["n"], ", ".join(r["cols"]), f"{r['cv_rmse']:,.0f}",
             "✔" if r["cv_rmse"] <= THRESH2 else "✘", f"{r['test_rmse']:,.0f}",
             f"{r['test_r2']:.4f}"] for r in perf]
    tbl = ax_t.table(cellText=rows, colLabels=["Candidate", "#", "Features", "CV RMSE",
                                               "≤ Threshold", "Test RMSE", "Test R²"],
                     colWidths=[0.16, 0.04, 0.44, 0.09, 0.09, 0.09, 0.09],
                     cellLoc="center", bbox=[0, 0, 1, 1])
    tbl.auto_set_font_size(False)
    tbl.set_fontsize(9)
    for (r, c), cell in tbl.get_celld().items():
        cell.set_edgecolor(C_GRID)
        if c in (0, 2) and r > 0:
            cell.set_text_props(ha="left")
            cell.PAD = 0.02
        if r == 0:
            cell.set_text_props(fontweight="bold")
            cell.set_facecolor("#f2f2f2")
        elif r - 1 == fi:
            cell.set_facecolor("#dfeafa")
            cell.set_text_props(fontweight="bold")
    fig.suptitle("Which feature subset to use? — compare every method's choice (simple → complex), "
                 "then apply the 1-SE rule\n(fewest features whose CV RMSE is within 1 SE of the best)",
                 fontsize=13, color=C_INK, y=0.985)
    plt.savefig(path, dpi=130, bbox_inches="tight")
    plt.close()
    print(f"已儲存圖檔：{path}")


# 【圖表 05】各方法特徵組合成效比較 → 05_method_comparison.png
if MAKE_CHARTS:
    draw_comparison_chart()


# ----------------------------------------------------------------------
# 5-6 各特徵的完整測試數據（訓練集）
# ----------------------------------------------------------------------
score_tbl = pd.DataFrame({"Feature": FEATURES,
                          "Corr with Profit": [f"{corr[f]:.3f}" for f in FEATURES],
                          "F-test p-value": [f"{p:.2e}" for p in p_val],
                          "Lasso coef (std.)": [f"{lasso_coef[f]:,.0f}" for f in FEATURES],
                          "RF perm. importance": [f"{perm_mean[f]:,.0f} ± {perm_se[f]:,.0f}"
                                                  for f in FEATURES],
                          "RFECV rank": [int(r) for r in rfecv.ranking_],
                          "Forward order": [add_order[f] for f in FEATURES],
                          "VIF": [f"{vif[f]:.2f}" for f in FEATURES],
                          "Votes": [f"{votes[f]}/5" for f in FEATURES]})
print("\n[5-6] 各特徵完整數據：\n")
print(to_markdown(score_tbl))


# 5-7 離群值分析：Scatter plot + Regression line + Top 10 outliers（最終模型）
section("5-7. 離群值分析 Outlier Analysis（最終模型）")
final_model = LinearRegression().fit(X[FINAL_COLS], y)       # 用全部 50 筆訓練
y_hat_all = final_model.predict(X[FINAL_COLS])
resid = y - y_hat_all

Xd = np.column_stack([np.ones(len(X)), X[FINAL_COLS].to_numpy(float)])
H = Xd @ np.linalg.pinv(Xd.T @ Xd) @ Xd.T                     # Hat matrix
leverage = np.diag(H)
k = Xd.shape[1]
s = np.sqrt((resid ** 2).sum() / (len(X) - k))
stud_resid = resid / (s * np.sqrt(1 - leverage))              # 學生化殘差
cooks_d = stud_resid ** 2 * leverage / (k * (1 - leverage))   # Cook's distance

outlier_df = pd.DataFrame({
    "Index": df.index, "State": df["State"], "R&D Spend": df["R&D Spend"].round(0),
    "Actual": y.round(0), "Predicted": y_hat_all.round(0), "Residual": resid.round(0),
    "Stud_Resid": stud_resid.round(3), "Leverage": leverage.round(3),
    "Cooks_D": cooks_d.round(4)})
top10 = outlier_df.reindex(outlier_df["Stud_Resid"].abs()
                           .sort_values(ascending=False).index).head(10)
top10.insert(0, "Rank", range(1, 11))
print("Top 10 離群值（依 |學生化殘差| 排序）：")
print(top10.to_string(index=False))
print(f"\n判讀：|Stud_Resid| > 2 值得注意、> 3 可能是離群值；Cook's D > 4/n = {4 / len(X):.3f} 影響大")

# 【圖表 03】散佈圖 + 迴歸線 + Top 10 離群值 → 03_scatter_regression_outliers.png
if MAKE_CHARTS:
    is_out = df.index.isin(top10["Index"])
    fig, axes = plt.subplots(1, 2, figsize=(16, 6.5))

    ax = axes[0]
    ax.scatter(y_hat_all[~is_out], y[~is_out], s=45, color=C_BLUE, edgecolor="white",
               linewidth=1, label="Normal points", zorder=3)
    ax.scatter(y_hat_all[is_out], y[is_out], s=80, color=C_ORANGE, marker="D", edgecolor="white",
               linewidth=1, label="Top 10 outliers", zorder=4)
    # 實際值對預測值做迴歸，斜率必為 1、截距必為 0，所以迴歸線就是 y = x
    xs = np.linspace(min(y_hat_all.min(), y.min()), max(y_hat_all.max(), y.max()), 100)
    ax.plot(xs, xs, color=C_INK, lw=2, label="Regression line (Actual = Predicted)")
    ax.set_xlabel("Predicted Profit"); ax.set_ylabel("Actual Profit")
    ax.set_title(f"Actual vs Predicted — Final model, {len(FINAL_COLS)} features "
                 f"(R² = {r2_score(y, y_hat_all):.3f})")

    ax = axes[1]
    ax.scatter(df.loc[~is_out, "R&D Spend"], y[~is_out], s=45, color=C_BLUE, edgecolor="white",
               linewidth=1, label="Normal points", zorder=3)
    ax.scatter(df.loc[is_out, "R&D Spend"], y[is_out], s=80, color=C_ORANGE, marker="D",
               edgecolor="white", linewidth=1, label="Top 10 outliers", zorder=4)
    b1, b0 = np.polyfit(df["R&D Spend"], y, 1)
    xs2 = np.linspace(df["R&D Spend"].min(), df["R&D Spend"].max(), 100)
    ax.plot(xs2, b1 * xs2 + b0, color=C_INK, lw=2,
            label=f"Regression line: Profit = {b1:.3f}×R&D + {b0:,.0f}")
    ax.set_xlabel("R&D Spend"); ax.set_ylabel("Profit")
    ax.set_title("R&D Spend vs Profit")

    kfmt = matplotlib.ticker.FuncFormatter(lambda v, _: f"{v / 1000:,.0f}K")
    for ax in axes:
        ax.xaxis.set_major_formatter(kfmt)
        ax.yaxis.set_major_formatter(kfmt)


    def label_points(ax, xs_, ys_, tags, all_x, all_y):
        """標註點：依序嘗試候選位置，避開其他標籤與資料點；位置被移開時加細引線"""
        fig.canvas.draw()
        scale = fig.dpi / 72
        pts = ax.transData.transform(np.column_stack([all_x, all_y]))
        W, Hh = 62 * scale, 10 * scale
        cands = [(8, 6), (8, -16), (-64, 6), (-64, -16), (8, 20), (-64, 20), (8, -30), (-64, -30)]
        boxes = []

        def hits(x1, y1):
            x2, y2 = x1 + W, y1 + Hh
            if any(not (x2 < a or x1 > c or y2 < b or y1 > d) for a, b, c, d in boxes):
                return True
            r = 5 * scale
            return bool(((pts[:, 0] > x1 - r) & (pts[:, 0] < x2 + r) &
                         (pts[:, 1] > y1 - r) & (pts[:, 1] < y2 + r)).any())

        for x0, y0, t in zip(xs_, ys_, tags):
            px, py = ax.transData.transform((x0, y0))
            dx, dy = next(((cx, cy) for cx, cy in cands
                           if not hits(px + cx * scale, py + cy * scale)), cands[0])
            boxes.append((px + dx * scale, py + dy * scale,
                          px + dx * scale + W, py + dy * scale + Hh))
            ax.annotate(t, (x0, y0), xytext=(dx, dy), textcoords="offset points",
                        fontsize=8, color=C_INK,
                        arrowprops=dict(arrowstyle="-", color=C_MUTED, lw=0.7, shrinkA=0,
                                        shrinkB=5) if (dx, dy) != cands[0] else None)


    tags = [f"#{r} (idx {i})" for r, i in zip(top10["Rank"], top10["Index"])]
    idx = top10["Index"].to_numpy()
    label_points(axes[0], y_hat_all[idx], y.to_numpy()[idx], tags, y_hat_all, y.to_numpy())
    label_points(axes[1], df.loc[idx, "R&D Spend"].to_numpy(), y.to_numpy()[idx], tags,
                 df["R&D Spend"].to_numpy(), y.to_numpy())
    for ax in axes:
        style_axes(ax)
        ax.legend(loc="upper left", frameon=False, fontsize=9)
    plt.tight_layout()
    plt.savefig("03_scatter_regression_outliers.png", dpi=130)
    plt.close()
    print("已儲存圖檔：03_scatter_regression_outliers.png")


# ======================================================================
# 6. Deployment（部署）
# ======================================================================
section("6. Deployment 部署")
joblib.dump({"model": final_model, "features": FINAL_COLS}, "startup_final_model.pkl")
print(f"模型已存成：startup_final_model.pkl（特徵：{FINAL_COLS}）")


def predict_profit(rd, admin, marketing, state, path="startup_final_model.pkl"):
    """輸入原始數值與州名，自動做 Two dummies 編碼，只取模型需要的特徵來預測"""
    bundle = joblib.load(path)
    row = add_two_dummies(pd.DataFrame([{"R&D Spend": rd, "Administration": admin,
                                         "Marketing Spend": marketing, "State": state}]))
    return bundle["model"].predict(row[bundle["features"]])[0]


print("\n範例預測（R&D=160,000、Admin=130,000、Marketing=300,000）：")
for st in ["California", "Florida", "New York"]:
    print(f"  {st:<11} 預測利潤：${predict_profit(160000, 130000, 300000, st):,.0f}")

print("""
部署建議（AIOT 情境）：
  - 將 startup_final_model.pkl 包成 Flask / FastAPI / Streamlit 服務，輸入支出即回傳預測利潤
  - 定期蒐集新資料、重新跑前向選擇與評估，若表現下降（資料漂移）則重新訓練
  - 本資料只有 50 筆，實際投資決策仍需更多資料佐證
""")