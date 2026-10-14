/**
 * AIoT 50 Startups Cyber Explorer - Core Application Logic
 * Interactive Multiple Linear Regression & Feature Selection Explorer
 */

(function () {
  'use strict';

  // Application State
  let currentAlgo = 'Forward SFS';
  let currentK = 1; // Default to parsimonious 1-SE model
  let currentState = 'California'; // Default state in simulator

  // Chart instances
  let rmseChart = null;
  let r2Chart = null;
  let scatterChart = null;
  let coefChart = null;

  // Method color map (Cyber palette)
  const ALGO_COLORS = {
    'Lasso': '#6366f1',
    'Forward SFS': '#00f0ff',
    'RFE': '#00ffaa',
    'ElasticNet': '#ff0055',
    'Exhaustive': '#a855f7'
  };

  // DOM Elements cache
  const elements = {
    algoTabs: document.getElementById('algoTabs'),
    kSelectorGroup: document.getElementById('kSelectorGroup'),
    eqContainer: document.getElementById('liveEquation'),
    coefTableBody: document.getElementById('coefTableBody'),
    outlierTableBody: document.getElementById('outlierTableBody'),
    
    // Metrics
    metricRmse: document.getElementById('metricRmse'),
    metricRmseNote: document.getElementById('metricRmseNote'),
    metricMae: document.getElementById('metricMae'),
    metricR2: document.getElementById('metricR2'),
    metricAdjR2: document.getElementById('metricAdjR2'),
    metricFstat: document.getElementById('metricFstat'),
    metricParsimony: document.getElementById('metricParsimony'),
    metricParsimonyDesc: document.getElementById('metricParsimonyDesc'),
    
    // Simulator
    sliderRd: document.getElementById('sliderRd'),
    valRd: document.getElementById('valRd'),
    sliderAdmin: document.getElementById('sliderAdmin'),
    valAdmin: document.getElementById('valAdmin'),
    sliderMarketing: document.getElementById('sliderMarketing'),
    valMarketing: document.getElementById('valMarketing'),
    stateButtons: document.querySelectorAll('.state-btn'),
    presetButtons: document.querySelectorAll('.preset-btn'),
    liveProfitVal: document.getElementById('liveProfitVal'),
    profitComparison: document.getElementById('profitComparison'),
    waterfallList: document.getElementById('waterfallList'),
    
    // Dataset Modal
    btnOpenDataset: document.getElementById('btnOpenDataset'),
    btnCloseDataset: document.getElementById('btnCloseDataset'),
    datasetModal: document.getElementById('datasetModal'),
    datasetTableBody: document.getElementById('datasetTableBody'),
    datasetSearch: document.getElementById('datasetSearch')
  };

  // Helper formatting functions
  const fmtCurrency = (v) => '$' + Math.round(v).toLocaleString('en-US');
  const fmtNumber = (v, d = 2) => Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

  /**
   * Initialize application on DOM ready
   */
  document.addEventListener('DOMContentLoaded', () => {
    if (!window.MODEL_DATA) {
      console.error('MODEL_DATA not loaded!');
      return;
    }
    
    initCharts();
    setupEventListeners();
    setupSimulator();
    populateDatasetModal();
    updateDashboard();
  });

  /**
   * Set up Chart.js global defaults for Dark Cyber aesthetic
   */
  function initCharts() {
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.06)';

    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            boxWidth: 12,
            font: { size: 11, weight: '600' },
            color: '#cbd5e1'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(13, 19, 34, 0.95)',
          titleColor: '#00f0ff',
          bodyColor: '#f1f5f9',
          borderColor: 'rgba(0, 240, 255, 0.3)',
          borderWidth: 1,
          padding: 12,
          boxPadding: 6,
          usePointStyle: true,
          titleFont: { family: "'Outfit', sans-serif", size: 13, weight: '700' }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: { color: '#64748b', font: { size: 11 } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: { color: '#64748b', font: { size: 11 } }
        }
      }
    };

    // 1. RMSE Chart
    const ctxRmse = document.getElementById('chartRmse').getContext('2d');
    rmseChart = new Chart(ctxRmse, {
      type: 'line',
      data: { labels: [], datasets: [] },
      options: {
        ...commonOptions,
        scales: {
          ...commonOptions.scales,
          y: {
            ...commonOptions.scales.y,
            ticks: {
              ...commonOptions.scales.y.ticks,
              callback: (v) => '$' + (v / 1000).toFixed(0) + 'k'
            }
          }
        }
      }
    });

    // 2. R² Chart
    const ctxR2 = document.getElementById('chartR2').getContext('2d');
    r2Chart = new Chart(ctxR2, {
      type: 'line',
      data: { labels: [], datasets: [] },
      options: {
        ...commonOptions,
        scales: {
          ...commonOptions.scales,
          y: {
            ...commonOptions.scales.y,
            ticks: {
              ...commonOptions.scales.y.ticks,
              callback: (v) => (v * 100).toFixed(1) + '%'
            }
          }
        }
      }
    });

    // 3. Actual vs Predicted Scatter Chart
    const ctxScatter = document.getElementById('chartScatter').getContext('2d');
    scatterChart = new Chart(ctxScatter, {
      type: 'scatter',
      data: { datasets: [] },
      options: {
        ...commonOptions,
        scales: {
          x: {
            ...commonOptions.scales.x,
            title: { display: true, text: 'Predicted Profit ($)', color: '#94a3b8', font: { size: 12, weight: '600' } },
            ticks: { callback: (v) => '$' + (v / 1000).toFixed(0) + 'k' }
          },
          y: {
            ...commonOptions.scales.y,
            title: { display: true, text: 'Actual Profit ($)', color: '#94a3b8', font: { size: 12, weight: '600' } },
            ticks: { callback: (v) => '$' + (v / 1000).toFixed(0) + 'k' }
          }
        }
      }
    });

    // 4. Feature Importance / Coefficients Bar Chart
    const ctxCoef = document.getElementById('chartImportance').getContext('2d');
    coefChart = new Chart(ctxCoef, {
      type: 'bar',
      data: { labels: [], datasets: [] },
      options: {
        ...commonOptions,
        indexAxis: 'y',
        plugins: {
          ...commonOptions.plugins,
          legend: { display: false }
        }
      }
    });
  }

  /**
   * Set up tab and button interaction listeners
   */
  function setupEventListeners() {
    // Algorithm tabs
    if (elements.algoTabs) {
      const tabs = elements.algoTabs.querySelectorAll('.algo-tab-btn');
      tabs.forEach(btn => {
        btn.addEventListener('click', () => {
          tabs.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentAlgo = btn.dataset.algo;
          updateDashboard();
        });
      });
    }

    // Feature count (K) buttons
    if (elements.kSelectorGroup) {
      const kBtns = elements.kSelectorGroup.querySelectorAll('.k-btn');
      kBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          kBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentK = parseInt(btn.dataset.k, 10);
          updateDashboard();
        });
      });
    }

    // Dataset modal events
    if (elements.btnOpenDataset) {
      elements.btnOpenDataset.addEventListener('click', () => {
        elements.datasetModal.style.display = 'flex';
      });
    }
    if (elements.btnCloseDataset) {
      elements.btnCloseDataset.addEventListener('click', () => {
        elements.datasetModal.style.display = 'none';
      });
    }
    window.addEventListener('click', (e) => {
      if (e.target === elements.datasetModal) {
        elements.datasetModal.style.display = 'none';
      }
    });

    if (elements.datasetSearch) {
      elements.datasetSearch.addEventListener('input', (e) => {
        filterDataset(e.target.value.toLowerCase());
      });
    }
  }

  /**
   * Main dashboard update routine triggered on algorithm or K change
   */
  function updateDashboard() {
    const algoData = window.MODEL_DATA[currentAlgo];
    if (!algoData) return;

    // Find the model step matching currentK
    const modelStep = algoData.find(s => s.k === currentK) || algoData[0];

    updateMetricsHUD(modelStep);
    updateEquationHUD(modelStep);
    updateCoefficientsTable(modelStep);
    updateOutliersTable(modelStep);
    updateTrajectoryCharts();
    updateDiagnosticCharts(modelStep);
    calculateLivePrediction();
  }

  /**
   * Update Key Performance Indicators in HUD
   */
  function updateMetricsHUD(step) {
    elements.metricRmse.textContent = fmtCurrency(step.rmse);
    elements.metricMae.textContent = fmtCurrency(step.mae);
    elements.metricR2.textContent = (step.r2 * 100).toFixed(2) + '%';
    elements.metricAdjR2.textContent = (step.adj_r2 * 100).toFixed(2) + '%';
    
    // F-Stat and p-value
    elements.metricFstat.textContent = step.f_stat ? step.f_stat.toFixed(1) : 'N/A';

    // Parsimony and Status Guidance
    const cardParsimony = document.getElementById('cardParsimony');
    if (currentK === 1) {
      elements.metricParsimony.textContent = '★ 1-SE Choice';
      elements.metricParsimony.style.color = '#00f0ff';
      elements.metricParsimonyDesc.textContent = 'Occam’s razor: Simplest robust model, zero multicollinearity.';
      cardParsimony.className = 'cyber-metric-card parsimony';
    } else if (currentK === 2) {
      elements.metricParsimony.textContent = '★ Sweet Spot';
      elements.metricParsimony.style.color = '#00ffaa';
      elements.metricParsimonyDesc.textContent = 'Minimum RMSE ($8,198) with highest explainability.';
      cardParsimony.className = 'cyber-metric-card sweet';
    } else if (currentK === 5) {
      elements.metricParsimony.textContent = 'Overfitting Risk';
      elements.metricParsimony.style.color = '#ffb703';
      elements.metricParsimonyDesc.textContent = 'Admin & state dummies increase variance without gain.';
      cardParsimony.className = 'cyber-metric-card alert';
    } else {
      elements.metricParsimony.textContent = 'Diminishing Returns';
      elements.metricParsimony.style.color = '#cbd5e1';
      elements.metricParsimonyDesc.textContent = `Adding ${currentK} features yields negligible gain over K=2.`;
      cardParsimony.className = 'cyber-metric-card';
    }
  }

  /**
   * Update the mathematical regression equation display
   */
  function updateEquationHUD(step) {
    const coefMap = {};
    step.coefficients.forEach(c => { coefMap[c.feature] = c.coef; });
    const b0 = coefMap['Intercept (\u03b2\u2080)'] || 0;

    let eqHtml = `<span class="eq-prefix">ŷ (Profit) =</span> <span class="eq-coef">${fmtCurrency(b0)}</span>`;

    step.features.forEach(feat => {
      const val = coefMap[feat] || 0;
      const sign = val >= 0 ? '+' : '-';
      const absVal = Math.abs(val);
      eqHtml += ` ${sign} <span class="eq-coef">${absVal >= 10 ? fmtNumber(absVal, 2) : absVal.toFixed(4)}</span> × <span class="eq-var">${feat}</span>`;
    });

    elements.eqContainer.innerHTML = eqHtml;
  }

  /**
   * Update the coefficients and statistical tests table
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

      // VIF assessment
      let vifHtml = '<span style="color:#64748b">—</span>';
      if (c.vif !== null && c.vif !== undefined) {
        if (c.vif < 3) {
          vifHtml = `<span class="vif-safe">${c.vif.toFixed(2)} (Safe)</span>`;
        } else if (c.vif <= 10) {
          vifHtml = `<span class="vif-warn">${c.vif.toFixed(2)} (Moderate)</span>`;
        } else {
          vifHtml = `<span class="vif-danger">${c.vif.toFixed(2)} (Severe Collinear)</span>`;
        }
      }

      rowsHtml += `
        <tr>
          <td style="font-weight:600; color:${isIntercept ? '#94a3b8' : '#00f0ff'}">
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

    elements.coefTableBody.innerHTML = rowsHtml;
  }

  /**
   * Update the Top 10 Outliers Diagnostic table
   */
  function updateOutliersTable(step) {
    if (!step.outliers || !step.outliers.length) return;

    let rowsHtml = '';
    step.outliers.forEach(o => {
      const isPositive = o.residual >= 0;
      const resColor = isPositive ? 'var(--emerald-neon)' : 'var(--rose-neon)';
      const rankBadge = o.rank === 1 ? 'color: var(--amber-neon); font-weight:700;' : '';

      rowsHtml += `
        <tr>
          <td style="${rankBadge}">#${o.rank}</td>
          <td class="mono" style="color:var(--cyan-neon)">Startup [${o.index}]</td>
          <td class="mono" style="font-weight:600; color:#fff">${fmtCurrency(o.actual)}</td>
          <td class="mono" style="color:#94a3b8">${fmtCurrency(o.predicted)}</td>
          <td class="mono" style="color:${resColor}; font-weight:600">${isPositive ? '+' : ''}${fmtCurrency(o.residual)}</td>
          <td class="mono" style="color:#cbd5e1">${fmtCurrency(o.abs_error)}</td>
          <td>
            <span style="background:rgba(255,255,255,0.06); padding:2px 8px; border-radius:4px; font-weight:600; font-family:monospace; color:${o.pct_error > 10 ? 'var(--rose-neon)' : 'var(--text-muted)'}">
              ${o.pct_error.toFixed(2)}%
            </span>
          </td>
        </tr>
      `;
    });

    elements.outlierTableBody.innerHTML = rowsHtml;
  }

  /**
   * Update RMSE & R² Multi-Algorithm Trajectory Charts
   */
  function updateTrajectoryCharts() {
    const labels = [1, 2, 3, 4, 5].map(k => `K=${k}`);

    // Datasets for all algorithms to show comparative benchmark
    const rmseDatasets = [];
    const r2Datasets = [];

    Object.keys(window.MODEL_DATA).forEach(algo => {
      const isCurrent = (algo === currentAlgo);
      const color = ALGO_COLORS[algo] || '#6366f1';
      const steps = window.MODEL_DATA[algo];

      rmseDatasets.push({
        label: algo,
        data: steps.map(s => s.rmse),
        borderColor: color,
        backgroundColor: color,
        borderWidth: isCurrent ? 3 : 1.5,
        borderDash: isCurrent ? [] : [4, 4],
        pointRadius: isCurrent ? 5 : 2.5,
        pointHoverRadius: 7,
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
        pointRadius: isCurrent ? 5 : 2.5,
        pointHoverRadius: 7,
        tension: 0.25,
        order: isCurrent ? 1 : 2
      });
    });

    rmseChart.data.labels = labels;
    rmseChart.data.datasets = rmseDatasets;
    rmseChart.update();

    r2Chart.data.labels = labels;
    r2Chart.data.datasets = r2Datasets;
    r2Chart.update();
  }

  /**
   * Update Actual vs Predicted Scatter and Feature Importance Bar Chart
   */
  function updateDiagnosticCharts(step) {
    // 1. Scatter Chart
    const points = step.all_points || [];
    const outlierIndices = new Set((step.outliers || []).slice(0, 5).map(o => o.index));

    const normalData = [];
    const outlierData = [];

    points.forEach(p => {
      const pt = { x: p.predicted, y: p.actual, index: p.index, state: p.state, residual: p.residual };
      if (outlierIndices.has(p.index)) {
        outlierData.push(pt);
      } else {
        normalData.push(pt);
      }
    });

    // Min & Max bounds for regression line y = x
    const allVals = points.map(p => p.actual).concat(points.map(p => p.predicted));
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
        label: 'Normal Startups (50 Dataset)',
        data: normalData,
        backgroundColor: 'rgba(0, 240, 255, 0.75)',
        borderColor: '#00f0ff',
        pointRadius: 5,
        pointHoverRadius: 8
      },
      {
        type: 'scatter',
        label: 'Top 5 Outliers',
        data: outlierData,
        backgroundColor: 'rgba(255, 0, 85, 0.85)',
        borderColor: '#ff0055',
        pointStyle: 'rectRot',
        pointRadius: 7,
        pointHoverRadius: 10
      }
    ];

    scatterChart.options.plugins.tooltip.callbacks = {
      label: (ctx) => {
        const raw = ctx.raw;
        if (!raw.index && raw.index !== 0) return 'Reference Line';
        return [
          `Startup #${raw.index} (${raw.state})`,
          `Actual: ${fmtCurrency(raw.y)}`,
          `Predicted: ${fmtCurrency(raw.x)}`,
          `Residual: ${raw.residual >= 0 ? '+' : ''}${fmtCurrency(raw.residual)}`
        ];
      }
    };
    scatterChart.update();

    // 2. Feature Importance / Coefficients Bar Chart
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
   * Set up Live Profit Predictor Simulator
   */
  function setupSimulator() {
    // Slider bindings
    const bindSlider = (slider, display, prefix = '$', isCurrency = true) => {
      slider.addEventListener('input', () => {
        display.textContent = isCurrency ? fmtCurrency(Number(slider.value)) : slider.value;
        calculateLivePrediction();
      });
    };

    bindSlider(elements.sliderRd, elements.valRd);
    bindSlider(elements.sliderAdmin, elements.valAdmin);
    bindSlider(elements.sliderMarketing, elements.valMarketing);

    // State radio buttons
    elements.stateButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        elements.stateButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentState = btn.dataset.state;
        calculateLivePrediction();
      });
    });

    // Preset configurations
    elements.presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const p = btn.dataset;
        elements.sliderRd.value = p.rd;
        elements.valRd.textContent = fmtCurrency(Number(p.rd));
        elements.sliderAdmin.value = p.admin;
        elements.valAdmin.textContent = fmtCurrency(Number(p.admin));
        elements.sliderMarketing.value = p.mkt;
        elements.valMarketing.textContent = fmtCurrency(Number(p.mkt));

        elements.stateButtons.forEach(b => {
          b.classList.toggle('active', b.dataset.state === p.state);
        });
        currentState = p.state;
        calculateLivePrediction();
      });
    });
  }

  /**
   * Perform real-time live profit prediction and waterfall breakdown
   */
  function calculateLivePrediction() {
    const algoData = window.MODEL_DATA[currentAlgo];
    if (!algoData) return;
    const modelStep = algoData.find(s => s.k === currentK) || algoData[0];

    const rd = parseFloat(elements.sliderRd.value);
    const admin = parseFloat(elements.sliderAdmin.value);
    const mkt = parseFloat(elements.sliderMarketing.value);
    const isFL = (currentState === 'Florida') ? 1 : 0;
    const isNY = (currentState === 'New York') ? 1 : 0;

    const coefMap = {};
    modelStep.coefficients.forEach(c => { coefMap[c.feature] = c.coef; });

    const intercept = coefMap['Intercept (\u03b2\u2080)'] || 0;
    let predictedProfit = intercept;

    const contributions = [
      { name: 'Baseline Intercept (β₀)', val: intercept, active: true, type: 'base' }
    ];

    // R&D Spend
    if (coefMap['R&D Spend'] !== undefined) {
      const v = coefMap['R&D Spend'] * rd;
      predictedProfit += v;
      contributions.push({ name: 'R&D Spend Impact', val: v, active: true, type: v >= 0 ? 'pos' : 'neg' });
    } else {
      contributions.push({ name: 'R&D Spend', val: 0, active: false, note: 'Excluded in Model' });
    }

    // Marketing Spend
    if (coefMap['Marketing Spend'] !== undefined) {
      const v = coefMap['Marketing Spend'] * mkt;
      predictedProfit += v;
      contributions.push({ name: 'Marketing Spend Impact', val: v, active: true, type: v >= 0 ? 'pos' : 'neg' });
    } else {
      contributions.push({ name: 'Marketing Spend', val: 0, active: false, note: 'Excluded in Model' });
    }

    // Administration
    if (coefMap['Administration'] !== undefined) {
      const v = coefMap['Administration'] * admin;
      predictedProfit += v;
      contributions.push({ name: 'Administration Impact', val: v, active: true, type: v >= 0 ? 'pos' : 'neg' });
    } else {
      contributions.push({ name: 'Administration', val: 0, active: false, note: 'Excluded in Model' });
    }

    // State Dummies
    if (coefMap['State_Florida'] !== undefined && isFL) {
      const v = coefMap['State_Florida'] * 1;
      predictedProfit += v;
      contributions.push({ name: 'State: Florida Premium', val: v, active: true, type: v >= 0 ? 'pos' : 'neg' });
    }
    if (coefMap['State_New York'] !== undefined && isNY) {
      const v = coefMap['State_New York'] * 1;
      predictedProfit += v;
      contributions.push({ name: 'State: New York Premium', val: v, active: true, type: v >= 0 ? 'pos' : 'neg' });
    }
    if (currentState === 'California') {
      contributions.push({ name: 'State: California (Baseline)', val: 0, active: true, type: 'base' });
    }

    // Update Output Numbers
    elements.liveProfitVal.textContent = fmtCurrency(predictedProfit);

    // Benchmark comparison (Median 50 Startup Profit = $107,978)
    const medianProfit = 107978;
    const diffPct = ((predictedProfit - medianProfit) / medianProfit) * 100;
    const diffSign = diffPct >= 0 ? '+' : '';
    elements.profitComparison.innerHTML = `
      <span style="color: ${diffPct >= 0 ? 'var(--emerald-neon)' : 'var(--rose-neon)'}; font-weight:700">
        ${diffSign}${diffPct.toFixed(1)}%
      </span> compared to historical median startup ($107,978)
    `;

    // Render Waterfall Breakdown
    let wfHtml = '';
    contributions.forEach(c => {
      if (c.active) {
        wfHtml += `
          <div class="waterfall-item">
            <span class="wf-name">${c.name}</span>
            <span class="wf-val ${c.type}">${c.val >= 0 ? '+' : ''}${fmtCurrency(c.val)}</span>
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
    elements.waterfallList.innerHTML = wfHtml;
  }

  /**
   * Populate Raw Dataset Modal with all 50 records
   */
  function populateDatasetModal() {
    if (!window.STARTUP_DATA) return;
    renderDatasetRows(window.STARTUP_DATA);
  }

  function renderDatasetRows(data) {
    let rowsHtml = '';
    data.forEach(r => {
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
    });
    elements.datasetTableBody.innerHTML = rowsHtml;
  }

  function filterDataset(query) {
    if (!window.STARTUP_DATA) return;
    const filtered = window.STARTUP_DATA.filter(r => 
      r.State.toLowerCase().includes(query) ||
      r.Index.toString().includes(query)
    );
    renderDatasetRows(filtered);
  }

})();
