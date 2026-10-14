/**
 * pyworker.js — 在背景執行緒 (Web Worker) 跑 Python (Pyodide) 分析引擎
 *
 * 為什麼用 Worker：Python 分析要幾秒鐘，放在背景跑網頁才不會卡住（轉圈動畫、捲動都正常）。
 * 網頁送來：{ id, cmd: 'warmup' | 'inspect' | 'analyze', bytes, filename, target }
 * 回傳：     { id, type: 'progress' | 'result' | 'error', ... }
 */
const PYODIDE_VERSION = '0.28.2';
const PYODIDE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const ENGINE_VERSION = '1';

let pyReady = null;

function progress(id, msg) {
  self.postMessage({ id, type: 'progress', msg });
}

async function initPython(id) {
  progress(id, '第一次使用：下載 Python 執行環境 (Pyodide，約 10–20 MB，之後會快取)…');
  try {
    importScripts(PYODIDE_URL + 'pyodide.js');
  } catch (err) {
    throw { kind: 'load', message: '無法下載 Python 執行環境（cdn.jsdelivr.net 連不上）',
            hint: '請確認網路連線；學校或公司網路若封鎖 jsdelivr，請改用手機熱點或其他網路' };
  }
  const py = await loadPyodide({ indexURL: PYODIDE_URL });
  progress(id, '安裝 numpy、pandas、scipy、scikit-learn…');
  await py.loadPackage(['numpy', 'pandas', 'scipy', 'scikit-learn']);
  progress(id, '載入分析引擎 csv_engine.py…');
  const res = await fetch(`csv_engine.py?v=${ENGINE_VERSION}`);
  if (!res.ok) {
    throw { kind: 'load', message: `找不到分析引擎 csv_engine.py（HTTP ${res.status}）`,
            hint: '請確認 csv_engine.py 和 index.html 放在同一個資料夾並已上傳到 GitHub' };
  }
  py.FS.writeFile('/home/pyodide/csv_engine.py', await res.text());
  py.runPython('import sys; sys.path.insert(0, "/home/pyodide"); import csv_engine');
  return py;
}

function toErrorPayload(err) {
  if (err && err.kind) return err;                      // 我們自己丟出的載入錯誤
  const text = String((err && err.message) || err);
  const lines = text.trim().split('\n');
  const last = lines[lines.length - 1] || text;
  // Python 端的 CsvError（traceback 最後一行）：訊息格式「原因｜建議」
  const m = last.match(/CsvError: (.*)$/);
  if (m) {
    const [message, hint] = m[1].trim().split('｜');
    return { kind: 'csv', message, hint: hint || '' };
  }
  // 其他未預期的 Python 錯誤：取最後一行，方便回報
  if (/MemoryError|RangeError|out of memory/i.test(text)) {
    return { kind: 'python', message: '瀏覽器記憶體不足，資料太大',
             hint: '請減少筆數或欄位後再試，或改用電腦版 Chrome / Edge' };
  }
  return { kind: 'python', message: `分析時發生未預期的錯誤：${last}`,
           hint: '請檢查資料內容是否有異常值；若持續發生，請把錯誤訊息回報給開發者' };
}

self.onmessage = async (e) => {
  const { id, cmd, bytes, filename, target } = e.data;
  try {
    if (!pyReady) pyReady = initPython(id);
    let py;
    try {
      py = await pyReady;
    } catch (err) {
      pyReady = null;                                   // 下次可以重試
      throw err;
    }
    if (cmd === 'warmup') {
      self.postMessage({ id, type: 'result', result: null });
      return;
    }
    const engine = py.pyimport('csv_engine');
    let out;
    if (cmd === 'inspect') {
      progress(id, 'Python 正在讀取 CSV：判斷編碼、分隔符號與欄位型態…');
      out = engine.inspect_csv(bytes, filename);
    } else if (cmd === 'analyze') {
      progress(id, `Python 分析中：目標「${target}」· 五種特徵選擇 × 每個 K 的模型、交叉驗證與統計檢定…`);
      out = engine.analyze(bytes, target, filename);
    } else {
      throw { kind: 'python', message: `未知的指令：${cmd}`, hint: '' };
    }
    self.postMessage({ id, type: 'result', result: out });
  } catch (err) {
    self.postMessage({ id, type: 'error', error: toErrorPayload(err) });
  }
};
