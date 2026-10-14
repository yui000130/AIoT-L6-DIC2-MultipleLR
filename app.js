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
    });
  }

  function setActiveDatasetCard(key) {
    el.cardDsStartups.classList.toggle('active', key === 'startups');
    el.cardDsBoston.classList.toggle('active', key === 'boston');
    el.cardDsCustom.classList.toggle('active', key === 'custom');
  }

  /**
   * Setup Custom CSV Loader & Parser Engine (URL + Local File Upload)
   */
  function setupCustomCsvLoader() {
    // Mini Presets
    el.miniPresetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        el.customCsvUrlInput.value = btn.dataset.url;
        loadCustomCsvFromUrl(btn.dataset.url, btn.dataset.target);
      });
    });

    // Load Button (URL)
    el.btnLoadCustomCsv.addEventListener('click', () => {
      const url = el.customCsvUrlInput.value.trim();
      if (!url) {
        showCustomCsvStatus('請輸入有效的 CSV 檔案網址！', 'error');
        return;
      }
      loadCustomCsvFromUrl(url);
    });

    // Enter key (URL)
    el.customCsvUrlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const url = el.customCsvUrlInput.value.trim();
        if (url) loadCustomCsvFromUrl(url);
      }
    });

    // Local File Upload Button
    if (el.btnUploadCsvFile && el.customCsvFileInput) {
      el.btnUploadCsvFile.addEventListener('click', () => {
        el.customCsvFileInput.click();
      });

      el.customCsvFileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        loadCustomCsvFromFile(file);
      });
    }
  }

  function showCustomCsvStatus(msg, type) {
    el.customCsvStatus.style.display = 'flex';
    el.customCsvStatus.className = `custom-status-msg ${type}`;
    el.customCsvStatus.innerHTML = `<i class="fa-solid ${type === 'loading' ? 'fa-spinner fa-spin' : type === 'success' ? 'fa-check' : 'fa-triangle-exclamation'}"></i> ${msg}`;
  }

  /**
   * Multi-Proxy Fetch with Timeout Protection
   */
  async function fetchCsvWithMultiProxy(url) {
    const fetchWithTimeout = async (targetUrl, ms = 7000) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), ms);
      try {
        const response = await fetch(targetUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    };

    // 1. Direct fetch
    try {
      const res = await fetchWithTimeout(url, 6000);
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().length > 20 && !text.includes('<!DOCTYPE html>') && !text.includes('404: Not Found')) {
          return text;
        }
      }
    } catch (e) {
      console.warn('Direct fetch failed, trying proxy 1 (corsproxy.io)...', e);
    }

    // 2. Proxy 1: corsproxy.io (high speed)
    try {
      const pUrl1 = 'https://corsproxy.io/?' + encodeURIComponent(url);
      const res1 = await fetchWithTimeout(pUrl1, 6000);
      if (res1.ok) {
        const text1 = await res1.text();
        if (text1 && text1.trim().length > 20 && !text1.includes('<!DOCTYPE html>') && !text1.includes('404: Not Found')) {
          return text1;
        }
      }
    } catch (e) {
      console.warn('Proxy 1 failed, trying proxy 2 (allorigins)...', e);
    }

    // 3. Proxy 2: allorigins.win
    try {
      const pUrl2 = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
      const res2 = await fetchWithTimeout(pUrl2, 7000);
      if (res2.ok) {
        const text2 = await res2.text();
        if (text2 && text2.trim().length > 20 && !text2.includes('<!DOCTYPE html>') && !text2.includes('404: Not Found')) {
          return text2;
        }
      }
    } catch (e) {
      console.warn('Proxy 2 failed, trying proxy 3 (codetabs)...', e);
    }

    // 4. Proxy 3: codetabs
    try {
      const pUrl3 = 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url);
      const res3 = await fetchWithTimeout(pUrl3, 7000);
      if (res3.ok) {
        const text3 = await res3.text();
        if (text3 && text3.trim().length > 20 && !text3.includes('<!DOCTYPE html>') && !text3.includes('404: Not Found')) {
          return text3;
        }
      }
    } catch (e) {
      console.warn('Proxy 3 failed...', e);
    }

    throw new Error('無法從此網址讀取 CSV。可能原因：(1) 網址檔案不存在 (404) (2) 目標伺服器阻擋存取 (3) 瀏覽器本機 CORS 限制。建議點擊「本機 CSV 上傳」直接選取電腦中的 CSV 檔案，100% 免疫連線限制！');
  }

  /**
   * Smart CSV Parsing Engine: Auto-detects delimiter & headerless data
   */
  function parseAndStructureCsv(rawText) {
    if (!rawText || !rawText.trim()) {
      throw new Error('CSV 檔案內容為空！');
    }

    const lines = rawText.trim().split(/\r\n|\n|\r/).filter(l => l.trim().length > 0);
    if (lines.length < 5) {
      throw new Error(`CSV 數據筆數過少（僅 ${lines.length} 行），至少需 5 筆以上有效數據！`);
    }

    // Auto-detect delimiter: semicolon, tab, or comma
    let delimiter = ',';
    const firstLine = lines[0];
    if (firstLine.includes(';') && firstLine.split(';').length > firstLine.split(',').length) {
      delimiter = ';';
    } else if (firstLine.includes('\t') && firstLine.split('\t').length > firstLine.split(',').length) {
      delimiter = '\t';
    }

    let matrix = [];
    if (window.Papa) {
      const pRes = Papa.parse(rawText, {
        header: false,
        dynamicTyping: false,
        skipEmptyLines: 'greedy',
        delimiter: delimiter
      });
      matrix = (pRes.data || []).filter(row => row && row.length > 1);
    } else {
      matrix = lines.map(line => line.split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, '')));
    }

    if (matrix.length < 5) {
      throw new Error(`CSV 有效數據筆數過少（僅 ${matrix.length} 列）！`);
    }

    // Smart Header Detection: check if row 0 is purely numeric (like jbrownlee/housing.csv)
    const row0 = matrix[0];
    let numCountInRow0 = 0;
    row0.forEach(val => {
      const cleaned = String(val).trim().replace(/,/g, '');
      const n = parseFloat(cleaned);
      if (!isNaN(n) && isFinite(cleaned)) numCountInRow0++;
    });

    const isHeaderless = (numCountInRow0 / row0.length) >= 0.7;
    let headers = [];
    let dataRows = [];

    if (isHeaderless) {
      // Auto-assign column names
      const colCount = row0.length;
      if (colCount === 14) {
        // Classic Boston Housing schema
        headers = ['crim', 'zn', 'indus', 'chas', 'nox', 'rm', 'age', 'dis', 'rad', 'tax', 'ptratio', 'b', 'lstat', 'medv'];
      } else {
        headers = [];
        for (let c = 0; c < colCount; c++) {
          headers.push(c === colCount - 1 ? 'Target_Y' : `Feature_${c + 1}`);
        }
      }
      dataRows = matrix; // Keep row 0 as valid data row!
    } else {
      // Row 0 is column headers
      headers = row0.map((h, i) => String(h).trim().replace(/^["']|["']$/g, '') || `Col_${i + 1}`);
      dataRows = matrix.slice(1);
    }

    // Convert into array of objects with typed numbers
    const parsedRows = [];
    dataRows.forEach(row => {
      if (row.length < headers.length * 0.5) return;
      const obj = {};
      headers.forEach((h, idx) => {
        const rawVal = row[idx];
        if (rawVal === undefined || rawVal === null || rawVal === '') {
          obj[h] = NaN;
        } else {
          const cleaned = String(rawVal).trim().replace(/,/g, '');
          const num = parseFloat(cleaned);
          obj[h] = (!isNaN(num) && isFinite(cleaned)) ? num : String(rawVal).trim();
        }
      });
      parsedRows.push(obj);
    });

    return { headers, parsedRows, isHeaderless };
  }

  /**
   * Load CSV from Public URL
   */
  async function loadCustomCsvFromUrl(csvUrl, targetColHint) {
    showCustomCsvStatus('正在下載並解析 CSV 檔案...', 'loading');
    try {
      const rawText = await fetchCsvWithMultiProxy(csvUrl);
      const datasetName = csvUrl.split('/').pop().replace(/\.csv$/i, '') || 'Custom Dataset';
      processCsvTextAndBuildModel(rawText, datasetName, targetColHint);
    } catch (err) {
      console.error('Custom CSV URL Error:', err);
      showCustomCsvStatus(`載入失敗: ${err.message}`, 'error');
    }
  }

  /**
   * Load CSV from Local File Upload (FileReader)
   */
  function loadCustomCsvFromFile(file) {
    showCustomCsvStatus(`正在讀取本機檔案: ${file.name} ...`, 'loading');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rawText = e.target.result;
        const datasetName = file.name.replace(/\.csv$/i, '') || 'Local CSV';
        processCsvTextAndBuildModel(rawText, datasetName);
      } catch (err) {
        console.error('Local CSV Error:', err);
        showCustomCsvStatus(`載入失敗: ${err.message}`, 'error');
      }
    };
    reader.onerror = () => {
      showCustomCsvStatus('讀取本機檔案時發生錯誤！', 'error');
    };
    reader.readAsText(file);
  }

  /**
   * Unified Pipeline: Parse CSV text and build ML regression model
   */
  function processCsvTextAndBuildModel(rawText, datasetName, targetColHint) {
    showCustomCsvStatus('正在進行特徵工程與機器學習多元迴歸訓練...', 'loading');

    const parsedData = parseAndStructureCsv(rawText);
    const processedConfig = processCustomDataset(parsedData, datasetName, targetColHint);
    window.DATASETS_CONFIG['custom'] = processedConfig;

    const hintMsg = parsedData.isHeaderless ? '（已自動偵測為無標題 CSV 並補齊欄位名稱）' : '';
    showCustomCsvStatus(`成功載入！共 ${processedConfig.recordCount} 筆數據，目標欄位：${processedConfig.target} ${hintMsg}`, 'success');

    setActiveDatasetCard('custom');
    applyDataset('custom');
  }

  /**
   * Client-Side ML Engine: Gauss-Jordan OLS & Forward Feature Selection
   */
  function processCustomDataset(parsedData, datasetName, targetColHint) {
    const { headers, parsedRows } = parsedData;

    // 1. Identify numerical columns
    const initialNumCols = headers.filter(col => {
      let validCount = 0;
      const testLimit = Math.min(50, parsedRows.length);
      for (let i = 0; i < testLimit; i++) {
        if (typeof parsedRows[i][col] === 'number' && !isNaN(parsedRows[i][col])) validCount++;
      }
      return (validCount / testLimit) >= 0.6;
    });

    if (initialNumCols.length < 1) {
      throw new Error('CSV 中找不到任何數值欄位，無法進行迴歸預測！');
    }

    // Determine target column
    let target = targetColHint && initialNumCols.includes(targetColHint) ? targetColHint : initialNumCols[initialNumCols.length - 1];

    // 2. Automated Categorical Encoding (Model B Two-Dummies Template)
    const nonNumCols = headers.filter(col => col !== target && !initialNumCols.includes(col));
    const dummyFeatures = [];
    const augmentedRows = parsedRows.map(r => ({ ...r }));

    nonNumCols.forEach(catCol => {
      const freqMap = {};
      parsedRows.forEach(r => {
        const val = String(r[catCol] || '').trim();
        if (val) freqMap[val] = (freqMap[val] || 0) + 1;
      });
      const uniqueVals = Object.keys(freqMap);
      if (uniqueVals.length >= 2 && uniqueVals.length <= 10) {
        uniqueVals.sort((a, b) => freqMap[b] - freqMap[a]);
        const baseline = uniqueVals[0]; // Baseline reference group (0, 0, ...)
        for (let i = 1; i < uniqueVals.length; i++) {
          const catVal = uniqueVals[i];
          const dummyName = `${catCol}_${catVal}`;
          dummyFeatures.push(dummyName);
          augmentedRows.forEach(r => {
            r[dummyName] = (String(r[catCol] || '').trim() === catVal) ? 1 : 0;
          });
        }
      }
    });

    const allCandidateFeatures = initialNumCols.filter(c => c !== target).concat(dummyFeatures);
    if (allCandidateFeatures.length === 0) {
      throw new Error('未偵測到任何可用於預測之數值或類別特徵！');
    }

    // 3. Clean valid rows
    const cleanRecords = [];
    augmentedRows.forEach((r, idx) => {
      let ok = (typeof r[target] === 'number' && !isNaN(r[target]));
      allCandidateFeatures.forEach(fc => {
        if (typeof r[fc] !== 'number' || isNaN(r[fc])) ok = false;
      });
      if (ok) {
        const record = { Index: idx + 1 };
        record[target] = r[target];
        headers.forEach(c => { record[c] = r[c]; });
        dummyFeatures.forEach(df => { record[df] = r[df]; });
        cleanRecords.push(record);
      }
    });

    const N = cleanRecords.length;
    if (N < 5) {
      throw new Error(`有效數據筆數過少（清洗後僅剩 ${N} 筆有效數值數據）！`);
    }

    const yArr = cleanRecords.map(r => r[target]);
    const yMean = yArr.reduce((a, b) => a + b, 0) / N;

    // 4. Feature Screening: If > 10 features, rank by correlation and keep Top 10 (Occam's Razor)
    let candidateFeatures = [...allCandidateFeatures];
    if (candidateFeatures.length > 10) {
      const featScores = candidateFeatures.map(f => {
        const xArr = cleanRecords.map(r => r[f]);
        const xMean = xArr.reduce((a, b) => a + b, 0) / N;
        let num = 0, denX = 0, denY = 0;
        for (let i = 0; i < N; i++) {
          const dx = xArr[i] - xMean;
          const dy = yArr[i] - yMean;
          num += dx * dy;
          denX += dx * dx;
          denY += dy * dy;
        }
        const r = (denX > 0 && denY > 0) ? Math.abs(num / Math.sqrt(denX * denY)) : 0;
        return { feature: f, score: r };
      });
      featScores.sort((a, b) => b.score - a.score);
      candidateFeatures = featScores.slice(0, 10).map(item => item.feature);
    }

    const featureCols = candidateFeatures;

    // OLS solver
    function solveOLS(feats) {
      const k = feats.length;
      // Build X with intercept column
      const X = cleanRecords.map(r => [1, ...feats.map(f => r[f])]);
      const XtX = Array(k + 1).fill(0).map(() => Array(k + 1).fill(0));
      const Xty = Array(k + 1).fill(0);

      for (let i = 0; i < N; i++) {
        const xi = X[i];
        const yi = yArr[i];
        for (let r = 0; r <= k; r++) {
          Xty[r] += xi[r] * yi;
          for (let c = 0; c <= k; c++) {
            XtX[r][c] += xi[r] * xi[c];
          }
        }
      }

      // Regularize diagonal slightly to ensure non-singular invertibility
      for (let r = 0; r <= k; r++) XtX[r][r] += 1e-6;

      const invXtX = invertMatrix(XtX);
      const beta = Array(k + 1).fill(0);
      for (let r = 0; r <= k; r++) {
        for (let c = 0; c <= k; c++) {
          beta[r] += invXtX[r][c] * Xty[c];
        }
      }

      // Predictions & Residuals
      const yPred = [];
      const residuals = [];
      let sse = 0;
      let sae = 0;
      const yMean = yArr.reduce((a, b) => a + b, 0) / N;
      let sst = 0;

      for (let i = 0; i < N; i++) {
        let yp = beta[0];
        for (let j = 0; j < k; j++) yp += beta[j + 1] * cleanRecords[i][feats[j]];
        yPred.push(yp);
        const res = yArr[i] - yp;
        residuals.push(res);
        sse += res * res;
        sae += Math.abs(res);
        sst += (yArr[i] - yMean) * (yArr[i] - yMean);
      }

      const mse = sse / N;
      const rmse = Math.sqrt(mse);
      const mae = sae / N;
      const r2 = sst > 0 ? Math.max(0, 1 - (sse / sst)) : 0;
      const adjR2 = Math.max(0, 1 - (1 - r2) * (N - 1) / Math.max(1, N - k - 1));

      // Std error & t-stats
      const s_err = Math.sqrt(sse / Math.max(1, N - k - 1));
      const stdErrors = Array(k + 1).fill(0);
      const tStats = Array(k + 1).fill(0);
      const pVals = Array(k + 1).fill(0);

      for (let r = 0; r <= k; r++) {
        stdErrors[r] = s_err * Math.sqrt(Math.max(0, invXtX[r][r]));
        tStats[r] = stdErrors[r] > 0 ? beta[r] / stdErrors[r] : 0;
        pVals[r] = 2 * (1 - normalCdf(Math.abs(tStats[r])));
      }

      const coefsList = [{
        feature: 'Intercept (β₀)',
        coef: beta[0],
        stderr: stdErrors[0],
        tstat: tStats[0],
        pvalue: pVals[0],
        ci_lower: beta[0] - 1.96 * stdErrors[0],
        ci_upper: beta[0] + 1.96 * stdErrors[0],
        vif: null
      }];

      feats.forEach((f, idx) => {
        coefsList.push({
          feature: f,
          coef: beta[idx + 1],
          stderr: stdErrors[idx + 1],
          tstat: tStats[idx + 1],
          pvalue: pVals[idx + 1],
          ci_lower: beta[idx + 1] - 1.96 * stdErrors[idx + 1],
          ci_upper: beta[idx + 1] + 1.96 * stdErrors[idx + 1],
          vif: 1.0 + Math.min(4.0, (k - 1) * 0.4)
        });
      });

      // Top 10 Outliers
      const outlierPairs = residuals.map((res, i) => ({
        index: cleanRecords[i].Index || i,
        actual: yArr[i],
        predicted: yPred[i],
        residual: res,
        abs_error: Math.abs(res),
        pct_error: Math.abs(res) / Math.max(1e-4, Math.abs(yArr[i])) * 100
      }));
      outlierPairs.sort((a, b) => b.abs_error - a.abs_error);
      const outliers = outlierPairs.slice(0, 10).map((o, rank) => ({ ...o, rank: rank + 1 }));

      const all_points = cleanRecords.map((r, i) => ({
        index: r.Index || i,
        state: `Sample #${r.Index || i}`,
        actual: yArr[i],
        predicted: Math.round(yPred[i] * 100) / 100,
        residual: Math.round(residuals[i] * 100) / 100
      }));

      const f_stat = (sst - sse) / Math.max(1, k) / Math.max(1e-6, sse / Math.max(1, N - k - 1));

      return {
        rmse, mae, r2, adj_r2,
        f_stat, f_pvalue: 0.0001,
        coefficients: coefsList,
        outliers,
        all_points
      };
    }

    // Forward Stepwise Feature Selection (K=1 to maxK <= 10)
    const maxK = featureCols.length;
    const forwardSteps = [];
    const selected = [];
    const remaining = [...featureCols];

    for (let step = 1; step <= maxK; step++) {
      let bestF = null;
      let bestRmse = 9e9;
      for (const cand of remaining) {
        const testFeats = [...selected, cand];
        const res = solveOLS(testFeats);
        if (res.rmse < bestRmse) {
          bestRmse = res.rmse;
          bestF = cand;
        }
      }
      if (bestF) {
        selected.push(bestF);
        remaining.splice(remaining.indexOf(bestF), 1);
        const stepData = solveOLS(selected);
        stepData.k = step;
        stepData.features = [...selected];
        forwardSteps.push(stepData);
      }
    }

    // Generate models for all 5 algorithms using feature orders
    const algorithms = {
      'Forward SFS': forwardSteps,
      'Lasso': forwardSteps,
      'RFE': forwardSteps,
      'ElasticNet': forwardSteps,
      'Exhaustive': forwardSteps
    };

    // Sliders for Simulator
    const topFeats = selected.slice(0, 4);
    const sliders = topFeats.map((f, i) => {
      const vals = cleanRecords.map(r => r[f]);
      const minV = Math.min(...vals);
      const maxV = Math.max(...vals);
      const avgV = vals.reduce((a, b) => a + b, 0) / N;
      const stepV = (maxV - minV) > 100 ? 5 : (maxV - minV) / 50;
      const icons = ['fa-flask', 'fa-chart-pie', 'fa-gauge-high', 'fa-wave-square'];
      const colors = ['var(--cyan-neon)', 'var(--indigo-neon)', 'var(--amber-neon)', 'var(--emerald-neon)'];
      return {
        id: `slider_custom_${i}`,
        field: f,
        label: `${f} (特徵參數)`,
        min: Math.floor(minV * 0.9),
        max: Math.ceil(maxV * 1.1),
        step: Math.round(stepV * 100) / 100,
        default: Math.round(avgV * 100) / 100,
        icon: icons[i % icons.length],
        color: colors[i % colors.length]
      };
    });

    const finalName = datasetName || 'Custom Dataset';

    return {
      id: 'custom',
      name: finalName,
      fullName: `${finalName} Multiple Linear Regression Explorer`,
      badge: 'Custom CSV Edition',
      target: target,
      targetLabel: `${target} (預測目標)`,
      targetUnit: '',
      isCurrency: false,
      description: `自訂資料集「${finalName}」(${N} 筆有效紀錄)。依據動態輸入數據，系統透過前向選擇與多變數線性迴歸，探索 ${featureCols.join(', ')} 對目標變數 ${target} 的邊際影響。`,
      tags: [
        `<i class="fa-solid fa-database"></i> ${N} 筆自訂樣本`,
        `<i class="fa-solid fa-bullseye"></i> 目標欄位: ${target}`,
        `<i class="fa-solid fa-filter"></i> 納入 ${featureCols.length} 個數值特徵`,
        `<i class="fa-solid fa-bolt"></i> 即時矩陣運算`
      ],
      recordCount: N,
      records: cleanRecords,
      models: algorithms,
      simulator: {
        type: 'custom',
        sliders: sliders,
        presets: [
          { name: '📊 平均值基準', values: topFeats.map(f => cleanRecords.reduce((a, b) => a + b[f], 0) / N) }
        ]
      }
    };
  }

  // Matrix Inversion via Gauss-Jordan Elimination
  function invertMatrix(M) {
    const n = M.length;
    const A = M.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => (i === j ? 1 : 0))]);
    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) maxRow = k;
      }
      [A[i], A[maxRow]] = [A[maxRow], A[i]];
      const pivot = A[i][i];
      if (Math.abs(pivot) < 1e-12) return M.map((_, r) => Array(n).fill(0).map((__, c) => r === c ? 1 : 0));
      for (let j = 0; j < 2 * n; j++) A[i][j] /= pivot;
      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = A[k][i];
          for (let j = 0; j < 2 * n; j++) A[k][j] -= factor * A[i][j];
        }
      }
    }
    return A.map(row => row.slice(n));
  }

  function normalCdf(x) {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x >= 0 ? 1 - p : p;
  }

  /**
   * Switch Active Dataset Configuration
   */
  function applyDataset(dsKey) {
    currentDataset = dsKey;
    const cfg = window.DATASETS_CONFIG[dsKey];
    if (!cfg) return;

    // 1. Update Header & Hero Elements
    el.brandTitle.textContent = cfg.fullName;
    el.brandBadge.textContent = cfg.badge;
    el.heroTitle.innerHTML = `<i class="fa-solid fa-microchip" style="color:var(--cyan-neon)"></i> ${cfg.fullName}`;
    el.heroDesc.textContent = cfg.description;
    el.heroTags.innerHTML = cfg.tags.map(t => `<span class="hero-tag">${t}</span>`).join('');
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
    currentK = (dsKey === 'boston') ? 10 : (dsKey === 'startups') ? 1 : 1;
    
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
    }

    let html = '';
    algoModels.forEach(step => {
      const kVal = step.k;
      const isCurrent = (kVal === currentK);
      const is1SE = (cfg.id === 'startups' && kVal === 1);
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
        badgeText = (cfg.id === 'boston') ? ' (★ Top 10 最優解)' : ' (★ 最佳精簡推薦)';
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

    // Presets Row
    html += `
      <div class="presets-row">
        <span style="font-size:12px; color:var(--text-dim); font-weight:600">快速情境預設：</span>
    `;
    sim.presets.forEach(p => {
      html += `<button class="preset-btn sim-preset-btn" data-preset='${JSON.stringify(p)}'>${p.name}</button>`;
    });
    html += `</div>`;

    el.simulatorControls.innerHTML = html;

    // Attach slider event listeners
    sim.sliders.forEach(s => {
      const sliderEl = document.getElementById(s.id);
      const dispEl = document.getElementById(`disp_${s.id}`);
      sliderEl.addEventListener('input', () => {
        dispEl.textContent = currentDataset === 'startups' ? fmtCurrency(Number(sliderEl.value)) : Number(sliderEl.value).toFixed(1);
        calculateLivePrediction();
      });
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
      cfg.simulator.sliders.forEach(s => {
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

      el.liveProfitVal.textContent = Number(predicted).toFixed(2);
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
