/**
 * AIoT Multiple Linear Regression & Feature Selection Explorer
 * Multi-Dataset Controller: 50 Startups, Boston Housing & Custom CSV URL Engine
 */

(function () {
  'use strict';

  // State Management
  let currentDataset = 'startups';
  let currentAlgo = 'Forward SFS';
  let currentK = 1;
  let currentStartupState = 'California';

  // Chart Instances
  let rmseChart = null;
  let r2Chart = null;
  let scatterChart = null;
  let coefChart = null;

  // Algorithm Color Palette (Cyber Neon)
  const ALGO_COLORS = {
    'Forward SFS': '#00f0ff',
    'Lasso': '#6366f1',
    'RFE': '#00ffaa',
    'ElasticNet': '#ff0055',
    'Exhaustive': '#a855f7'
  };

  // Cached DOM Elements
  const el = {
    brandTitle: document.getElementById('brandTitle'),
    brandBadge: document.getElementById('brandBadge'),
    heroTitle: document.getElementById('heroTitle'),
    heroDesc: document.getElementById('heroDesc'),
    heroTags: document.getElementById('heroTags'),
    
    // Dataset Cards
    cardDsStartups: document.getElementById('cardDsStartups'),
    cardDsBoston: document.getElementById('cardDsBoston'),
    cardDsCustom: document.getElementById('cardDsCustom'),
    customCsvPanel: document.getElementById('customCsvPanel'),
    customCsvUrlInput: document.getElementById('customCsvUrlInput'),
    btnLoadCustomCsv: document.getElementById('btnLoadCustomCsv'),
    customCsvFileInput: document.getElementById('customCsvFileInput'),
    btnUploadCsvFile: document.getElementById('btnUploadCsvFile'),
    customCsvStatus: document.getElementById('customCsvStatus'),
    miniPresetBtns: document.querySelectorAll('.mini-preset-btn'),
    pyEngineBadge: document.getElementById('pyEngineBadge'),
    customCsvSetup: document.getElementById('customCsvSetup'),
    customCsvSummary: document.getElementById('customCsvSummary'),
    customTargetSelect: document.getElementById('customTargetSelect'),
    btnRunCustomAnalysis: document.getElementById('btnRunCustomAnalysis'),
    customColumnChips: document.getElementById('customColumnChips'),
    customSetupWarnings: document.getElementById('customSetupWarnings'),

    algoTabs: document.getElementById('algoTabs'),
    kSelectorGroup: document.getElementById('kSelectorGroup'),
    eqContainer: document.getElementById('liveEquation'),
    coefTableBody: document.getElementById('coefTableBody'),
    outlierTableBody: document.getElementById('outlierTableBody'),
    
    // Metrics
    metricRmse: document.getElementById('metricRmse'),
    metricMae: document.getElementById('metricMae'),
    metricR2: document.getElementById('metricR2'),
    metricR2Desc: document.getElementById('metricR2Desc'),
    metricAdjR2: document.getElementById('metricAdjR2'),
    metricFstat: document.getElementById('metricFstat'),
    metricParsimony: document.getElementById('metricParsimony'),
    metricParsimonyDesc: document.getElementById('metricParsimonyDesc'),
    cardParsimony: document.getElementById('cardParsimony'),

    // Titles & Labels
    rmseKValTag: document.getElementById('rmseKValTag'),
    r2KValTag: document.getElementById('r2KValTag'),
    coefCardTag: document.getElementById('coefCardTag'),
    scatterChartTitle: document.getElementById('scatterChartTitle'),
    simulatorTitle: document.getElementById('simulatorTitle'),
    targetValLabel: document.getElementById('targetValLabel'),
    liveProfitVal: document.getElementById('liveProfitVal'),
    profitComparison: document.getElementById('profitComparison'),
    waterfallHeader: document.getElementById('waterfallHeader'),
    waterfallList: document.getElementById('waterfallList'),
    simulatorControls: document.getElementById('simulatorControls'),

    // Dataset Modal
    btnOpenDataset: document.getElementById('btnOpenDataset'),
    btnOpenDatasetText: document.getElementById('btnOpenDatasetText'),
    btnCloseDataset: document.getElementById('btnCloseDataset'),
    datasetModal: document.getElementById('datasetModal'),
    datasetModalTitle: document.getElementById('datasetModalTitle'),
    datasetModalCount: document.getElementById('datasetModalCount'),
    datasetModalHead: document.getElementById('datasetModalHead'),
    datasetTableBody: document.getElementById('datasetTableBody'),
    datasetSearch: document.getElementById('datasetSearch')
  };

  // Formatting helpers
  const fmtCurrency = (v) => '$' + Math.round(v).toLocaleString('en-US');
  const fmtNumber = (v, d = 2) => Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

  /**
   * Chart.js Custom Plugin: Dynamic K Guideline & All Algorithms Value Callouts
   */
  const kGuidelinePlugin = {
    id: 'kGuidelinePlugin',
    afterDraw: (chart) => {
      if (chart !== rmseChart && chart !== r2Chart) return;
      const { ctx, chartArea, scales } = chart;
      if (!chartArea || !scales || !scales.x || !scales.y) return;

      const kIdx = currentK - 1;
      const totalK = chart.data.labels ? chart.data.labels.length : 0;
      if (kIdx < 0 || kIdx >= totalK) return;

      const xPos = scales.x.getPixelForTick(kIdx);
      if (isNaN(xPos)) return;

      ctx.save();

      // 1. Draw Vertical Dashed Guideline at selected K
      ctx.beginPath();
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.85)'; // Cyan neon
      ctx.moveTo(xPos, chartArea.top);
      ctx.lineTo(xPos, chartArea.bottom);
      ctx.stroke();

      // 2. Draw Top K Badge on the guideline
      ctx.setLineDash([]);
      const badgeText = `K = ${currentK}`;
      ctx.font = "bold 11px 'Fira Code', monospace";
      const bw = ctx.measureText(badgeText).width + 14;
      const bh = 18;
      const bx = xPos - bw / 2;
      const by = chartArea.top + 4;

      ctx.fillStyle = 'rgba(0, 240, 255, 0.95)';
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 4);
        ctx.fill();
      } else {
        ctx.fillRect(bx, by, bw, bh);
      }
      ctx.fillStyle = '#0a0e1a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, xPos, by + bh / 2);

      // 3. Extract and display values for ALL algorithms at this K
      const isRmse = (chart === rmseChart);
      const points = [];

      chart.data.datasets.forEach((ds) => {
        const val = ds.data[kIdx];
        if (val === undefined || val === null || isNaN(val)) return;
        const yPos = scales.y.getPixelForValue(val);
        const isCurrent = (ds.label === currentAlgo);

        let fmtVal = '';
        if (isRmse) {
          fmtVal = currentDataset === 'startups' ? fmtCurrency(val) : val.toFixed(2);
        } else {
          fmtVal = (val * 100).toFixed(2) + '%';
        }

        points.push({
          algo: ds.label,
          val: val,
          fmtVal: fmtVal,
          color: ds.borderColor || '#00f0ff',
          yPos: yPos,
          isCurrent: isCurrent
        });
      });

      // 4. Draw Accent Rings on the curves
      points.forEach(pt => {
        ctx.beginPath();
        ctx.arc(xPos, pt.yPos, pt.isCurrent ? 6.5 : 4.5, 0, Math.PI * 2);
        ctx.fillStyle = pt.color;
        ctx.fill();
        ctx.lineWidth = pt.isCurrent ? 2 : 1;
        ctx.strokeStyle = '#0f172a';
        ctx.stroke();
      });

      // 5. Draw On-Canvas Callout Pills beside the vertical dashed line
      // Group points by identical formatted value to prevent stacking overlapping text
      const grouped = [];
      points.forEach(pt => {
        let grp = grouped.find(g => g.fmtVal === pt.fmtVal);
        if (!grp) {
          grp = { fmtVal: pt.fmtVal, yPos: pt.yPos, algos: [], hasCurrent: false, color: pt.color };
          grouped.push(grp);
        }
        grp.algos.push(pt.algo);
        if (pt.isCurrent) {
          grp.hasCurrent = true;
          grp.color = pt.color;
        }
      });

      // Sort groups by yPos and prevent vertical collision
      grouped.sort((a, b) => a.yPos - b.yPos);
      for (let i = 1; i < grouped.length; i++) {
        if (grouped[i].yPos - grouped[i - 1].yPos < 22) {
          grouped[i].yPos = grouped[i - 1].yPos + 22;
        }
      }

      const isRightSide = xPos > (chartArea.left + chartArea.right) / 2;

      grouped.forEach(grp => {
        let title = '';
        if (grp.algos.length === chart.data.datasets.length) {
          title = '全部方法';
        } else if (grp.algos.length === 1) {
          title = grp.algos[0];
        } else {
          title = grp.hasCurrent ? `${currentAlgo} 等 ${grp.algos.length} 種` : grp.algos.join('/');
        }

        const pillText = `${title}: ${grp.fmtVal}`;
        ctx.font = grp.hasCurrent ? "bold 11px 'Fira Code', monospace" : "11px 'Fira Code', monospace";
        const textW = ctx.measureText(pillText).width;
        const pillW = textW + 18;
        const pillH = 20;

        let pillX = isRightSide ? (xPos - pillW - 12) : (xPos + 12);
        let pillY = Math.max(chartArea.top + 26, Math.min(chartArea.bottom - pillH - 4, grp.yPos - pillH / 2));

        // Connective pointer line from vertical dashed line to callout pill
        ctx.beginPath();
        ctx.setLineDash([2, 2]);
        ctx.strokeStyle = grp.hasCurrent ? grp.color : 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1;
        ctx.moveTo(xPos, grp.yPos);
        ctx.lineTo(isRightSide ? (pillX + pillW) : pillX, pillY + pillH / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Pill Box
        ctx.fillStyle = grp.hasCurrent ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = grp.color;
        ctx.lineWidth = grp.hasCurrent ? 1.5 : 1;
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(pillX, pillY, pillW, pillH, 4);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(pillX, pillY, pillW, pillH);
          ctx.strokeRect(pillX, pillY, pillW, pillH);
        }

        // Draw color dot
        ctx.beginPath();
        ctx.arc(pillX + 8, pillY + pillH / 2, 3, 0, Math.PI * 2);
        ctx.fillStyle = grp.color;
        ctx.fill();

        // Text
        ctx.fillStyle = grp.hasCurrent ? '#ffffff' : '#cbd5e1';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(pillText, pillX + 16, pillY + pillH / 2);
      });

      ctx.restore();
    }
  };

  /**
   * App Initialization
   */
  document.addEventListener('DOMContentLoaded', () => {
    if (!window.DATASETS_CONFIG) {
      console.error('DATASETS_CONFIG not found in model_data.js');
      return;
    }

    initCharts();
    setupDatasetCards();
    setupCustomCsvLoader();
    setupAlgorithmsAndK();
    setupModal();
    applyDataset(currentDataset);
  });

  /**
   * Initialize Global Chart.js Defaults
   */
  function initCharts() {
    Chart.register(kGuidelinePlugin);
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.06)';

    const commonOpts = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { boxWidth: 12, font: { size: 11, weight: '600' }, color: '#cbd5e1' }
        },
        tooltip: {
          backgroundColor: 'rgba(13, 19, 34, 0.95)',
          titleColor: '#00f0ff',
          bodyColor: '#f1f5f9',
          borderColor: 'rgba(0, 240, 255, 0.3)',
          borderWidth: 1,
          padding: 12,
          usePointStyle: true,
          titleFont: { family: "'Outfit', sans-serif", size: 13, weight: '700' }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(255, 255, 255, 0.04)' }, ticks: { color: '#64748b', font: { size: 11 } } },
        y: { grid: { color: 'rgba(255, 255, 255, 0.04)' }, ticks: { color: '#64748b', font: { size: 11 } } }
      }
    };

    // 1. RMSE Chart
    rmseChart = new Chart(document.getElementById('chartRmse').getContext('2d'), {
      type: 'line',
      data: { labels: [], datasets: [] },
      options: {
        ...commonOpts,
        scales: {
          ...commonOpts.scales,
          y: {
            ...commonOpts.scales.y,
            ticks: {
              ...commonOpts.scales.y.ticks,
              callback: (v) => currentDataset === 'startups' ? '$' + (v / 1000).toFixed(0) + 'k' : v.toFixed(1)
            }
          }
        }
      }
    });

    // 2. R² Chart
    r2Chart = new Chart(document.getElementById('chartR2').getContext('2d'), {
      type: 'line',
      data: { labels: [], datasets: [] },
      options: {
        ...commonOpts,
        scales: {
          ...commonOpts.scales,
          y: {
            ...commonOpts.scales.y,
            ticks: {
              ...commonOpts.scales.y.ticks,
              callback: (v) => (v * 100).toFixed(0) + '%'
            }
          }
        }
      }
    });

    // 3. Scatter Chart (Actual vs Predicted)
    scatterChart = new Chart(document.getElementById('chartScatter').getContext('2d'), {
      type: 'scatter',
      data: { datasets: [] },
      options: {
        ...commonOpts,
        scales: {
          x: {
            ...commonOpts.scales.x,
            title: { display: true, text: 'Predicted Value', color: '#94a3b8', font: { size: 12, weight: '600' } }
          },
          y: {
            ...commonOpts.scales.y,
            title: { display: true, text: 'Actual Value', color: '#94a3b8', font: { size: 12, weight: '600' } }
          }
        }
      }
    });

    // 4. Feature Impact Bar Chart
    coefChart = new Chart(document.getElementById('chartImportance').getContext('2d'), {
      type: 'bar',
      data: { labels: [], datasets: [] },
      options: {
        ...commonOpts,
        indexAxis: 'y',
        plugins: { ...commonOpts.plugins, legend: { display: false } }
      }
    });
  }

  /**
   * Setup Dataset Cards Interaction
   */
  function setupDatasetCards() {
    el.cardDsStartups.addEventListener('click', () => {
      setActiveDatasetCard('startups');
      el.customCsvPanel.style.display = 'none';
      applyDataset('startups');
    });

    el.cardDsBoston.addEventListener('click', () => {
      setActiveDatasetCard('boston');
      el.customCsvPanel.style.display = 'none';
      applyDataset('boston');
    });

    el.cardDsCustom.addEventListener('click', () => {
      setActiveDatasetCard('custom');
      el.customCsvPanel.style.display = 'block';
      el.customCsvUrlInput.focus();
      el.brandTitle.textContent = '多元線性回歸';
      el.heroTitle.innerHTML = `<i class="fa-solid fa-microchip" style="color:var(--cyan-neon)"></i> 多元線性回歸`;
    });
  }

  function setActiveDatasetCard(key) {
    el.cardDsStartups.classList.toggle('active', key === 'startups');
    el.cardDsBoston.classList.toggle('active', key === 'boston');
    el.cardDsCustom.classList.toggle('active', key === 'custom');
  }

  /**
   * Pyodide Web Worker 橋接器
   * 透過 pyworker.js 在背景執行 csv_engine.py，不卡住 UI
   */
  const PyEngine = (() => {
    let worker = null;
    let seq = 0;
    const pending = new Map();

    function getWorker() {
      if (worker) return worker;
      if (location.protocol === 'file:') {
        throw {
          kind: 'load',
          message: '直接雙擊開啟 index.html 無法啟動 Python 引擎',
          hint: '請使用本機伺服器開啟（例如 http://localhost:8088/）'
        };
      }
      if (typeof Worker === 'undefined') {
        throw {
          kind: 'load',
          message: '這個瀏覽器不支援 Web Worker，無法執行 Python 引擎',
          hint: '請使用最新版 Chrome、Edge、Firefox 或 Safari'
        };
      }
      worker = new Worker('pyworker.js');
      worker.onmessage = (e) => {
        const { id, type, result, error, msg } = e.data;
        const p = pending.get(id);
        if (!p) return;
        if (type === 'progress') {
          if (typeof p.onProgress === 'function') p.onProgress(msg);
        } else if (type === 'result') {
          pending.delete(id);
          p.resolve(result);
        } else if (type === 'error') {
          pending.delete(id);
          p.reject(error);
        }
      };
      worker.onerror = (e) => {
        const err = {
          kind: 'load',
          message: 'Python 執行緒發生未預期的錯誤',
          hint: e.message || '請確認網路連線可存取 cdn.jsdelivr.net'
        };
        for (const [id, p] of pending.entries()) {
          p.reject(err);
        }
        pending.clear();
      };
      return worker;
    }

    function call(cmd, payload = {}, onProgress = null) {
      return new Promise((resolve, reject) => {
        try {
          const w = getWorker();
          const id = ++seq;
          pending.set(id, { resolve, reject, onProgress });
          w.postMessage({ id, cmd, ...payload });
        } catch (err) {
          reject(err);
        }
      });
    }

    return { call };
  })();

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setEngineBadge(state, text) {
    if (!el.pyEngineBadge) return;
    el.pyEngineBadge.className = 'py-engine-badge ' + state;
    el.pyEngineBadge.innerHTML = `<i class="fa-brands fa-python"></i> ${escapeHtml(text)}`;
  }

  let warmupStarted = false;
  function warmupPythonEngine() {
    if (warmupStarted) return;
    warmupStarted = true;
    setEngineBadge('loading', 'Python 引擎：載入中…');
    PyEngine.call('warmup', {}, (msg) => {
      setEngineBadge('loading', 'Python 引擎：' + msg.split('…')[0] + '…');
    }).then(() => {
      setEngineBadge('ready', 'Python 引擎：就緒');
    }).catch(err => {
      console.warn('PyEngine warmup failed:', err);
      setEngineBadge('error', 'Python 引擎：載入失敗');
    });
  }

  // 暫存上傳的檔案位元組與檢查結果
  let customCsvState = null;

  function showCustomCsvStatus(msg, type) {
    if (!el.customCsvStatus) return;
    el.customCsvStatus.style.display = 'block';
    el.customCsvStatus.className = 'custom-status-msg ' + type;
    const icons = {
      loading: '<i class="fa-solid fa-spinner fa-spin"></i>',
      success: '<i class="fa-solid fa-circle-check"></i>',
      error: '<i class="fa-solid fa-triangle-exclamation"></i>'
    };
    el.customCsvStatus.innerHTML = `${icons[type] || ''} <span>${msg}</span>`;
  }

  /**
   * Setup Custom CSV Loader & Parser Engine (URL + Local File Upload + Pyodide Worker)
   */
  function setupCustomCsvLoader() {
    // 預熱 Python
    warmupPythonEngine();

    // 迷你快速測試按鈕
    el.miniPresetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const url = btn.dataset.url;
        const target = btn.dataset.target;
        el.customCsvUrlInput.value = url;
        loadCustomCsvFromUrl(url, target);
      });
    });

    // 網址載入按鈕
    el.btnLoadCustomCsv.addEventListener('click', () => {
      const url = el.customCsvUrlInput.value.trim();
      if (!url) {
        showCustomCsvStatus('請輸入有效的 CSV 檔案網址！', 'error');
        return;
      }
      loadCustomCsvFromUrl(url);
    });

    // 網址輸入框 Enter
    el.customCsvUrlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const url = el.customCsvUrlInput.value.trim();
        if (url) loadCustomCsvFromUrl(url);
      }
    });

    // 本機上傳按鈕
    if (el.btnUploadCsvFile && el.customCsvFileInput) {
      el.btnUploadCsvFile.addEventListener('click', () => {
        el.customCsvFileInput.value = '';
        el.customCsvFileInput.click();
      });

      el.customCsvFileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        loadCustomCsvFromFile(file);
      });
    }

    // 拖曳上傳支援
    if (el.customCsvPanel) {
      el.customCsvPanel.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      el.customCsvPanel.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) {
          loadCustomCsvFromFile(file);
        }
      });
    }

    // 步驟 2：開始分析按鈕
    if (el.btnRunCustomAnalysis) {
      el.btnRunCustomAnalysis.addEventListener('click', () => {
        const target = el.customTargetSelect ? el.customTargetSelect.value : '';
        if (!target) {
          showCustomCsvStatus('請選擇要預測的目標欄位 (y)！', 'error');
          return;
        }
        runCustomAnalysis(target);
      });
    }
  }

  function loadCustomCsvFromFile(file) {
    if (!file.name.match(/\.(csv|txt|tsv)$/i)) {
      showCustomCsvStatus('檔案格式不支援！請選擇 .csv、.tsv 或 .txt 文字檔。', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showCustomCsvStatus('檔案大小超過 10 MB 上限！請減少筆數後再試。', 'error');
      return;
    }
    showCustomCsvStatus(`讀取本機檔案 ${file.name} 中…`, 'loading');
    const reader = new FileReader();
    reader.onload = (e) => {
      const bytes = new Uint8Array(e.target.result);
      inspectCustomCsv(bytes, file.name);
    };
    reader.onerror = () => {
      showCustomCsvStatus('本機檔案讀取失敗！請確認權限或重新選擇。', 'error');
    };
    reader.readAsArrayBuffer(file);
  }

  async function loadCustomCsvFromUrl(url, targetHint = null) {
    showCustomCsvStatus(`正在下載 ${url.split('/').pop() || url} …`, 'loading');
    if (el.customCsvSetup) el.customCsvSetup.style.display = 'none';

    try {
      let bytes = null;
      let filename = url.split('/').pop().split('?')[0] || 'dataset.csv';
      try {
        const res = await fetch(url);
        if (res.ok) {
          const buf = await res.arrayBuffer();
          bytes = new Uint8Array(buf);
        }
      } catch (err) {
        // Fallback: CORS proxy
        const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
        const pRes = await fetch(proxyUrl);
        if (pRes.ok) {
          const buf = await pRes.arrayBuffer();
          bytes = new Uint8Array(buf);
        }
      }

      if (!bytes || bytes.length === 0) {
        throw new Error('無法取得 CSV 內容（可能網址無效或被來源伺服器封鎖跨網域存取）');
      }

      await inspectCustomCsv(bytes, filename, targetHint);
      if (targetHint && el.customTargetSelect) {
        const hasOption = Array.from(el.customTargetSelect.options).some(o => o.value.toLowerCase() === targetHint.toLowerCase());
        if (hasOption) {
          el.customTargetSelect.value = targetHint;
          runCustomAnalysis(targetHint);
        }
      }
    } catch (err) {
      showCustomCsvStatus(err.message || '載入失敗', 'error');
    }
  }

  /**
   * 第 1 步：Python 檢查欄位結構 (inspect)
   */
  async function inspectCustomCsv(bytes, filename, targetHint = null) {
    if (el.customCsvSetup) el.customCsvSetup.style.display = 'none';
    showCustomCsvStatus('Python 正在解析欄位型別、缺失值與編碼…', 'loading');

    try {
      const jsonStr = await PyEngine.call('inspect', { bytes, filename }, (msg) => {
        showCustomCsvStatus(escapeHtml(msg), 'loading');
      });
      const info = JSON.parse(jsonStr);
      customCsvState = { bytes, filename, info };

      // 摘要
      if (el.customCsvSummary) {
        el.customCsvSummary.innerHTML = `
          <strong>${escapeHtml(filename)}</strong> · 共 <strong>${info.n_rows.toLocaleString()}</strong> 列，
          偵測到 <strong>${info.columns.length}</strong> 個欄位（${escapeHtml(info.encoding)} 編碼，分隔符號：${escapeHtml(info.delimiter_name)}）
        `;
      }

      // 目標下拉選單 (只列出數值型)
      const numCols = info.columns.filter(c => c.role === 'numeric');
      if (numCols.length === 0) {
        throw new Error('此 CSV 沒有找到任何數值欄位，無法進行線性迴歸分析！');
      }

      if (el.customTargetSelect) {
        el.customTargetSelect.innerHTML = numCols.map(c => `
          <option value="${escapeHtml(c.name)}">${escapeHtml(c.name)} (缺失: ${c.missing} 筆)</option>
        `).join('');

        const defaultTarget = targetHint || info.suggested_target || numCols[numCols.length - 1].name;
        el.customTargetSelect.value = defaultTarget;
      }

      // 欄位晶片
      if (el.customColumnChips) {
        const roleClass = { numeric: 'num', categorical: 'cat', id: 'skip', constant: 'skip', text: 'skip', empty: 'skip' };
        el.customColumnChips.innerHTML = info.columns.map(c => `
          <span class="col-chip ${roleClass[c.role] || 'skip'}" title="${escapeHtml(c.role_label)}｜缺失 ${c.missing} 筆｜${c.unique} 種值">
            ${escapeHtml(c.name)} <em>${escapeHtml(c.role_label)}</em>
          </span>
        `).join('');
      }

      // 警告
      if (el.customSetupWarnings) {
        el.customSetupWarnings.innerHTML = (info.warnings || []).map(w => `
          <li><i class="fa-solid fa-circle-info"></i> ${escapeHtml(w)}</li>
        `).join('');
      }

      if (el.customCsvSetup) el.customCsvSetup.style.display = 'block';
      showCustomCsvStatus('欄位讀取成功！請在步驟 2 確認目標欄位後點擊開始分析。', 'success');
    } catch (err) {
      const msg = (err && err.message) || String(err);
      const hint = (err && err.hint) ? `<br><small style="color:var(--text-dim)">${escapeHtml(err.hint)}</small>` : '';
      showCustomCsvStatus(msg + hint, 'error');
    }
  }

  /**
   * 第 2 步：Python 完整分析 (analyze)
   */
  async function runCustomAnalysis(target) {
    if (!customCsvState) return;
    const { bytes, filename } = customCsvState;
    if (el.btnRunCustomAnalysis) el.btnRunCustomAnalysis.disabled = true;
    showCustomCsvStatus(`Python 正在進行特徵選擇與模型訓練（目標：${escapeHtml(target)}）…`, 'loading');

    try {
      const jsonStr = await PyEngine.call('analyze', { bytes, filename, target }, (msg) => {
        showCustomCsvStatus(escapeHtml(msg), 'loading');
      });
      const cfg = JSON.parse(jsonStr);
      window.DATASETS_CONFIG['custom'] = cfg;

      const info = cfg.engineInfo || {};
      const recK = (cfg.recommendedK && cfg.recommendedK['Forward SFS']) || 1;
      showCustomCsvStatus(
        `分析完成！${cfg.recordCount.toLocaleString()} 筆資料，目標：${escapeHtml(cfg.target)}，` +
        `候選特徵數：${(info.features || []).length} 個，奧坎剃刀 1-SE 推薦 K = ${recK}`,
        'success'
      );

      applyDataset('custom');
      setActiveDatasetCard('custom');

      // 滾動到儀表板
      const hud = document.getElementById('controlHud');
      if (hud) hud.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      const msg = (err && err.message) || String(err);
      const hint = (err && err.hint) ? `<br><small style="color:var(--text-dim)">${escapeHtml(err.hint)}</small>` : '';
      showCustomCsvStatus(msg + hint, 'error');
    } finally {
      if (el.btnRunCustomAnalysis) el.btnRunCustomAnalysis.disabled = false;
    }
  }

  /**
   * Switch Active Dataset Configuration
   */
  function applyDataset(dsKey) {
    currentDataset = dsKey;
    const cfg = window.DATASETS_CONFIG[dsKey];
    if (!cfg) return;

    // 1. Update Header & Hero Elements
    const displayTitle = (dsKey === 'custom') ? '多元線性回歸' : cfg.fullName;
    el.brandTitle.textContent = displayTitle;
    el.brandBadge.textContent = cfg.badge;
    el.heroTitle.innerHTML = `<i class="fa-solid fa-microchip" style="color:var(--cyan-neon)"></i> ${displayTitle}`;
    el.heroDesc.textContent = cfg.description;
    el.heroTags.innerHTML = (cfg.tags || []).map(t => `<span class="hero-tag">${t}</span>`).join('');
    el.btnOpenDatasetText.textContent = `瀏覽資料集 (${cfg.recordCount}筆)`;
    el.datasetModalTitle.textContent = `${cfg.name} 原始數據集 (${cfg.recordCount} 筆)`;
    el.datasetModalCount.textContent = `總計 ${cfg.recordCount} 筆紀錄`;
    el.scatterChartTitle.textContent = `Actual vs. Predicted ${cfg.targetLabel}`;
    el.simulatorTitle.textContent = dsKey === 'startups' ? 'Live Profit Predictor (AIoT 即時投資支出利潤模擬器)' : dsKey === 'boston' ? 'Live Boston Housing Price Predictor (波士頓房價即時預估模擬器)' : `Live ${cfg.name} Predictor (即時特徵推論模擬器)`;
    el.targetValLabel.textContent = `即時預測 ${cfg.target} (Predicted Target)`;
    el.waterfallHeader.textContent = `特徵影響拆解 (Contribution Waterfall)`;
    el.coefCardTag.textContent = dsKey === 'startups' ? 'Two Dummies: CA=Baseline (FL=0, NY=0)' : `Features: ${Object.keys(cfg.records[0]).slice(0, 5).join(', ')}`;

    // 2. Render Dynamic Simulator Inputs
    renderSimulatorInputs(cfg);

    // 3. Render Modal Table Headers & Data
    renderModalStructure(cfg);

    // 4. Reset Algorithm & Dynamic K-Selector
    currentAlgo = 'Forward SFS';
    currentK = (dsKey === 'boston') ? 10 : (dsKey === 'startups') ? 1 : ((cfg.recommendedK && cfg.recommendedK['Forward SFS']) || 1);
    
    // Reset active buttons in UI
    el.algoTabs.querySelectorAll('.algo-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.algo === currentAlgo);
    });

    renderKSelector(cfg);
    updateDashboard();
  }

  /**
   * Setup Algorithm & K Selector Buttons
   */
  function setupAlgorithmsAndK() {
    el.algoTabs.querySelectorAll('.algo-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        el.algoTabs.querySelectorAll('.algo-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentAlgo = btn.dataset.algo;
        const cfg = window.DATASETS_CONFIG[currentDataset];
        if (cfg) renderKSelector(cfg);
        updateDashboard();
      });
    });
  }

  /**
   * Dynamically Render K Selector Buttons based on Active Dataset Features (up to Top 10)
   */
  function renderKSelector(cfg) {
    const algoModels = cfg.models[currentAlgo] || [];
    const maxK = algoModels.length;
    if (maxK === 0) return;

    // Detect optimal K
    let optK = 1;
    let bestAdjR2 = -999;
    algoModels.forEach(step => {
      if (step.adj_r2 > bestAdjR2) {
        bestAdjR2 = step.adj_r2;
        optK = step.k;
      }
    });

    if (cfg.id === 'startups') {
      optK = 2; // K=2 is lowest RMSE sweet spot; K=1 is 1-SE choice
    } else if (cfg.id === 'boston') {
      optK = 10; // K=10 is the best Top-10 parsimony model
    } else if (cfg.lowestCvK && cfg.lowestCvK[currentAlgo]) {
      optK = cfg.lowestCvK[currentAlgo];
    }

    let html = '';
    algoModels.forEach(step => {
      const kVal = step.k;
      const isCurrent = (kVal === currentK);
      const is1SE = (cfg.id === 'startups' && kVal === 1) || (cfg.recommendedK && cfg.recommendedK[currentAlgo] === kVal);
      const isOptimal = (kVal === optK);
      const isFull = (kVal === maxK);

      let btnClass = 'k-btn';
      if (is1SE) btnClass += ' parsimony';
      else if (isOptimal) btnClass += ' sweet';
      else if (isFull && maxK >= 5) btnClass += ' overfit';
      if (isCurrent) btnClass += ' active';

      let iconHtml = '';
      let badgeText = '';
      if (is1SE) {
        iconHtml = '<i class="fa-solid fa-star"></i>';
        badgeText = ' (★ 1-SE 最簡推薦)';
      } else if (isOptimal) {
        iconHtml = '<i class="fa-solid fa-gem"></i>';
        badgeText = (cfg.id === 'boston') ? ' (★ Top 10 最優解)' : ' (◆ 最低 CV 誤差)';
      } else if (isFull && maxK >= 5 && !isOptimal) {
        iconHtml = '<i class="fa-solid fa-triangle-exclamation"></i>';
        badgeText = ` (K=${maxK} 全特徵)`;
      } else {
        const addedFeat = step.features[step.features.length - 1];
        badgeText = addedFeat ? ` (+ ${addedFeat})` : '';
      }

      html += `
        <button class="${btnClass}" data-k="${kVal}">
          ${iconHtml}
          <span>K = ${kVal} 特徵${badgeText}</span>
        </button>
      `;
    });

    el.kSelectorGroup.innerHTML = html;

    // Rebind click events
    el.kSelectorGroup.querySelectorAll('.k-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        el.kSelectorGroup.querySelectorAll('.k-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentK = parseInt(btn.dataset.k, 10);
        updateDashboard();
      });
    });
  }

  /**
   * Render Interactive Simulator Sliders & Presets based on Active Dataset
   */
  function renderSimulatorInputs(cfg) {
    const sim = cfg.simulator;
    let html = '';

    sim.sliders.forEach(s => {
      const defaultValFormatted = currentDataset === 'startups' ? fmtCurrency(s.default) : Number(s.default).toFixed(1);
      html += `
        <div class="slider-group">
          <div class="slider-label-row">
            <span class="slider-title">
              <i class="fa-solid ${s.icon}" style="color:${s.color}"></i>
              ${s.label}
            </span>
            <span class="slider-val-box" id="disp_${s.id}">${defaultValFormatted}</span>
          </div>
          <input type="range" class="cyber-range sim-slider" id="${s.id}" min="${s.min}" max="${s.max}" step="${s.step}" value="${s.default}">
        </div>
      `;
    });

    // If 50 Startups, add State Selector Pills
    if (sim.type === 'startups') {
      html += `
        <div class="slider-group" style="margin-bottom:10px">
          <div class="slider-label-row">
            <span class="slider-title">
              <i class="fa-solid fa-location-dot" style="color:var(--rose-neon)"></i>
              Startup Location (所在州別)
            </span>
          </div>
          <div class="state-selector-pills">
            <button class="state-btn active" data-state="California">
              <i class="fa-solid fa-sun"></i> California (基準組)
            </button>
            <button class="state-btn" data-state="Florida">
              <i class="fa-solid fa-umbrella-beach"></i> Florida
            </button>
            <button class="state-btn" data-state="New York">
              <i class="fa-solid fa-city"></i> New York
            </button>
          </div>
        </div>
      `;
    }

    // If Custom Dataset and has Categorical Features
    if (sim.categoricals && sim.categoricals.length > 0) {
      sim.categoricals.forEach(cat => {
        const colName = cat.column || cat.label || 'Feature';
        const catId = cat.id || `sim_cat_${colName.replace(/[^a-zA-Z0-9_]/g, '_')}`;
        const baseVal = cat.base || cat.baseline || (cat.levels && cat.levels[0] ? cat.levels[0].value : '');
        const defaultVal = cat.default || baseVal;
        const options = (cat.categories) ? cat.categories : (cat.levels ? cat.levels.map(lv => lv.value) : []);
        html += `
          <div class="slider-group" style="margin-bottom:10px">
            <div class="slider-label-row">
              <span class="slider-title">
                <i class="fa-solid fa-tags" style="color:var(--cyan-neon)"></i>
                ${escapeHtml(colName)} (類別特徵)
              </span>
            </div>
            <select class="cyber-select sim-cat" id="${escapeHtml(catId)}" data-col="${escapeHtml(colName)}" data-base="${escapeHtml(baseVal)}" style="width:100%; margin-top:6px;">
              ${options.map(c => `<option value="${escapeHtml(c)}" ${c === defaultVal ? 'selected' : ''}>${escapeHtml(c)}${c === baseVal ? ' (基準組)' : ''}</option>`).join('')}
            </select>
          </div>
        `;
      });
    }

    // Presets Row
    html += `
      <div class="presets-row">
        <span style="font-size:12px; color:var(--text-dim); font-weight:600">快速情境預設：</span>
    `;
    (sim.presets || []).forEach(p => {
      html += `<button class="preset-btn sim-preset-btn" data-preset='${JSON.stringify(p)}'>${escapeHtml(p.name)}</button>`;
    });
    html += `</div>`;

    el.simulatorControls.innerHTML = html;

    // Attach slider event listeners
    (sim.sliders || []).forEach(s => {
      const sliderEl = document.getElementById(s.id);
      const dispEl = document.getElementById(`disp_${s.id}`);
      if (sliderEl && dispEl) {
        sliderEl.addEventListener('input', () => {
          dispEl.textContent = currentDataset === 'startups' ? fmtCurrency(Number(sliderEl.value)) : Number(sliderEl.value).toFixed(1);
          calculateLivePrediction();
        });
      }
    });

    // Attach state buttons listeners
    if (sim.type === 'startups') {
      const stateBtns = el.simulatorControls.querySelectorAll('.state-btn');
      stateBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          stateBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentStartupState = btn.dataset.state;
          calculateLivePrediction();
        });
      });
    }

    // Attach categorical select listeners
    if (sim.categoricals && sim.categoricals.length > 0) {
      sim.categoricals.forEach(cat => {
        const colName = cat.column || cat.label || 'Feature';
        const catId = cat.id || `sim_cat_${colName.replace(/[^a-zA-Z0-9_]/g, '_')}`;
        const catEl = document.getElementById(catId);
        if (catEl) {
          catEl.addEventListener('change', () => {
            calculateLivePrediction();
          });
        }
      });
    }

    // Attach preset buttons listeners
    const presetBtns = el.simulatorControls.querySelectorAll('.sim-preset-btn');
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const p = JSON.parse(btn.dataset.preset);
        if (sim.type === 'startups') {
          document.getElementById('sliderRd').value = p.rd;
          document.getElementById('disp_sliderRd').textContent = fmtCurrency(p.rd);
          document.getElementById('sliderAdmin').value = p.admin;
          document.getElementById('disp_sliderAdmin').textContent = fmtCurrency(p.admin);
          document.getElementById('sliderMarketing').value = p.mkt;
          document.getElementById('disp_sliderMarketing').textContent = fmtCurrency(p.mkt);
          
          currentStartupState = p.state;
          el.simulatorControls.querySelectorAll('.state-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.state === p.state);
          });
        } else if (sim.type === 'boston') {
          sim.sliders.forEach(s => {
            if (p[s.field] !== undefined) {
              const slider = document.getElementById(s.id);
              if (slider) {
                slider.value = p[s.field];
                document.getElementById(`disp_${s.id}`).textContent = Number(p[s.field]).toFixed(1);
              }
            }
          });
        } else {
          // Custom presets
          if (p.values) {
            sim.sliders.forEach((s, i) => {
              const slider = document.getElementById(s.id);
              if (slider && p.values[i] !== undefined) {
                slider.value = p.values[i];
                document.getElementById(`disp_${s.id}`).textContent = Number(p.values[i]).toFixed(1);
              }
            });
          }
        }
        calculateLivePrediction();
      });
    });
  }

  /**
   * Main Dashboard Update Routine
   */
  function updateDashboard() {
    const cfg = window.DATASETS_CONFIG[currentDataset];
    if (!cfg) return;

    const algoModels = cfg.models[currentAlgo];
    if (!algoModels) return;

    if (currentK > algoModels.length) currentK = algoModels.length;
    const step = algoModels.find(s => s.k === currentK) || algoModels[0];

    // Re-highlight active K button in dynamic HUD
    el.kSelectorGroup.querySelectorAll('.k-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.k, 10) === currentK);
    });

    updateMetricsHUD(step, cfg);
    updateEquationHUD(step);
    updateCoefficientsTable(step);
    updateOutliersTable(step);
    updateTrajectoryCharts(cfg);
    updateDiagnosticCharts(step, cfg);
    calculateLivePrediction();
  }

  /**
   * Update KPI Cards in HUD
   */
  function updateMetricsHUD(step, cfg) {
    if (cfg.isCurrency) {
      el.metricRmse.textContent = fmtCurrency(step.rmse);
      el.metricMae.textContent = fmtCurrency(step.mae);
    } else {
      el.metricRmse.textContent = step.rmse.toFixed(3);
      el.metricMae.textContent = step.mae.toFixed(3);
    }

    el.metricR2.textContent = (step.r2 * 100).toFixed(2) + '%';
    el.metricAdjR2.textContent = (step.adj_r2 * 100).toFixed(2) + '%';
    el.metricFstat.textContent = step.f_stat ? step.f_stat.toFixed(1) : 'N/A';

    // Status description
    if (currentDataset === 'startups') {
      el.metricR2Desc.textContent = step.r2 >= 0.90 ? '目標門檻 ≥ 90% (✅ 達成)' : '接近門檻 90%';
      if (currentK === 1) {
        el.metricParsimony.textContent = '★ 1-SE Choice';
        el.metricParsimony.style.color = 'var(--cyan-neon)';
        el.metricParsimonyDesc.textContent = '奧坎剃刀原則：最簡穩健模型，零多重共線性。';
        el.cardParsimony.className = 'cyber-metric-card parsimony';
      } else if (currentK === 2) {
        el.metricParsimony.textContent = '★ Sweet Spot';
        el.metricParsimony.style.color = 'var(--emerald-neon)';
        el.metricParsimonyDesc.textContent = '最低 RMSE 甜蜜點（研發 + 行銷支出）。';
        el.cardParsimony.className = 'cyber-metric-card sweet';
      } else if (currentK === 5) {
        el.metricParsimony.textContent = 'Overfitting Risk';
        el.metricParsimony.style.color = 'var(--amber-neon)';
        el.metricParsimonyDesc.textContent = '全特徵 Model B：引入行政與州別，多重共線性風險。';
        el.cardParsimony.className = 'cyber-metric-card alert';
      } else {
        el.metricParsimony.textContent = 'Diminishing Returns';
        el.metricParsimony.style.color = '#cbd5e1';
        el.metricParsimonyDesc.textContent = `加入第 ${currentK} 個特徵後邊際效益遞減。`;
        el.cardParsimony.className = 'cyber-metric-card';
      }
    } else if (currentDataset === 'boston') {
      el.metricR2Desc.textContent = `解釋力 R² = ${(step.r2 * 100).toFixed(1)}% (Adj R² = ${(step.adj_r2 * 100).toFixed(1)}%)`;
      if (currentK === 10) {
        el.metricParsimony.textContent = '★ 10-Feat Optimum';
        el.metricParsimony.style.color = 'var(--emerald-neon)';
        el.metricParsimonyDesc.textContent = '奧坎剃刀最佳決策點：納入前十大最具解釋力特徵，捨棄過擬合屋齡與商用比雜訊。';
        el.cardParsimony.className = 'cyber-metric-card sweet';
      } else if (currentK === 2) {
        el.metricParsimony.textContent = '★ Quick Baseline';
        el.metricParsimony.style.color = 'var(--cyan-neon)';
        el.metricParsimonyDesc.textContent = '雙主力特徵（LSTAT 低收入比 + RM 房間數）解釋 63.9% 變異。';
        el.cardParsimony.className = 'cyber-metric-card parsimony';
      } else if (currentK === 5) {
        el.metricParsimony.textContent = '5-Feat Compact';
        el.metricParsimony.style.color = '#cbd5e1';
        el.metricParsimonyDesc.textContent = '經典五大指標模型（R² = 70.8%）。擴充至 10 特徵可進一步提升至 73.4%。';
        el.cardParsimony.className = 'cyber-metric-card';
      } else {
        el.metricParsimony.textContent = `Step K=${currentK} Model`;
        el.metricParsimony.style.color = '#cbd5e1';
        el.metricParsimonyDesc.textContent = `當前模型選取 ${currentK} 個特徵，RMSE = ${step.rmse.toFixed(2)}。`;
        el.cardParsimony.className = 'cyber-metric-card';
      }
    } else {
      el.metricR2Desc.textContent = `解釋力 R² = ${(step.r2 * 100).toFixed(1)}% (Adj R² = ${(step.adj_r2 * 100).toFixed(1)}%)`;
      const algoModels = cfg.models[currentAlgo] || [];
      const bestAdj = Math.max(...algoModels.map(s => s.adj_r2));
      if (Math.abs(step.adj_r2 - bestAdj) < 1e-4) {
        el.metricParsimony.textContent = '★ Parsimony Sweet Spot';
        el.metricParsimony.style.color = 'var(--emerald-neon)';
        el.metricParsimonyDesc.textContent = '奧坎剃刀最佳模型：達到最高調整後 R²，精簡度與準確度平衡點。';
        el.cardParsimony.className = 'cyber-metric-card sweet';
      } else if (currentK === 1) {
        el.metricParsimony.textContent = '1-Feat Baseline';
        el.metricParsimony.style.color = 'var(--cyan-neon)';
        el.metricParsimonyDesc.textContent = '單一最具影響力特徵基準模型。';
        el.cardParsimony.className = 'cyber-metric-card parsimony';
      } else {
        el.metricParsimony.textContent = `Step K=${currentK} Model`;
        el.metricParsimony.style.color = '#cbd5e1';
        el.metricParsimonyDesc.textContent = `累計納入 ${currentK} 個特徵，RMSE = ${step.rmse.toFixed(2)}。`;
        el.cardParsimony.className = 'cyber-metric-card';
      }
    }
  }

  /**
   * Update Mathematical Equation Terminal
   */
  function updateEquationHUD(step) {
    const coefMap = {};
    step.coefficients.forEach(c => { coefMap[c.feature] = c.coef; });
    const b0 = coefMap['Intercept (β₀)'] || 0;

    const b0Formatted = currentDataset === 'startups' ? fmtCurrency(b0) : b0.toFixed(2);
    let eqHtml = `<span class="eq-prefix">ŷ (${currentDataset === 'startups' ? 'Profit' : 'Target'}) =</span> <span class="eq-coef">${b0Formatted}</span>`;

    step.features.forEach(feat => {
      const val = coefMap[feat] || 0;
      const sign = val >= 0 ? '+' : '-';
      const absVal = Math.abs(val);
      const valStr = absVal >= 10 ? fmtNumber(absVal, 2) : absVal.toFixed(4);
      eqHtml += ` ${sign} <span class="eq-coef">${valStr}</span> × <span class="eq-var">${feat}</span>`;
    });

    el.eqContainer.innerHTML = eqHtml;
  }

  /**
   * Update Coefficients & VIF Table
   */
  function updateCoefficientsTable(step) {
    let rowsHtml = '';
    step.coefficients.forEach(c => {
      const isIntercept = c.feature.includes('Intercept');
      const pBadge = c.pvalue < 0.001 
        ? `<span class="p-sig-badge">< 0.001 ★★★</span>` 
        : c.pvalue < 0.05 
          ? `<span class="p-sig-badge">${c.pvalue.toFixed(4)} ★</span>` 
          : `<span style="color:#64748b">${c.pvalue.toFixed(4)} (ns)</span>`;

      let vifHtml = '<span style="color:#64748b">—</span>';
      if (c.vif !== null && c.vif !== undefined) {
        if (c.vif < 3) {
          vifHtml = `<span class="vif-safe">${c.vif.toFixed(2)} (Safe)</span>`;
        } else if (c.vif <= 10) {
          vifHtml = `<span class="vif-warn">${c.vif.toFixed(2)} (Moderate)</span>`;
        } else {
          vifHtml = `<span class="vif-danger">${c.vif.toFixed(2)} (Severe)</span>`;
        }
      }

      rowsHtml += `
        <tr>
          <td style="font-weight:600; color:${isIntercept ? '#94a3b8' : 'var(--cyan-neon)'}">
            ${isIntercept ? '<i class="fa-solid fa-anchor" style="margin-right:6px"></i>' : '<i class="fa-solid fa-code-commit" style="margin-right:6px"></i>'}
            ${c.feature}
          </td>
          <td class="mono" style="font-weight:700; color:#fff">${c.coef >= 10 ? fmtNumber(c.coef, 2) : c.coef.toFixed(4)}</td>
          <td class="mono" style="color:#94a3b8">${c.stderr >= 10 ? fmtNumber(c.stderr, 2) : c.stderr.toFixed(4)}</td>
          <td class="mono" style="color:#cbd5e1">${c.tstat.toFixed(3)}</td>
          <td>${pBadge}</td>
          <td class="mono" style="color:#94a3b8">[${fmtNumber(c.ci_lower, 1)}, ${fmtNumber(c.ci_upper, 1)}]</td>
          <td>${vifHtml}</td>
        </tr>
      `;
    });

    el.coefTableBody.innerHTML = rowsHtml;
  }

  /**
   * Update Outliers Diagnostic Table (Top 10)
   */
  function updateOutliersTable(step) {
    if (!step.outliers || !step.outliers.length) return;

    let rowsHtml = '';
    // Show Top 10 outliers
    step.outliers.slice(0, 10).forEach(o => {
      const isPositive = o.residual >= 0;
      const resColor = isPositive ? 'var(--emerald-neon)' : 'var(--rose-neon)';
      const rankBadge = o.rank === 1 ? 'color: var(--amber-neon); font-weight:700;' : o.rank <= 3 ? 'color: var(--cyan-neon); font-weight:600;' : '';

      const actStr = currentDataset === 'startups' ? fmtCurrency(o.actual) : o.actual.toFixed(2);
      const prdStr = currentDataset === 'startups' ? fmtCurrency(o.predicted) : o.predicted.toFixed(2);
      const resStr = currentDataset === 'startups' ? (isPositive ? '+' : '') + fmtCurrency(o.residual) : (isPositive ? '+' : '') + o.residual.toFixed(2);
      const absStr = currentDataset === 'startups' ? fmtCurrency(o.abs_error) : o.abs_error.toFixed(2);

      rowsHtml += `
        <tr>
          <td style="${rankBadge}">#${o.rank}</td>
          <td class="mono" style="color:var(--cyan-neon)">Sample [${o.index}]</td>
          <td class="mono" style="font-weight:600; color:#fff">${actStr}</td>
          <td class="mono" style="color:#94a3b8">${prdStr}</td>
          <td class="mono" style="color:${resColor}; font-weight:600">${resStr}</td>
          <td class="mono" style="color:#cbd5e1">${absStr}</td>
          <td>
            <span style="background:rgba(255,255,255,0.06); padding:2px 8px; border-radius:4px; font-weight:600; font-family:monospace; color:${o.pct_error > 15 ? 'var(--rose-neon)' : 'var(--text-muted)'}">
              ${o.pct_error.toFixed(1)}%
            </span>
          </td>
        </tr>
      `;
    });

    el.outlierTableBody.innerHTML = rowsHtml;
  }

  /**
   * Update Trajectory Line Charts (RMSE & R²)
   */
  function updateTrajectoryCharts(cfg) {
    const algoModels = cfg.models[currentAlgo] || [];
    const maxK = Math.max(1, algoModels.length);
    const labels = Array.from({ length: maxK }, (_, i) => `K=${i + 1}`);
    const rmseDatasets = [];
    const r2Datasets = [];

    Object.keys(cfg.models).forEach(algo => {
      const isCurrent = (algo === currentAlgo);
      const color = ALGO_COLORS[algo] || '#6366f1';
      const steps = cfg.models[algo];

      rmseDatasets.push({
        label: algo,
        data: steps.map(s => s.rmse),
        borderColor: color,
        backgroundColor: color,
        borderWidth: isCurrent ? 3 : 1.5,
        borderDash: isCurrent ? [] : [4, 4],
        pointRadius: (ctx) => (ctx.dataIndex === currentK - 1 ? (isCurrent ? 7.5 : 5.5) : (isCurrent ? 4 : 2)),
        pointHoverRadius: 8,
        pointBackgroundColor: (ctx) => (ctx.dataIndex === currentK - 1 ? '#ffffff' : color),
        pointBorderColor: color,
        pointBorderWidth: 2,
        tension: 0.25,
        order: isCurrent ? 1 : 2
      });

      r2Datasets.push({
        label: algo,
        data: steps.map(s => s.r2),
        borderColor: color,
        backgroundColor: color,
        borderWidth: isCurrent ? 3 : 1.5,
        borderDash: isCurrent ? [] : [4, 4],
        pointRadius: (ctx) => (ctx.dataIndex === currentK - 1 ? (isCurrent ? 7.5 : 5.5) : (isCurrent ? 4 : 2)),
        pointHoverRadius: 8,
        pointBackgroundColor: (ctx) => (ctx.dataIndex === currentK - 1 ? '#ffffff' : color),
        pointBorderColor: color,
        pointBorderWidth: 2,
        tension: 0.25,
        order: isCurrent ? 1 : 2
      });
    });

    // Update Header Badges with exact values of all methods at currentK
    const algoList = Object.keys(cfg.models);
    const rmseSummaryList = [];
    const r2SummaryList = [];

    algoList.forEach(algo => {
      const steps = cfg.models[algo];
      const stepAtK = steps.find(s => s.k === currentK) || steps[steps.length - 1];
      if (stepAtK) {
        const rmseStr = currentDataset === 'startups' ? fmtCurrency(stepAtK.rmse) : stepAtK.rmse.toFixed(2);
        const r2Str = (stepAtK.r2 * 100).toFixed(1) + '%';
        const isCur = (algo === currentAlgo);
        const prefix = isCur ? `<span style="color:#fff; font-weight:700;">${algo}</span>` : algo;
        rmseSummaryList.push(`${prefix}: ${rmseStr}`);
        r2SummaryList.push(`${prefix}: ${r2Str}`);
      }
    });

    if (el.rmseKValTag) {
      el.rmseKValTag.innerHTML = `<i class="fa-solid fa-crosshairs"></i> K=${currentK} 各方法: ${rmseSummaryList.join(' | ')}`;
    }
    if (el.r2KValTag) {
      el.r2KValTag.innerHTML = `<i class="fa-solid fa-crosshairs"></i> K=${currentK} 各方法: ${r2SummaryList.join(' | ')}`;
    }

    rmseChart.data.labels = labels;
    rmseChart.data.datasets = rmseDatasets;
    rmseChart.options.scales.y.ticks.callback = (v) => currentDataset === 'startups' ? '$' + (v / 1000).toFixed(0) + 'k' : v.toFixed(1);
    rmseChart.update();

    r2Chart.data.labels = labels;
    r2Chart.data.datasets = r2Datasets;
    r2Chart.update();
  }

  /**
   * Update Scatter Chart (with Top 10 Outliers) and Feature Impact Bar Chart
   */
  function updateDiagnosticCharts(step, cfg) {
    // 1. Scatter Chart: Guarantee ALL Top 10 Outliers are always plotted
    const top10OutliersList = (step.outliers || []).slice(0, 10);
    const outlierIndices = new Set(top10OutliersList.map(o => o.index));

    // Construct outlierData directly from the 10 outliers so none are skipped
    const outlierData = top10OutliersList.map(o => ({
      x: o.predicted,
      y: o.actual,
      index: o.index,
      rank: o.rank,
      state: (currentDataset === 'startups' ? `Startup #${o.index}` : `Town #${o.index}`),
      residual: o.residual
    }));

    const normalData = [];
    (step.all_points || []).forEach(p => {
      if (!outlierIndices.has(p.index)) {
        normalData.push({ x: p.predicted, y: p.actual, index: p.index, state: p.state, residual: p.residual });
      }
    });

    const allOutlierVals = outlierData.map(p => p.y).concat(outlierData.map(p => p.x));
    const allNormalVals = normalData.map(p => p.y).concat(normalData.map(p => p.x));
    const allVals = allNormalVals.concat(allOutlierVals);
    const minVal = Math.floor(Math.min(...allVals) * 0.9);
    const maxVal = Math.ceil(Math.max(...allVals) * 1.05);

    scatterChart.data.datasets = [
      {
        type: 'line',
        label: 'Perfect Fit (Actual = Predicted)',
        data: [{ x: minVal, y: minVal }, { x: maxVal, y: maxVal }],
        borderColor: 'rgba(255, 255, 255, 0.4)',
        borderWidth: 1.5,
        borderDash: [6, 6],
        pointRadius: 0,
        fill: false
      },
      {
        type: 'scatter',
        label: `Normal Samples (${cfg.name})`,
        data: normalData,
        backgroundColor: 'rgba(0, 240, 255, 0.75)',
        borderColor: '#00f0ff',
        pointRadius: currentDataset === 'startups' ? 5 : 3.5,
        pointHoverRadius: 7
      },
      {
        type: 'scatter',
        label: 'Top 10 Outliers',
        data: outlierData,
        backgroundColor: 'rgba(255, 0, 85, 0.85)',
        borderColor: '#ff0055',
        pointStyle: 'rectRot',
        pointRadius: 7.5,
        pointHoverRadius: 10
      }
    ];

    scatterChart.options.scales.x.title.text = `Predicted ${cfg.targetLabel}`;
    scatterChart.options.scales.y.title.text = `Actual ${cfg.targetLabel}`;
    scatterChart.options.scales.x.ticks.callback = (v) => currentDataset === 'startups' ? '$' + (v / 1000).toFixed(0) + 'k' : v.toFixed(0);
    scatterChart.options.scales.y.ticks.callback = (v) => currentDataset === 'startups' ? '$' + (v / 1000).toFixed(0) + 'k' : v.toFixed(0);

    scatterChart.options.plugins.tooltip.callbacks = {
      label: (ctx) => {
        const raw = ctx.raw;
        if (!raw.index && raw.index !== 0) return 'Reference Line';
        const rankPrefix = raw.rank ? `[★ Top #${raw.rank} 離群值] ` : '';
        if (currentDataset === 'startups') {
          return [
            `${rankPrefix}Startup #${raw.index} (${raw.state})`,
            `實際利潤: ${fmtCurrency(raw.y)}`,
            `模型預測: ${fmtCurrency(raw.x)}`,
            `預測殘差: ${raw.residual >= 0 ? '+' : ''}${fmtCurrency(raw.residual)}`
          ];
        } else {
          return [
            `${rankPrefix}城鎮樣本 #${raw.index}`,
            `實際房價: $${raw.y.toFixed(2)}k`,
            `模型預測: $${raw.x.toFixed(2)}k`,
            `預測殘差: ${raw.residual >= 0 ? '+' : ''}${raw.residual.toFixed(2)}k`
          ];
        }
      }
    };
    scatterChart.update();

    // 2. Feature Impact Bar Chart
    const featureCoefs = step.coefficients.filter(c => !c.feature.includes('Intercept'));
    coefChart.data.labels = featureCoefs.map(c => c.feature);
    coefChart.data.datasets = [{
      data: featureCoefs.map(c => c.coef),
      backgroundColor: featureCoefs.map(c => c.coef >= 0 ? 'rgba(0, 240, 255, 0.8)' : 'rgba(255, 0, 85, 0.8)'),
      borderColor: featureCoefs.map(c => c.coef >= 0 ? '#00f0ff' : '#ff0055'),
      borderWidth: 1,
      borderRadius: 6
    }];
    coefChart.update();
  }

  /**
   * Real-Time Live Simulator Prediction
   */
  function calculateLivePrediction() {
    const cfg = window.DATASETS_CONFIG[currentDataset];
    if (!cfg) return;

    const algoModels = cfg.models[currentAlgo];
    if (!algoModels) return;
    const modelStep = algoModels.find(s => s.k === currentK) || algoModels[0];

    const coefMap = {};
    modelStep.coefficients.forEach(c => { coefMap[c.feature] = c.coef; });
    const intercept = coefMap['Intercept (β₀)'] || 0;
    let predicted = intercept;

    const contributions = [
      { name: 'Baseline Intercept (β₀)', val: intercept, active: true, type: 'base' }
    ];

    if (currentDataset === 'startups') {
      const rd = parseFloat(document.getElementById('sliderRd').value);
      const admin = parseFloat(document.getElementById('sliderAdmin').value);
      const mkt = parseFloat(document.getElementById('sliderMarketing').value);
      const isFL = (currentStartupState === 'Florida') ? 1 : 0;
      const isNY = (currentStartupState === 'New York') ? 1 : 0;

      // R&D
      if (coefMap['R&D Spend'] !== undefined) {
        const v = coefMap['R&D Spend'] * rd;
        predicted += v;
        contributions.push({ name: 'R&D Spend Impact', val: v, active: true, type: v >= 0 ? 'pos' : 'neg' });
      } else {
        contributions.push({ name: 'R&D Spend', val: 0, active: false, note: 'Excluded in Model' });
      }

      // Marketing
      if (coefMap['Marketing Spend'] !== undefined) {
        const v = coefMap['Marketing Spend'] * mkt;
        predicted += v;
        contributions.push({ name: 'Marketing Spend Impact', val: v, active: true, type: v >= 0 ? 'pos' : 'neg' });
      } else {
        contributions.push({ name: 'Marketing Spend', val: 0, active: false, note: 'Excluded in Model' });
      }

      // Admin
      if (coefMap['Administration'] !== undefined) {
        const v = coefMap['Administration'] * admin;
        predicted += v;
        contributions.push({ name: 'Administration Impact', val: v, active: true, type: v >= 0 ? 'pos' : 'neg' });
      } else {
        contributions.push({ name: 'Administration', val: 0, active: false, note: 'Excluded in Model' });
      }

      // State Dummies
      if (coefMap['State_Florida'] !== undefined && isFL) {
        const v = coefMap['State_Florida'] * 1;
        predicted += v;
        contributions.push({ name: 'State: Florida Premium', val: v, active: true, type: v >= 0 ? 'pos' : 'neg' });
      }
      if (coefMap['State_New York'] !== undefined && isNY) {
        const v = coefMap['State_New York'] * 1;
        predicted += v;
        contributions.push({ name: 'State: New York Premium', val: v, active: true, type: v >= 0 ? 'pos' : 'neg' });
      }
      if (currentStartupState === 'California') {
        contributions.push({ name: 'State: California (Baseline)', val: 0, active: true, type: 'base' });
      }

      el.liveProfitVal.textContent = fmtCurrency(predicted);

      const medianStartups = 107978;
      const diffPct = ((predicted - medianStartups) / medianStartups) * 100;
      el.profitComparison.innerHTML = `
        <span style="color:${diffPct >= 0 ? 'var(--emerald-neon)' : 'var(--rose-neon)'}; font-weight:700">
          ${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)}%
        </span> 與歷史新創利潤中位數 ($107,978) 比較
      `;
    } else if (currentDataset === 'boston') {
      // Boston Housing (Dynamic Sliders for Top 10 Features)
      cfg.simulator.sliders.forEach(s => {
        const sliderInput = document.getElementById(s.id);
        if (sliderInput) {
          const val = parseFloat(sliderInput.value);
          if (coefMap[s.field] !== undefined) {
            const v = coefMap[s.field] * val;
            predicted += v;
            const shortName = s.label.split('(')[0].trim();
            contributions.push({ name: `${shortName} 影響`, val: v, active: true, type: v >= 0 ? 'pos' : 'neg' });
          } else {
            const shortName = s.label.split('(')[0].trim();
            contributions.push({ name: shortName, val: 0, active: false, note: '未納入當前模型' });
          }
        }
      });

      predicted = Math.max(5.0, predicted);
      el.liveProfitVal.textContent = `$${predicted.toFixed(2)}k`;

      const medianBoston = 21.2;
      const diffPct = ((predicted - medianBoston) / medianBoston) * 100;
      el.profitComparison.innerHTML = `
        折合約 <strong>$${Math.round(predicted * 1000).toLocaleString('en-US')} 美元</strong> 
        (<span style="color:${diffPct >= 0 ? 'var(--emerald-neon)' : 'var(--rose-neon)'}; font-weight:700">
          ${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)}%
        </span> 與波士頓房價中位數 $21.2k 比較)
      `;
    } else {
      // Custom Dataset
      (cfg.simulator.sliders || []).forEach(s => {
        const sliderInput = document.getElementById(s.id);
        if (sliderInput) {
          const val = parseFloat(sliderInput.value);
          if (coefMap[s.field] !== undefined) {
            const contribution = coefMap[s.field] * val;
            predicted += contribution;
            contributions.push({ name: `${s.field} 影響`, val: contribution, active: true, type: contribution >= 0 ? 'pos' : 'neg' });
          } else {
            contributions.push({ name: s.field, val: 0, active: false, note: '未納入模型' });
          }
        }
      });

      (cfg.simulator.categoricals || []).forEach(cat => {
        const colName = cat.column || cat.label || 'Feature';
        const catId = cat.id || `sim_cat_${colName.replace(/[^a-zA-Z0-9_]/g, '_')}`;
        const baseVal = cat.base || cat.baseline || (cat.levels && cat.levels[0] ? cat.levels[0].value : '');
        const sel = document.getElementById(catId);
        if (sel) {
          const chosen = sel.value;
          if (chosen === baseVal) {
            contributions.push({ name: `${colName}: ${chosen} (基準組)`, val: 0, active: true, type: 'base' });
          } else {
            const dummyCol = `${colName}_${chosen}`;
            if (coefMap[dummyCol] !== undefined) {
              const val = coefMap[dummyCol] * 1;
              predicted += val;
              contributions.push({ name: `${colName}: ${chosen}`, val: val, active: true, type: val >= 0 ? 'pos' : 'neg' });
            } else {
              contributions.push({ name: `${colName}: ${chosen}`, val: 0, active: false, note: '未納入模型' });
            }
          }
        }
      });

      const isLarge = Math.abs(predicted) > 1000;
      el.liveProfitVal.textContent = isLarge ? fmtNumber(predicted, 1) : fmtNumber(predicted, 2);
      el.profitComparison.innerHTML = `基於當前選取之 ${currentK} 個特徵與輸入參數即時估計值`;
    }

    // Render Waterfall Breakdown
    let wfHtml = '';
    contributions.forEach(c => {
      const valStr = currentDataset === 'startups' ? fmtCurrency(c.val) : Number(c.val).toFixed(2);
      if (c.active) {
        wfHtml += `
          <div class="waterfall-item">
            <span class="wf-name">${c.name}</span>
            <span class="wf-val ${c.type}">${c.val >= 0 ? '+' : ''}${valStr}</span>
          </div>
        `;
      } else {
        wfHtml += `
          <div class="waterfall-item" style="opacity:0.45">
            <span class="wf-name">${c.name}</span>
            <span class="wf-val" style="color:var(--text-dim)">$0 (${c.note})</span>
          </div>
        `;
      }
    });
    el.waterfallList.innerHTML = wfHtml;
  }

  /**
   * Setup Modal Structure & Search
   */
  function setupModal() {
    el.btnOpenDataset.addEventListener('click', () => {
      el.datasetModal.style.display = 'flex';
    });
    el.btnCloseDataset.addEventListener('click', () => {
      el.datasetModal.style.display = 'none';
    });
    window.addEventListener('click', (e) => {
      if (e.target === el.datasetModal) el.datasetModal.style.display = 'none';
    });
    el.datasetSearch.addEventListener('input', (e) => {
      filterModalDataset(e.target.value.toLowerCase());
    });
  }

  function renderModalStructure(cfg) {
    if (cfg.id === 'startups') {
      el.datasetModalHead.innerHTML = `
        <tr>
          <th>Index</th>
          <th>State</th>
          <th>R&amp;D Spend</th>
          <th>Administration</th>
          <th>Marketing Spend</th>
          <th>Actual Profit</th>
        </tr>
      `;
    } else if (cfg.id === 'boston') {
      el.datasetModalHead.innerHTML = `
        <tr>
          <th>Index</th>
          <th>CRIM</th>
          <th>RM</th>
          <th>AGE</th>
          <th>DIS</th>
          <th>TAX</th>
          <th>PTRATIO</th>
          <th>LSTAT</th>
          <th>MEDV (房價)</th>
        </tr>
      `;
    } else {
      // Custom columns
      const firstRow = cfg.records[0] || {};
      const cols = Object.keys(firstRow).slice(0, 8);
      let headHtml = '<tr>';
      cols.forEach(c => { headHtml += `<th>${c}</th>`; });
      headHtml += '</tr>';
      el.datasetModalHead.innerHTML = headHtml;
    }
    renderModalRows(cfg.records);
  }

  function renderModalRows(records) {
    let rowsHtml = '';
    const sample = records[0] || {};
    const cols = Object.keys(sample).slice(0, 8);

    records.slice(0, 100).forEach(r => {
      if (currentDataset === 'startups') {
        rowsHtml += `
          <tr>
            <td class="mono" style="color:var(--cyan-neon)">#${r.Index}</td>
            <td><span style="background:rgba(255,255,255,0.06); padding:2px 8px; border-radius:4px">${r.State}</span></td>
            <td class="mono" style="color:#fff">${fmtCurrency(r['R&D Spend'])}</td>
            <td class="mono" style="color:#94a3b8">${fmtCurrency(r['Administration'])}</td>
            <td class="mono" style="color:#94a3b8">${fmtCurrency(r['Marketing Spend'])}</td>
            <td class="mono" style="font-weight:700; color:var(--emerald-neon)">${fmtCurrency(r['Profit'])}</td>
          </tr>
        `;
      } else if (currentDataset === 'boston') {
        rowsHtml += `
          <tr>
            <td class="mono" style="color:var(--cyan-neon)">#${r.Index}</td>
            <td class="mono">${r.crim.toFixed(3)}</td>
            <td class="mono" style="font-weight:700; color:#fff">${r.rm.toFixed(2)}</td>
            <td class="mono">${r.age.toFixed(1)}</td>
            <td class="mono">${r.dis.toFixed(2)}</td>
            <td class="mono">${r.tax.toFixed(0)}</td>
            <td class="mono">${r.ptratio.toFixed(1)}</td>
            <td class="mono" style="color:var(--rose-neon)">${r.lstat.toFixed(2)}%</td>
            <td class="mono" style="font-weight:700; color:var(--emerald-neon)">$${r.medv.toFixed(1)}k</td>
          </tr>
        `;
      } else {
        rowsHtml += '<tr>';
        cols.forEach((c, idx) => {
          const val = r[c];
          const isNum = typeof val === 'number';
          rowsHtml += `<td class="mono" style="${idx === 0 ? 'color:var(--cyan-neon)' : idx === cols.length - 1 ? 'font-weight:700; color:var(--emerald-neon)' : ''}">${isNum ? (Math.abs(val) > 100 ? Math.round(val) : val.toFixed(2)) : val}</td>`;
        });
        rowsHtml += '</tr>';
      }
    });
    if (records.length > 100) {
      rowsHtml += `<tr><td colspan="${cols.length}" style="text-align:center; color:var(--text-dim); padding:12px">... 顯示前 100 筆紀錄（共 ${records.length} 筆）...</td></tr>`;
    }
    el.datasetTableBody.innerHTML = rowsHtml;
  }

  function filterModalDataset(query) {
    const cfg = window.DATASETS_CONFIG[currentDataset];
    if (!cfg) return;
    const filtered = cfg.records.filter(r => {
      return Object.values(r).some(val => String(val).toLowerCase().includes(query));
    });
    renderModalRows(filtered);
  }

})();
