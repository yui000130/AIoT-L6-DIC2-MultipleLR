/**
 * AIoT Multiple Linear Regression & Feature Selection Explorer
 * Multi-Dataset Controller: 50 Startups & Boston Housing Datasets
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
    btnDsStartups: document.getElementById('btnDsStartups'),
    btnDsBoston: document.getElementById('btnDsBoston'),
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
  const fmtTarget = (v) => {
    if (currentDataset === 'startups') {
      return fmtCurrency(v);
    } else {
      return '$' + fmtNumber(v, 2) + 'k ($' + Math.round(v * 1000).toLocaleString('en-US') + ')';
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
    setupDatasetSwitcher();
    setupAlgorithmsAndK();
    setupModal();
    applyDataset(currentDataset);
  });

  /**
   * Initialize Global Chart.js Defaults
   */
  function initCharts() {
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
   * Setup Dataset Switcher
   */
  function setupDatasetSwitcher() {
    el.btnDsStartups.addEventListener('click', () => {
      if (currentDataset !== 'startups') {
        el.btnDsStartups.classList.add('active');
        el.btnDsBoston.classList.remove('active');
        applyDataset('startups');
      }
    });

    el.btnDsBoston.addEventListener('click', () => {
      if (currentDataset !== 'boston') {
        el.btnDsBoston.classList.add('active');
        el.btnDsStartups.classList.remove('active');
        applyDataset('boston');
      }
    });
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
    el.simulatorTitle.textContent = dsKey === 'startups' ? 'Live Profit Predictor (AIoT 即時投資支出利潤模擬器)' : 'Live Boston Housing Price Predictor (波士頓房價即時預估模擬器)';
    el.targetValLabel.textContent = dsKey === 'startups' ? '即時預測利潤 (Predicted Profit)' : '即時預測房價中位數 (Predicted MEDV)';
    el.waterfallHeader.textContent = dsKey === 'startups' ? '利潤貢獻來源拆解 (Contribution Waterfall)' : '房價特徵影響拆解 (Feature Impact Waterfall)';
    el.coefCardTag.textContent = dsKey === 'startups' ? 'Two Dummies: CA=Baseline (FL=0, NY=0)' : 'Features: RM, LSTAT, PTRATIO, DIS, etc.';

    // 2. Render Dynamic Simulator Inputs
    renderSimulatorInputs(cfg);

    // 3. Render Modal Table Headers & Data
    renderModalStructure(cfg);

    // 4. Reset K & Refresh Dashboard
    currentAlgo = 'Forward SFS';
    currentK = 1;
    
    // Reset active buttons in UI
    el.algoTabs.querySelectorAll('.algo-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.algo === currentAlgo);
    });
    el.kSelectorGroup.querySelectorAll('.k-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.k, 10) === currentK);
    });

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
        updateDashboard();
      });
    });

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
      const defaultValFormatted = currentDataset === 'startups' ? fmtCurrency(s.default) : s.default.toFixed(1);
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
        } else {
          document.getElementById('sliderLstat').value = p.lstat;
          document.getElementById('disp_sliderLstat').textContent = Number(p.lstat).toFixed(1);
          document.getElementById('sliderRm').value = p.rm;
          document.getElementById('disp_sliderRm').textContent = Number(p.rm).toFixed(1);
          document.getElementById('sliderPtratio').value = p.ptratio;
          document.getElementById('disp_sliderPtratio').textContent = Number(p.ptratio).toFixed(1);
          document.getElementById('sliderDis').value = p.dis;
          document.getElementById('disp_sliderDis').textContent = Number(p.dis).toFixed(1);
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

    const step = algoModels.find(s => s.k === currentK) || algoModels[0];

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
    } else {
      el.metricR2Desc.textContent = `解釋力 R² = ${(step.r2 * 100).toFixed(1)}%`;
      if (currentK === 2) {
        el.metricParsimony.textContent = '★ Optimal 2-Feat';
        el.metricParsimony.style.color = 'var(--emerald-neon)';
        el.metricParsimonyDesc.textContent = 'LSTAT + RM 兩大核心特徵即解釋 64% 房價變異。';
        el.cardParsimony.className = 'cyber-metric-card sweet';
      } else if (currentK >= 4) {
        el.metricParsimony.textContent = 'Robust Multi-Var';
        el.metricParsimony.style.color = 'var(--cyan-neon)';
        el.metricParsimonyDesc.textContent = '綜合納入教育師生比與就業中心交通距離。';
        el.cardParsimony.className = 'cyber-metric-card parsimony';
      } else {
        el.metricParsimony.textContent = 'Baseline Model';
        el.metricParsimony.style.color = '#cbd5e1';
        el.metricParsimonyDesc.textContent = '以單一主力特徵進行初步價格基線評估。';
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
    let eqHtml = `<span class="eq-prefix">ŷ (${currentDataset === 'startups' ? 'Profit' : 'MEDV'}) =</span> <span class="eq-coef">${b0Formatted}</span>`;

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
   * Update Outliers Diagnostic Table
   */
  function updateOutliersTable(step) {
    if (!step.outliers || !step.outliers.length) return;

    let rowsHtml = '';
    step.outliers.forEach(o => {
      const isPositive = o.residual >= 0;
      const resColor = isPositive ? 'var(--emerald-neon)' : 'var(--rose-neon)';
      const rankBadge = o.rank === 1 ? 'color: var(--amber-neon); font-weight:700;' : '';

      const actStr = currentDataset === 'startups' ? fmtCurrency(o.actual) : '$' + o.actual.toFixed(1) + 'k';
      const prdStr = currentDataset === 'startups' ? fmtCurrency(o.predicted) : '$' + o.predicted.toFixed(1) + 'k';
      const resStr = currentDataset === 'startups' ? (isPositive ? '+' : '') + fmtCurrency(o.residual) : (isPositive ? '+' : '') + o.residual.toFixed(2) + 'k';
      const absStr = currentDataset === 'startups' ? fmtCurrency(o.abs_error) : o.abs_error.toFixed(2) + 'k';

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
    const labels = [1, 2, 3, 4, 5].map(k => `K=${k}`);
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
    rmseChart.options.scales.y.ticks.callback = (v) => currentDataset === 'startups' ? '$' + (v / 1000).toFixed(0) + 'k' : v.toFixed(1);
    rmseChart.update();

    r2Chart.data.labels = labels;
    r2Chart.data.datasets = r2Datasets;
    r2Chart.update();
  }

  /**
   * Update Scatter Chart and Feature Impact Bar Chart
   */
  function updateDiagnosticCharts(step, cfg) {
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
        label: `Normal Samples (${cfg.name})`,
        data: normalData,
        backgroundColor: 'rgba(0, 240, 255, 0.75)',
        borderColor: '#00f0ff',
        pointRadius: currentDataset === 'startups' ? 5 : 3.5,
        pointHoverRadius: 7
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

    scatterChart.options.scales.x.title.text = `Predicted ${cfg.targetLabel}`;
    scatterChart.options.scales.y.title.text = `Actual ${cfg.targetLabel}`;
    scatterChart.options.scales.x.ticks.callback = (v) => currentDataset === 'startups' ? '$' + (v / 1000).toFixed(0) + 'k' : '$' + v.toFixed(0) + 'k';
    scatterChart.options.scales.y.ticks.callback = (v) => currentDataset === 'startups' ? '$' + (v / 1000).toFixed(0) + 'k' : '$' + v.toFixed(0) + 'k';

    scatterChart.options.plugins.tooltip.callbacks = {
      label: (ctx) => {
        const raw = ctx.raw;
        if (!raw.index && raw.index !== 0) return 'Reference Line';
        if (currentDataset === 'startups') {
          return [
            `Startup #${raw.index} (${raw.state})`,
            `Actual: ${fmtCurrency(raw.y)}`,
            `Predicted: ${fmtCurrency(raw.x)}`,
            `Residual: ${raw.residual >= 0 ? '+' : ''}${fmtCurrency(raw.residual)}`
          ];
        } else {
          return [
            `Sample #${raw.index}`,
            `Actual MEDV: $${raw.y.toFixed(1)}k`,
            `Predicted MEDV: $${raw.x.toFixed(1)}k`,
            `Residual: ${raw.residual >= 0 ? '+' : ''}${raw.residual.toFixed(2)}k`
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
    } else {
      // Boston Housing
      const lstat = parseFloat(document.getElementById('sliderLstat').value);
      const rm = parseFloat(document.getElementById('sliderRm').value);
      const ptratio = parseFloat(document.getElementById('sliderPtratio').value);
      const dis = parseFloat(document.getElementById('sliderDis').value);

      if (coefMap['lstat'] !== undefined) {
        const v = coefMap['lstat'] * lstat;
        predicted += v;
        contributions.push({ name: 'LSTAT (低收入比例影響)', val: v, active: true, type: v >= 0 ? 'pos' : 'neg' });
      } else {
        contributions.push({ name: 'LSTAT', val: 0, active: false, note: '未納入當前模型' });
      }

      if (coefMap['rm'] !== undefined) {
        const v = coefMap['rm'] * rm;
        predicted += v;
        contributions.push({ name: 'RM (每戶房間數影響)', val: v, active: true, type: v >= 0 ? 'pos' : 'neg' });
      } else {
        contributions.push({ name: 'RM', val: 0, active: false, note: '未納入當前模型' });
      }

      if (coefMap['ptratio'] !== undefined) {
        const v = coefMap['ptratio'] * ptratio;
        predicted += v;
        contributions.push({ name: 'PTRATIO (師生比影響)', val: v, active: true, type: v >= 0 ? 'pos' : 'neg' });
      } else {
        contributions.push({ name: 'PTRATIO', val: 0, active: false, note: '未納入當前模型' });
      }

      if (coefMap['dis'] !== undefined) {
        const v = coefMap['dis'] * dis;
        predicted += v;
        contributions.push({ name: 'DIS (就業中心距離影響)', val: v, active: true, type: v >= 0 ? 'pos' : 'neg' });
      } else {
        contributions.push({ name: 'DIS', val: 0, active: false, note: '未納入當前模型' });
      }

      // Check other features if in step
      ['nox', 'tax', 'crim', 'chas'].forEach(otherF => {
        if (coefMap[otherF] !== undefined) {
          contributions.push({ name: `${otherF.toUpperCase()} 特徵項`, val: coefMap[otherF], active: true, type: coefMap[otherF] >= 0 ? 'pos' : 'neg' });
        }
      });

      // Clamp predicted home price to >= 5
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
    }

    // Render Waterfall Breakdown
    let wfHtml = '';
    contributions.forEach(c => {
      const valStr = currentDataset === 'startups' ? fmtCurrency(c.val) : '$' + c.val.toFixed(2) + 'k';
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
    } else {
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
    }
    renderModalRows(cfg.records);
  }

  function renderModalRows(records) {
    let rowsHtml = '';
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
      } else {
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
      }
    });
    if (records.length > 100) {
      rowsHtml += `<tr><td colspan="9" style="text-align:center; color:var(--text-dim); padding:12px">... 顯示前 100 筆紀錄（共 ${records.length} 筆）...</td></tr>`;
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
