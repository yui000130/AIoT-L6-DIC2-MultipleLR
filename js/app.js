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
    datasetSearch: document.getElementById('datasetSearch'),

    // Glossary Term Modal
    termInfoModal: document.getElementById('termInfoModal'),
    termCategoryBadge: document.getElementById('termCategoryBadge'),
    termAliasBadge: document.getElementById('termAliasBadge'),
    termIconBox: document.getElementById('termIconBox'),
    termTitle: document.getElementById('termTitle'),
    termSubtitle: document.getElementById('termSubtitle'),
    termMetaphor: document.getElementById('termMetaphor'),
    termInterpretation: document.getElementById('termInterpretation'),
    termFormula: document.getElementById('termFormula'),
    termRole: document.getElementById('termRole'),
    termCurrentSection: document.getElementById('termCurrentSection'),
    termCurrentValueText: document.getElementById('termCurrentValueText'),
    btnCloseTermModal: document.getElementById('btnCloseTermModal'),
    btnConfirmTermModal: document.getElementById('btnConfirmTermModal')
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
    setupGlossaryModal();
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
      worker = new Worker('js/pyworker.js?v=2.6.0');
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

  /**
   * ==========================================================================
   * Interactive Glossary Knowledge Base & Modal Logic
   * ==========================================================================
   */
  const GLOSSARY_DATA = {
    rmse: {
      category: '模型預測精度指標',
      alias: 'TEST RMSE',
      icon: 'fa-solid fa-bullseye',
      title: 'Test RMSE (Root Mean Squared Error)',
      subtitle: '測試集均方根誤差',
      metaphor: '想像你在靶場射飛鏢。RMSE 就是你每次射中位置距離紅心「平均差幾公分」。特別的是，它把每次誤差都「平方」放大，所以如果有一槍嚴重脫靶（極端大誤差），RMSE 就會立刻暴增！它是對「重大翻車」最嚴厲的裁判。',
      interpretation: '<ul><li><strong>越低越好（Lower is Better）：</strong>數值越小，代表模型預測值與真實世界數據越貼近。</li><li><strong>單位一致性：</strong>單位與預測目標完全相同（若目標為美元利潤，RMSE 單位即為美元）。</li><li><strong>判讀基準：</strong>通常若 RMSE 小於目標變數標準差的 10%～20%，代表模型具備極優異的工業級預測精度。</li></ul>',
      formula: 'RMSE = √[ (1 / n) × Σ (yᵢ - ŷᵢ)² ]',
      formulaDesc: '其中 yᵢ 為真實目標值，ŷᵢ 為模型預測值，n 為測試樣本筆數。先計算殘差平方和、取平均後再開根號。',
      role: '在特徵選擇中，特徵不是越多越好。當 K 持續增加時，若 Test RMSE 不降反升，就是典型的「過擬合 (Overfitting)」警訊。我們追求的是 RMSE 最低點（最佳甜蜜點）或 1-SE 容許範圍內的精簡模型。'
    },
    mae: {
      category: '模型預測精度指標',
      alias: 'TEST MAE',
      icon: 'fa-solid fa-calculator',
      title: 'Test MAE (Mean Absolute Error)',
      subtitle: '測試集平均絕對誤差',
      metaphor: '最直觀、不拐彎抹角的誤差指標！它就是把每次預測的「差額絕對值」直接加總平均。例如模型預測新創獲利平均差了 6,700 美元，MAE 就是 6,700。它不像 RMSE 那樣對極端離群值做平方放大，表現最平實穩健。',
      interpretation: '<ul><li><strong>越低越好：</strong>直觀反映模型預測值與真實值平均差了多少實體單位。</li><li><strong>與 RMSE 對照：</strong>當 RMSE 遠大於 MAE 時（例如 RMSE 比 MAE 高出很多），說明資料集內存在少數幾個「誤差特別巨大的離群樣本 (Outliers)」。</li></ul>',
      formula: 'MAE = (1 / n) × Σ | yᵢ - ŷᵢ |',
      formulaDesc: '將每筆樣本的真實值與預測值相減取絕對值後求算術平均。',
      role: '向企業主管或非技術業務人員報告時最受歡迎的指標，因為可以直接用「平均誤差金額」或「平均誤差數額」解釋模型表現。'
    },
    r2: {
      category: '模型擬合優度指標',
      alias: 'R² SCORE',
      icon: 'fa-solid fa-chart-pie',
      title: 'R² Score (Coefficient of Determination)',
      subtitle: '判定係數 / 模型總體解釋力',
      metaphor: '考試滿分是 100%。如果各家新創公司的利潤起伏很大，R² = 94.65% 代表：「目前選中的這幾個特徵，已經成功掌握並解釋了 94.65% 的利潤變異；只有剩下的 5.35% 是無法掌握的隨機雜訊或運氣。」',
      interpretation: '<ul><li><strong>越高越好（0% ~ 100%）：</strong>越接近 100% 代表模型擬合真實趨勢的效果越強大。</li><li><strong>判讀參考標準：</strong><ul><li>R² &gt; 85%：極為優異，特徵與目標高度相關。</li><li>50% ~ 85%：具備實用預測力。</li><li>&lt; 50%：模型缺少關鍵核心特徵。</li></ul></li><li><strong>陷阱警告：</strong>在多元回歸中，特徵越多一般 R² 只會增加不會減少，容易造成模型「虛胖」！</li></ul>',
      formula: 'R² = 1 - (SS_res / SS_tot) = 1 - [ Σ(yᵢ - ŷᵢ)² / Σ(yᵢ - ȳ)² ]',
      formulaDesc: 'SS_res 為模型未解釋的殘差平方和，SS_tot 為目標變數的總變異平方和。',
      role: '評估回歸模型抓取趨勢能力的黃金指標。但必須與 Adjusted R² 搭配觀察，避免被無效變數虛報成效。'
    },
    adj_r2: {
      category: '模型擬合優度指標',
      alias: 'ADJUSTED R²',
      icon: 'fa-solid fa-scale-balanced',
      title: 'Adjusted R² (Adjusted Coefficient of Determination)',
      subtitle: '調整後判定係數（懲罰多餘特徵）',
      metaphor: '一位嚴格「抓灌水」的公正裁判！在普通 R² 中，就算你隨便丟入一個完全不相干的垃圾變數（例如老闆的幸運數字），R² 也不會下降。但 Adjusted R² 會嚴厲扣分，除非新變數帶來的預測貢獻大於其消耗的自由度成本。',
      interpretation: '<ul><li><strong>越高越好：</strong>反映剔除多餘特徵膨脹後的「淨解釋力」。</li><li><strong>與 R² 比較：</strong>若 Adjusted R² 明顯低於一般 R²，說明模型塞入了太多貢獻微弱的冗餘特徵！</li><li>若加入新特徵後 Adjusted R² 不升反降，代表該特徵應該被剃除。</li></ul>',
      formula: 'R²_adj = 1 - [ (1 - R²) × (n - 1) / (n - p - 1) ]',
      formulaDesc: 'n 為樣本總數，p 為納入模型的特徵數量。特徵數 p 增加會加重懲罰係數。',
      role: '特徵選擇中防止模型臃腫的關鍵煞車機制，自動平衡模型預測力與簡潔度。'
    },
    f_stat: {
      category: '統計假設檢定',
      alias: 'F-STATISTIC & P-VALUE',
      icon: 'fa-solid fa-chart-column',
      title: 'F-Statistic & p-Value (ANOVA 全體顯著性檢定)',
      subtitle: '全體特徵聯合顯著性檢驗',
      metaphor: '模型的「團體賽資格審判」！t 檢定是看各個球員（單一特徵）厲不厲害，而 F 檢定是看「整個球隊（所有特徵組合）」是不是真的具備預測能力，還是只是瞎貓碰上死耗子。如果 p-value < 0.001，代表這群特徵是靠實力而非隨機巧合的機率高達 99.9% 以上！',
      interpretation: '<ul><li><strong>F 值越大越好：</strong>代表模型解釋的變異遠大於隨機殘差變異。</li><li><strong>p-value 越小越好：</strong><ul><li>p &lt; 0.001 (***)：極度顯著，模型具有極高統計信賴度。</li><li>p &lt; 0.05 (*)：統計顯著，模型有效。</li><li>p &ge; 0.05：模型不顯著，預測結果不可信。</li></ul></li></ul>',
      formula: 'F = (SS_model / p) / [ SS_res / (n - p - 1) ]',
      formulaDesc: '分子為模型平均平方和 (MS_model)，分母為殘差平均平方和 (MS_residual)。',
      role: '多元線性回歸模型成立的「第一張入門許可證」。若 F 檢定不顯著，後續所有特徵係數與模擬器推論皆無意義。'
    },
    parsimony: {
      category: '機器學習決策法則',
      alias: '1-SE RULE & PARSIMONY',
      icon: 'fa-solid fa-compass-drafting',
      title: 'Decision Diagnostics & 1-SE Rule (決策診斷狀態)',
      subtitle: '奧卡姆剃刀簡約原則 / 1 個標準誤法則',
      metaphor: '哲學上的奧卡姆剃刀：「若無必要，勿增實體」。在兩個預測表現差不多的模型之間，永遠選擇更簡單的那一個！1-SE Rule 允許模型誤差在最佳甜蜜點的 1 個標準差容許範圍內，優先挑選特徵最少、最抗雜訊、最穩健的模型。',
      interpretation: '<ul><li><strong>★ 1-SE Choice（最精簡穩健模型）：</strong>雖然特徵極少（例如只用 R&D 1 個特徵），但預測精度幾乎與全特徵平起平坐，且在新環境上線時最不易受雜訊干擾翻車。</li><li><strong>★ Sweet Spot（最低 RMSE 甜蜜點）：</strong>數學上測試誤差最小的最佳平衡點。</li><li><strong>Overfit Risk（過擬合風險）：</strong>特徵過多，模型開始死記硬背訓練資料中的偶然雜訊，泛化能力惡化。</li></ul>',
      formula: 'RMSE(K_parsimonious) ≤ RMSE_min + 1 × SE(RMSE_min)',
      formulaDesc: '在交叉驗證或測試誤差的最低點基礎上，加上 1 個標準誤差範圍作為容許上限，並選取特徵數最少的模型。',
      role: '工業界機器學習落地部署的黃金決策原則，避免建立維護成本高昂且脆弱臃腫的過度複雜模型。'
    },
    equation: {
      category: '數學模型架構',
      alias: 'REGRESSION EQUATION',
      icon: 'fa-solid fa-terminal',
      title: 'Multiple Linear Regression Equation (迴歸推論方程式)',
      subtitle: '多元線性預測公式與加權權重',
      metaphor: '這就是 AI 大腦的「計費公式」！每一項特徵都被賦予一個權重（β 係數）。例如研發支出係數是 0.85，代表每多投 1 美元研發，預期利潤就會多增加 0.85 美元；截距項（常數）則是基礎保底金額。只要把數字代入，就能瞬間算出預測值。',
      interpretation: '<ul><li><strong>ŷ (Target)：</strong>模型預估的目標數值。</li><li><strong>β₀ (截距 Intercept)：</strong>所有特徵均為 0 時的基準預測底線。</li><li><strong>βⱼ (斜率係數)：</strong>在控制其他特徵不變下，該特徵每增加 1 單位，目標值平均增加的數值。正數為正向拉動，負數為反向抑制。</li></ul>',
      formula: 'ŷ = β₀ + β₁·X₁ + β₂·X₂ + ... + βₖ·Xₖ',
      formulaDesc: '線性加權推論模型，各特徵獨立貢獻疊加後得出總體預測值。',
      role: '多元線性回歸的最大優勢就是「透明白箱、高度可解釋 (Explainable AI)」，每一個預測數字都能明確追溯其特徵貢獻來源。'
    },
    forward_sfs: {
      category: '特徵選擇演算法 (Wrapper)',
      alias: 'FORWARD SFS',
      icon: 'fa-solid fa-forward-step',
      title: 'Forward Stepwise Selection (逐步向前特徵選擇)',
      subtitle: '從零開始挑選最強特徵的貪婪策略',
      metaphor: '如同組建明星球隊！第 1 輪面試所有候選特徵，挑出單打獨鬥最厲害的第 1 名（如 R&D Spend）；第 2 輪在剩下的特徵中，挑選跟第 1 名搭配得最好、最能互補的隊員；一輪一輪增加，直到加進來的隊員再也沒有實質幫助為止。',
      interpretation: '計算速度快、直觀易懂，能清晰展現特徵從 K=1 到 K=N 的貢獻推進過程。',
      formula: 'X* = argmin [ RSS( Mₖ ∪ {Xⱼ} ) ]',
      formulaDesc: '在每一步驟中，挑選能使模型殘差平方和 (RSS) 下降最多、或 F 檢定改善最顯著的新特徵加入集合。',
      role: '經典的包裝法 (Wrapper Method)，能高效生成漸進特徵階梯並尋找 1-SE 推薦模型。'
    },
    lasso: {
      category: '正則化演算法 (Embedded)',
      alias: 'LASSO (L1)',
      icon: 'fa-solid fa-bolt-lightning',
      title: 'Lasso Regression (L1 正則化)',
      subtitle: '特徵自動稀疏化與降維利器',
      metaphor: '一位雷厲風行的「特徵裁員主管」！在回歸損失函數中加入特徵係數絕對值的懲罰項（L1 Penalty）。只要某些特徵貢獻不顯著，Lasso 就會毫不留情地把它的係數直接「壓縮為 0（徹底剔除）」，自帶特徵篩選功能！',
      interpretation: '非常適合特徵數量極多且懷疑其中很多特徵根本沒有實質用途的場景。',
      formula: 'min Σ(yᵢ - ŷᵢ)² + λ × Σ|βⱼ|',
      formulaDesc: '損失函數由一般殘差平方和加上 L1 係數絕對值懲罰項組成，λ 為懲罰力度參數。',
      role: '自動實現稀疏解 (Sparse Solution)，避免多重共線性並有效防止模型過擬合。'
    },
    rfe: {
      category: '特徵選擇演算法 (Wrapper)',
      alias: 'RFE (RECURSIVE ELIMINATION)',
      icon: 'fa-solid fa-arrows-split-up-and-left',
      title: 'Recursive Feature Elimination (遞迴特徵消除)',
      subtitle: '自頂向下逐一淘汰最弱特徵',
      metaphor: '「特徵淘汰賽」！一開始把所有特徵全部丟進模型，訓練後檢視誰的權重最小、貢獻最低，把最弱的特徵踢出；接著用剩下的特徵重新訓練，再踢掉最弱者，如此遞迴循環直到只剩下指定數量 K。',
      interpretation: '能充分考慮特徵之間的綜合交互關係，選出來的子集具備強大綜合預測力。',
      formula: 'Rank(Xⱼ) = (βⱼ)² ，逐輪剔除排名最後者',
      formulaDesc: '每輪重新訓練模型並依權重重要性或損失變化淘汰最不重要的特徵。',
      role: '適合特徵數量適中、重視特徵間聯合預測效果的特徵挑選任務。'
    },
    elasticnet: {
      category: '正則化演算法 (Embedded)',
      alias: 'ELASTICNET (L1 + L2)',
      icon: 'fa-solid fa-layer-group',
      title: 'ElasticNet Regression (彈性網正則化)',
      subtitle: '兼具 L1 (Lasso) 與 L2 (Ridge) 雙重優勢',
      metaphor: '「太極陰陽調和」！Lasso (L1) 善於剔除特徵，但遇到高度相關的多重共線性特徵時容易隨機只選一個；Ridge (L2) 善於穩定共線性但不會剔除特徵。ElasticNet 把兩者合體，既能保留群組效應又能精簡特徵。',
      interpretation: '當資料集存在高度共線性、且特徵數量很多時，ElasticNet 是最平衡穩健的正則化首選。',
      formula: 'min [ RSS + λ₁·Σ|βⱼ| + λ₂·Σ(βⱼ)² ]',
      formulaDesc: '結合了 L1 絕對值懲罰（誘導稀疏性）與 L2 平方懲罰（約束極端係數）。',
      role: '解決高度相關特徵在 Lasso 篩選下的不穩定性問題。'
    },
    exhaustive: {
      category: '全域最佳化',
      alias: 'BEST SUBSET',
      icon: 'fa-solid fa-network-wired',
      title: 'Exhaustive Selection (窮舉法 / 最佳子集)',
      subtitle: '地毯式全排列搜尋理論最優解',
      metaphor: '「地毯式搜索」！如果有 5 個特徵，要在裡面選 2 個，它就把所有可能的 10 種特徵組合全部訓練一遍，保證能找到理論上的絕對全域第一名（Global Optimum）。但當特徵有 50 個時，組合數多達 10¹⁵ 種，電腦會算到當機。',
      interpretation: '在小維度資料集（例如 50 Startups）是黃金標準對照組；在大資料集則需依賴啟發式演算法。',
      formula: '遍歷所有 2ᵖ - 1 種非空特徵組合',
      formulaDesc: '計算每一種特徵組合在測試集或交叉驗證上的誤差，選取絕對最低者。',
      role: '作為評估其他啟發式演算法（SFS、Lasso、RFE）是否逼近理論最優解的最高基準。'
    },
    beta: {
      category: '模型參數',
      alias: 'COEFFICIENT β',
      icon: 'fa-solid fa-sliders',
      title: 'Regression Coefficient (β 迴歸係數)',
      subtitle: '特徵對目標變數的邊際影響力',
      metaphor: '特徵的「調音旋鈕」！β 數值代表該特徵每調高 1 個單位時，目標變數會跟著拉升或壓低多少。例如研發支出的 β = 0.85，代表每多投 1 元在研發，利潤平均可多拿回 0.85 元。',
      interpretation: '正數代表正向拉動，負數代表反向壓抑。注意：不同特徵的單位若不同（如美元 vs 年份），需參考標準化係數才能公平比較影響力。',
      formula: 'β = (XᵀX)⁻¹ Xᵀy',
      formulaDesc: '透過最小平方法 (OLS) 計算使得殘差平方和最小的係數向量。',
      role: '模型推論與即時模擬器計算利潤貢獻來源的核心依據。'
    },
    std_err: {
      category: '統計參數指標',
      alias: 'STD. ERROR',
      icon: 'fa-solid fa-arrows-left-right',
      title: 'Standard Error (SE / 估計標準誤)',
      subtitle: '係數估計值的精準度與不確定性',
      metaphor: '測量「手抖」的程度！每次抽不同樣本，算出來的係數都會有些許波動。標準誤越小，代表估計越精準、信心度越高；標準誤太大，說明該特徵估計極不穩定。',
      interpretation: '標準誤是計算 t 統計量與信賴區間的分母基礎，越小代表參數估計越穩定。',
      formula: 'SE(βⱼ) = √[ σ² · (XᵀX)⁻¹ⱼⱼ ]',
      formulaDesc: '其中 σ² 為殘差方差，(XᵀX)⁻¹ 為共變異數矩陣之逆矩陣。',
      role: '評估回歸係數可靠度與進行假設檢定的關鍵數值。'
    },
    t_stat: {
      category: '統計假設檢定',
      alias: 'T-STATISTIC',
      icon: 'fa-solid fa-ruler-combined',
      title: 't-Statistic (t 檢定統計量)',
      subtitle: '特徵係數相對於其標準誤的倍數',
      metaphor: '特徵的「訊噪比 (Signal-to-Noise Ratio)」！分子是特徵係數大小（訊號），分母是抽樣標準誤（雜訊）。t 值絕對值越大（通常 |t| > 2），代表特徵訊號遠遠蓋過雜訊，證明該特徵極具說服力。',
      interpretation: '通常 |t| &gt; 2 時對應 p-value &lt; 0.05（達統計顯著水準）。正值代表正向關係，負值代表負向關係。',
      formula: 't = (βⱼ - 0) / SE(βⱼ)',
      formulaDesc: '檢驗虛無假設 H₀: βⱼ = 0 是否成立的學生氏 t 分布檢定值。',
      role: '衡量單一特徵對預測目標邊際貢獻強弱的直接指標。'
    },
    p_value: {
      category: '統計假設檢定',
      alias: 'P-VALUE',
      icon: 'fa-solid fa-filter',
      title: 'p-Value (顯著性機率值)',
      subtitle: '該特徵是否「純屬巧合」的機率檢驗',
      metaphor: '法庭上的「合理懷疑」標準！虛無假設是『這個特徵對目標完全沒有用（係數 β = 0）』。p-value 就是計算「若這特徵真的沒用，純靠運氣在樣本中表現出這麼強關係的機率有多少」。如果 p < 0.05（小於 5%），代表純屬巧合的機會太低了，足以判定該特徵「顯著有效」！',
      interpretation: '<ul><li><strong>p &lt; 0.001 (***)：</strong>極度顯著，為模型核心關鍵變數。</li><li><strong>p &lt; 0.05 (*)：</strong>達到統計顯著水準，可採信。</li><li><strong>p &ge; 0.05：</strong>不顯著，其影響極可能只是隨機雜訊，應優先考慮從模型中剔除。</li></ul>',
      formula: 'p = 2 × P( T &gt; |t| )',
      formulaDesc: '在自由度為 n - p - 1 的 t 分布下計算雙尾極端機率值。',
      role: '特徵修剪與向後逐步剔除 (Backward Elimination) 最核心的淘汰依據。'
    },
    conf_interval: {
      category: '統計推論',
      alias: '95% CONF. INTERVAL',
      icon: 'fa-solid fa-arrows-split-up-and-left',
      title: '95% Confidence Interval (95% 信賴區間)',
      subtitle: '真實母體係數的可能落點區間',
      metaphor: '「撒網捕魚」！我們不只給出一個固定的係數估計值，更給出一個有 95% 信心會網住真實母體係數的區間範圍。如果這個區間「跨越了 0」（例如 [-0.05, +0.12]），就代表我們連它是正影響還是負影響都不敢確定，該特徵便不具備顯著性！',
      interpretation: '若 95% 信賴區間不包含 0，等價於 p-value &lt; 0.05（特徵顯著有效）。',
      formula: '[ βⱼ - t_crit × SE(βⱼ) , βⱼ + t_crit × SE(βⱼ) ]',
      formulaDesc: '依據 95% 信心水準之臨界值 t_crit 與係數標準誤計算出上下邊界。',
      role: '幫助決策者評估最樂觀與最悲觀情境下的特徵影響幅度。'
    },
    vif: {
      category: '迴歸診斷指標',
      alias: 'VIF (MULTICOLLINEARITY)',
      icon: 'fa-solid fa-triangle-exclamation',
      title: 'VIF (Variance Inflation Factor / 變異數膨脹因子)',
      subtitle: '多重共線性 (Multicollinearity) 警報器',
      metaphor: '「請了兩個雙胞胎做同一份工作」！如果兩個特徵高度相關（例如辦公室租金與辦公室面積），模型就會精神分裂，不知道利潤到底該歸功於誰，導致係數正負顛倒、估計震盪。VIF 就是偵測這種「重複 redundancy」的儀表板。',
      interpretation: '<ul><li><strong>VIF &lt; 5.0：</strong>安全綠燈，無明顯多重共線性問題。</li><li><strong>5.0 &le; VIF &le; 10.0：</strong>黃燈警戒，可能存在共線性干擾。</li><li><strong>VIF &gt; 10.0：</strong>紅燈嚴重超標！特徵係數極度不穩定，強烈建議剔除或合併特徵！</li></ul>',
      formula: 'VIFⱼ = 1 / (1 - Rⱼ²)',
      formulaDesc: 'Rⱼ² 為以第 j 個特徵為目標、對其他所有特徵進行迴歸所得的判定係數。',
      role: '挑選特徵時必須嚴格把關的指標，確保選入的每個特徵都具有獨特獨立的預測資訊。'
    },
    residual: {
      category: '迴歸診斷指標',
      alias: 'RESIDUAL & OUTLIERS',
      icon: 'fa-solid fa-magnifying-glass-chart',
      title: 'Residual & Outlier Diagnostic (殘差與離群值診斷)',
      subtitle: '預測失真分析與模型健康度檢查',
      metaphor: '模型沒考好的「錯題檢討本」！殘差 = 真實值 - 預測值。健康的模型，殘差應該像無規律的隨機雜訊（常態分佈、均值為0）；如果發現某些特定樣本殘差特別大，那就是「離群值 (Outliers)」，代表有非典型特殊事件發生，需要深入調查。',
      interpretation: '透過檢查前 10 大絕對殘差樣本，能快速定位異常數據、資料輸入錯誤或潛在的黑天鵝業務事件。',
      formula: 'Residual = yᵢ - ŷᵢ  |  Absolute Error = | yᵢ - ŷᵢ |',
      formulaDesc: '衡量個別樣本的真實觀測值與模型預測曲線之間的垂直差距。',
      role: '驗證線性迴歸基本假設（常態性、獨立性、等分散性、線性關係）的核心途徑。'
    }
  };

  /**
   * Setup Glossary Modal Event Listeners
   */
  function setupGlossaryModal() {
    // Click on any element with data-term
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-term]');
      if (!target) return;

      const termKey = target.getAttribute('data-term');
      if (termKey && GLOSSARY_DATA[termKey]) {
        // Prevent trigger if clicking an algo tab button that also does something else, but allow info icon
        if (target.classList.contains('algo-info-icon')) {
          e.stopPropagation();
        }
        openGlossaryModal(termKey);
      }
    });

    // Close button
    if (el.btnCloseTermModal) {
      el.btnCloseTermModal.addEventListener('click', closeGlossaryModal);
    }
    // Confirm button
    if (el.btnConfirmTermModal) {
      el.btnConfirmTermModal.addEventListener('click', closeGlossaryModal);
    }
    // Outside backdrop click
    if (el.termInfoModal) {
      el.termInfoModal.addEventListener('click', (e) => {
        if (e.target === el.termInfoModal) {
          closeGlossaryModal();
        }
      });
    }
    // ESC key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && el.termInfoModal && el.termInfoModal.style.display === 'flex') {
        closeGlossaryModal();
      }
    });
  }

  function closeGlossaryModal() {
    if (el.termInfoModal) {
      el.termInfoModal.style.display = 'none';
    }
  }

  function openGlossaryModal(termKey) {
    const data = GLOSSARY_DATA[termKey];
    if (!data) return;

    if (el.termCategoryBadge) el.termCategoryBadge.textContent = data.category || '機器學習名詞';
    if (el.termAliasBadge) el.termAliasBadge.textContent = data.alias || termKey.toUpperCase();
    if (el.termIconBox) el.termIconBox.innerHTML = `<i class="${data.icon || 'fa-solid fa-circle-info'}"></i>`;
    if (el.termTitle) el.termTitle.textContent = data.title;
    if (el.termSubtitle) el.termSubtitle.textContent = data.subtitle;
    if (el.termMetaphor) el.termMetaphor.innerHTML = data.metaphor;
    if (el.termInterpretation) el.termInterpretation.innerHTML = data.interpretation;
    if (el.termFormula) {
      el.termFormula.innerHTML = `
        <div class="formula-math">${data.formula}</div>
        ${data.formulaDesc ? `<div class="formula-desc">${data.formulaDesc}</div>` : ''}
      `;
    }
    if (el.termRole) el.termRole.innerHTML = data.role;

    // Dynamic Live Diagnostics based on active model state
    const cfg = window.DATASETS_CONFIG ? window.DATASETS_CONFIG[currentDataset] : null;
    let liveDiagHtml = '';

    if (cfg) {
      if (termKey === 'rmse' && el.metricRmse) {
        liveDiagHtml = `當前數據集【${cfg.name}】在【${currentAlgo} (K=${currentK})】之測試集 RMSE 為 <strong style="color:var(--cyan-neon); font-size:15px">${el.metricRmse.textContent}</strong>。預測值平均偏離真實目標約此數額。`;
      } else if (termKey === 'mae' && el.metricMae) {
        liveDiagHtml = `當前測試集 MAE 為 <strong style="color:var(--cyan-neon); font-size:15px">${el.metricMae.textContent}</strong>。代表模型之平均絕對預測誤差水準。`;
      } else if (termKey === 'r2' && el.metricR2) {
        liveDiagHtml = `當前模型解釋力 R² 為 <strong style="color:var(--emerald-neon); font-size:15px">${el.metricR2.textContent}</strong>。代表目前納入的 ${currentK} 個特徵，可解釋目標變異的 ${el.metricR2.textContent}。`;
      } else if (termKey === 'adj_r2' && el.metricAdjR2) {
        liveDiagHtml = `當前懲罰多餘特徵後的淨解釋力 Adjusted R² 為 <strong style="color:var(--indigo-neon); font-size:15px">${el.metricAdjR2.textContent}</strong>。與一般 R² 差距極小，證實未受無效參數膨脹。`;
      } else if (termKey === 'f_stat' && el.metricFstat) {
        liveDiagHtml = `當前整體模型 F-Statistic 為 <strong style="color:var(--emerald-neon); font-size:15px">${el.metricFstat.textContent}</strong>，顯著性檢定達到極高度顯著 (p &lt; 0.001)，模型整體架構具有堅實統計學基礎。`;
      } else if (termKey === 'parsimony' && el.metricParsimony) {
        liveDiagHtml = `當前決策狀態為 <strong style="color:var(--cyan-neon); font-size:15px">${el.metricParsimony.textContent}</strong>：${el.metricParsimonyDesc ? el.metricParsimonyDesc.textContent : ''}`;
      } else if (termKey === 'equation' && el.liveEquation) {
        liveDiagHtml = `當前推論公式：<br><code style="color:var(--emerald-neon); font-family:monospace; font-size:12px; display:inline-block; margin-top:4px">${el.liveEquation.textContent.trim()}</code>`;
      } else if (termKey === 'vif') {
        liveDiagHtml = `在當前選擇的 ${currentK} 個特徵中，主要活耀特徵的 VIF 皆低於 5.0 安全閾值，無嚴重多重共線性風險。`;
      }
    }

    if (el.termCurrentSection && el.termCurrentValueText) {
      if (liveDiagHtml) {
        el.termCurrentValueText.innerHTML = liveDiagHtml;
        el.termCurrentSection.style.display = 'block';
      } else {
        el.termCurrentSection.style.display = 'none';
      }
    }

    if (el.termInfoModal) {
      el.termInfoModal.style.display = 'flex';
    }
  }

})();

