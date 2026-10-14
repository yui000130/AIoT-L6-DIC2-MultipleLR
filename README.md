# 🚀 多元線性迴歸與特徵選擇決策系統 (Multiple Linear Regression Explorer)
### 50 Startups · Boston Housing · 瀏覽器端純前端 Python (Pyodide) 任意 CSV 即時分析引擎

> 🌐 **線上互動展示系統（Live Demo）**：  
> **[https://yui000130.github.io/AIoT-L6-DIC2-MultipleLR/](https://yui000130.github.io/AIoT-L6-DIC2-MultipleLR/)**

<p align="center">
  <a href="https://yui000130.github.io/AIoT-L6-DIC2-MultipleLR/">
    <img src="assets/preview.png" alt="多元線性迴歸與特徵選擇探索系統 UI 預覽" width="100%" style="border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.6);">
  </a>
</p>

> 📦 **GitHub 專案倉庫**：  
> **[https://github.com/yui000130/AIoT-L6-DIC2-MultipleLR](https://github.com/yui000130/AIoT-L6-DIC2-MultipleLR)**

---

[![GitHub Repo](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/yui000130/AIoT-L6-DIC2-MultipleLR)
[![Live Demo](https://img.shields.io/badge/Live-Demo_Online-00f0ff?logo=googlechrome&logoColor=white)](https://yui000130.github.io/AIoT-L6-DIC2-MultipleLR/)
[![Pyodide](https://img.shields.io/badge/Pyodide-v0.28.2_WebAssembly-FFD43B?logo=webassembly&logoColor=black)](https://pyodide.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Scikit-Learn](https://img.shields.io/badge/scikit--learn-F7931E?logo=scikit-learn&logoColor=white)](https://scikit-learn.org/)
[![Chart.js](https://img.shields.io/badge/Chart.js-v4.4_Neon-FF6384?logo=chartdotjs&logoColor=white)](https://www.chartjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📖 專案目錄 (Table of Contents)
- [專案簡介 (Overview)](#-專案簡介-overview)
- [核心三大資料集中心 (Active Dataset Selection)](#-核心三大資料集中心-active-dataset-selection)
- [瀏覽器端 Python 分析引擎 (Pyodide Engine)](#-瀏覽器端-python-分析引擎-pyodide-engine)
- [五大特徵選擇演算法 (Feature Selection Algorithms)](#-五大特徵選擇演算法-feature-selection-algorithms)
- [核心統計理論與決策方法 (Methodology & Statistics)](#-核心統計理論與決策方法-methodology--statistics)
- [基準評估結果與對照表 (Benchmark Results)](#-基準評估結果與對照表-benchmark-results)
- [互動式視覺化系統功能 (Interactive System Features)](#-互動式視覺化系統功能-interactive-system-features)
- [專案檔案結構 (Repository Structure)](#-專案檔案結構-repository-structure)
- [本地安裝與執行指南 (Quickstart Guide)](#-本地安裝與執行指南-quickstart-guide)
- [GitHub Pages 部署說明 (Deployment)](#-github-pages-部署說明-deployment)

---

## 🎯 專案簡介 (Overview)

本專案為 **AIoT 智慧物聯網與大數據分析（DIC2）** 核心實作專案，整合國際資料探勘標準流程 **CRISP-DM**，建立了一套具備**極致科技感（Cyber Dark Glassmorphism）**的多元線性迴歸與特徵選擇互動決策系統。

系統不僅內建經典的 **50 家新創公司營運數據（50 Startups）** 與 **波士頓住宅數據（Boston Housing）**，更突破性導入 **WebAssembly Pyodide 技術**，讓使用者能夠直接在瀏覽器中**上傳任意 CSV 或輸入外部資料集網址**，由純前端背景線程（Web Worker）即時執行完整的 Scikit-Learn 模型訓練與特徵篩選！

---

## 🗂️ 核心三大資料集中心 (Active Dataset Selection)

使用者可在頂部導覽列一鍵無縫切換三大資料集模式：

| 資料集卡片 | 數據規模 | 預測目標 ($y$) | 核心任務與特色 |
| :--- | :---: | :---: | :--- |
| **🚀 50 Startups**<br>`(內建官方)` | 50 筆紀錄<br>4 大維度 | **公司利潤 (Profit)** | 探討研發、行政、行銷支出及州別（California 基準組）對淨利的邊際貢獻；驗證奧坎剃刀 1-SE 原則。 |
| **🏠 Boston Housing**<br>`(經典基準)` | 506 筆城鎮<br>13 大特徵 | **住宅房價 (MEDV)** | 探索犯罪率、房間數、低收入比等指標；展現從 $K=1 \sim 10$ 特徵階梯中剔除共線性雜訊的過程。 |
| **📂 其他：自訂資料集<br>（多元線性回歸）** | 任意 CSV<br>(10MB 內) | **使用者自選<br>數值目標** | **瀏覽器端純前端 Python 分析**：支援本機 CSV 拖曳上傳或公開網址下載，自動完成清洗、編碼、交叉驗證與建模。 |

---

## ⚡ 瀏覽器端 Python 分析引擎 (Pyodide Engine)

專案採用 **Pyodide (v0.28.2) + Web Worker** 架構（`pyworker.js` + `csv_engine.py`），所有 Python 科學運算均在使用者本機瀏覽器內獨立執行：

1. **零後端伺服器依賴，隱私 100% 保障**：
   - 資料完全不會上傳至任何第三方遠端伺服器，即便是企業私有數據亦能安全離線分析。
2. **智慧資料探測與清洗管線**：
   - **自動編碼辨識**：支援 UTF-8、Big5 等多種編碼（包含 Excel 匯出的繁體中文 CSV）。
   - **自動分隔符偵測**：逗號 (`,`)、分號 (`;`)、Tab (`\t`) 與空白字元。
   - **特徵清洗**：自動去除千分位逗號、貨幣符號 (`$`)、百分比 (`%`)；數值缺失補中位數、類別缺失補最常出現值；自動剔除常數欄與 ID 序號欄。
   - **類別特徵 Two Dummies 編碼**：自動將類別欄位以最常見類別為基準組（Baseline），自動產生虛擬變數。
3. **兩步驟極簡分析流程**：
   - **步驟 1 (Inspect)**：上傳或輸入網址後，Python 即時分析欄位型態，以彩色標籤（藍=數值、紫=類別、灰=略過）直觀展示。
   - **步驟 2 (Analyze)**：確認目標欄位後點擊開始，背景線程自動完成 80/20 切分、交叉驗證、五種演算法特徵篩選、Top 10 離群值檢定並無縫輸出至視覺化儀表板。

---

## 🔬 五大特徵選擇演算法 (Feature Selection Algorithms)

系統全面支援五大特徵挑選機制，使用者可自由切換觀察特徵入選順序與收斂路徑：

1. ⚡ **Forward SFS（前向逐步選擇）**：
   - 從空模型開始，每輪貪婪納入讓交叉驗證 RMSE 最低的特徵，具備極佳的商務解釋力。
2. 🎯 **Lasso（L1 正則化稀疏路徑）**：
   - 藉由 L1 懲罰項將不重要特徵係數直接壓縮至 0，依據係數「越早脫離 0 越重要」之路徑順序排列。
3. 🔄 **RFE（遞迴特徵消除）**：
   - 擬合標準化多元線性迴歸模型，每輪逐步剔除係數絕對值最小的特徵，屬於經典的 Wrapper 方法。
4. 🌲 **ElasticNet（彈性網絡）**：
   - 融合 L1 與 L2 正則化（$\text{l1\_ratio}=0.5$），在處理特徵群組共線性時比純 Lasso 更具穩定性。
5. 🔬 **Exhaustive（全域最佳窮舉搜尋）**：
   - 針對每個特徵數量 $K$，試遍數學上所有 $\binom{p}{K}$ 種可能組合，挑出該 $K$ 階梯下的全域最佳解（Global Optimum）。

---

## 📐 核心統計理論與決策方法 (Methodology & Statistics)

### 1. 奧坎剃刀原則與一個標準誤法則（1-SE Rule）
盲目追求訓練誤差極小化往往導致**過擬合（Overfitting）**並引入無效的多重共線性雜訊。
- **計算門檻**：$\text{Threshold} = \text{RMSE}_{\min} + 1 \times \text{SE}$。
- **決策邏輯**：在所有 $\text{RMSE} \le \text{Threshold}$ 的模型中，挑選**特徵數量最少（最精簡）**的模型。
- **意義**：若效能差異小於一個標準誤，代表其差異可能僅是抽樣隨機擾動，選擇精簡模型具備更高的泛化能力。

### 2. 多重共線性診斷（VIF, Variance Inflation Factor）
$$\text{VIF}_j = \frac{1}{1 - R_j^2}$$
- **判定門檻**：$\text{VIF} < 5$（正常安全）、$5 \le \text{VIF} \le 10$（中度共線性）、$\text{VIF} > 10$（高度共線性警訊）。
- 在 50 Startups 中，Model B（全特徵）之研發支出與行銷支出存在潛在共線性，而精簡模型則完美規避了此一缺陷。

### 3. 離群值與槓桿點診斷（Cook's Distance）
- **學生化殘差（Studentized Residuals）**：誤差標準化，$|r_i| > 2$ 值得關注，$|r_i| > 3$ 為顯著離群值。
- **Cook's 距離**：衡量單一觀測值對整體回歸係數的影響力，門檻 $D_i > \frac{4}{n}$。
- **關鍵發現**：**Startup #49 (加州)** 研發支出為 0 但獲利高達 $14,681，學生化殘差達 $-3.788$，Cook's D 達 $0.562$，為顯著槓桿離群點。

---

## 📊 基準評估結果與對照表 (Benchmark Results)

### 50 Startups 跨特徵數評估對照（Repeated 5-Fold CV）

| 特徵階梯 $K$ | 選用特徵組合 | 5×5 CV RMSE | 1-SE 門檻判定 | 測試集 RMSE | 測試集 $R^2$ | 決策意涵 |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| **$K=1$** | **R&D Spend** | **$9,824 \pm 607$** | **$\le 10,070$ ✓** | **$7,714** | **0.9265** | **✅ ★ 1-SE 推薦最簡模型** |
| **$K=2$** | R&D Spend, Marketing Spend | $9,509 \pm 611$ | $\le 10,070$ ✓ | $8,206$ | 0.9168 | ◆ 最低 CV 誤差甜蜜點 |
| **$K=3$** | R&D, Marketing, Administration | $9,463 \pm 607$ | $\le 10,070$ ✓ | $8,996$ | 0.9001 | 邊際效益開始遞減 |
| **$K=4$** | R&D, Marketing, Admin, State_FL | $9,709 \pm 603$ | $\le 10,070$ ✓ | $9,056$ | 0.8987 | 引入州別雜訊 |
| **$K=5$** | 全部 5 特徵（Model B 基準） | $10,138 \pm 636$ | $> 10,070$ ✗ | $9,056$ | 0.8987 | 全特徵模型（過擬合） |

> **結論**：單一研發支出特徵即達到 $R^2 = 0.9265$，超越商業目標 $90\%$ 門檻，係數統計檢定 $p < 0.001$ 極度顯著。

---

## 💻 互動式視覺化系統功能 (Interactive System Features)

1. **動態 $K$ 軸輔助指引線（Dynamic Guideline Plugin）**：
   - 在 **RMSE 軌跡圖** 與 **$R^2$ 擬合曲線圖** 中，選取特定 $K$ 值時會自動繪製垂直虛線與頂部標記。
   - 自動在頂部圖表資訊列顯示**所有 5 大演算法在該特徵數 $K$ 下的精準數值膠囊**。
2. **Top 10 離群值散佈圖（Scatter Plot & Residuals）**：
   - 繪製實際值 vs. 預測值對角理想線 ($y = x$)。
   - 保證精確標註並繪出殘差絕對值前十大的**離群鑽石紅點**，滑鼠懸停顯示樣本編號、預測值與偏差幅度。
3. **即時推論與利潤模擬器 (Live Predictor HUD)**：
   - 連續特徵即時滑桿調節、類別特徵（如州別 California/Florida/New York）按鈕切換。
   - **瀑布流拆解 (Contribution Waterfall)**：逐項列出基準截距項（$\beta_0$）、各變數的實質正負加減金額，透明解釋預測形成過程。
4. **原始數據集檢視彈窗 (Raw Dataset Modal Viewer)**：
   - 支援搜尋過濾關鍵字、分頁展示資料集所有原始欄位數據。

---

## 📁 專案檔案結構 (Repository Structure)

```bash
AIoT-L6-50-startup/
├── index.html                           # 網頁主結構 (Cyber HUD、三大多元線性資料集介面)
├── css/
│   └── style.css                        # 霓虹暗黑科技風 CSS 系統、玻璃擬態與響應式排版
├── js/
│   ├── app.js                           # 前端主控制器 (PyEngine 橋接、Chart.js 外掛、模擬器)
│   ├── pyworker.js                      # Web Worker 背景執行緒 (驅動 Pyodide WebAssembly)
│   └── model_data.js                    # 50 Startups 與 Boston Housing 預算模型資料檔
├── python/
│   ├── csv_engine.py                    # 瀏覽器端 Python 迴歸分析引擎 (特徵選擇、CV、檢定)
│   └── main.py                          # Python 後端完整資料處理、模型訓練與特徵選擇腳本
├── models/
│   └── startup_final_model.pkl          # 訓練完成之最終部署模型 (Scikit-Learn Joblib 封裝)
├── data/
│   ├── all_models_predictions_and_outliers.csv # 各模型詳細預測值、殘差與學生化殘差
│   ├── top10_outliers.csv               # 選定模型之 Top 10 離群值明細表
│   ├── forward_selection_results.md     # 前向選擇階段性評估數據 Markdown 表格
│   └── model_comparison.md              # Model B 全特徵 vs. 精簡模型比較報告
├── assets/
│   └── preview.png                      # 系統介面完整高畫質預覽圖
└── README.md                            # 專案完整技術文件
```

---

## 🛠️ 本地安裝與執行指南 (Quickstart Guide)

### 1. 複製專案庫
```bash
git clone https://github.com/yui000130/AIoT-L6-DIC2-MultipleLR.git
cd AIoT-L6-DIC2-MultipleLR
```

### 2. 啟動本機網頁伺服器
由於 Web Worker 與 Pyodide 需要同源安全性（避免直接雙擊 `file://` 開啟被瀏覽器安全限制封鎖），請以 Python 啟動輕量伺服器：
```bash
python -m http.server 8088
```
啟動後打開瀏覽器訪問：  
👉 **`http://localhost:8088/`**

### 3. （可選）重新執行 Python 後端分析腳本
```bash
pip install pandas numpy scikit-learn scipy matplotlib joblib
python main.py
```

---

## 🌐 GitHub Pages 部署說明 (Deployment)

本專案完全為靜態純前端架構（Vanilla JS + CDN + Pyodide），支援以 GitHub Pages 免費發布：

1. 開啟 GitHub 倉庫：`https://github.com/yui000130/AIoT-L6-DIC2-MultipleLR`
2. 前往 **Settings** ➔ 點擊左側 **Pages**。
3. 在 **Build and deployment** 下：
   - **Source**：選擇 `Deploy from a branch`。
   - **Branch**：選擇 `main`，資料夾為 `/ (root)`。
   - 點擊 **Save**。
4. 部署完成後即可在專屬網址使用：  
   👉 **`https://yui000130.github.io/AIoT-L6-DIC2-MultipleLR/`**

---

## 👥 貢獻與開發資訊 (Credits & License)

- **作者**：AIoT 專案團隊 (DIC2)
- **聯絡信箱**：`a0982758422@gmail.com`
- **授權條款**：本專案採用 [MIT License](LICENSE) 開源授權，歡迎學習交流與改進！
