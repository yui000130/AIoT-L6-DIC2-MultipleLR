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
- [專案涵蓋之 CSV 資料集詳細規格 (CSV Datasets)](#-專案涵蓋之-csv-資料集詳細規格-csv-datasets)
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

## 📂 專案涵蓋之 CSV 資料集詳細規格 (CSV Datasets)

本專案涵蓋與支援之所有核心 CSV 資料集規格整理如下，皆提供直接下載/測試連結：

### 1. 🚀 50 Startups 新創營運數據集 (`50_Startups.csv`)
* **資料來源**：[Avik-Jain 100-Days-Of-ML-Code (GitHub)](https://raw.githubusercontent.com/Avik-Jain/100-Days-Of-ML-Code/master/datasets/50_Startups.csv)
* **直連下載網址**：`https://raw.githubusercontent.com/Avik-Jain/100-Days-Of-ML-Code/master/datasets/50_Startups.csv`
* **資料規模**：50 筆觀測值、5 個欄位（無缺失值）
* **欄位結構**：
  * `R&D Spend`（研發支出，美元）：連續型數值，與獲利呈現高達 $r = 0.973$ 的極強正相關，為模型最強之主力特徵。
  * `Administration`（行政支出，美元）：連續型數值，衡量企業內部運營成本。
  * `Marketing Spend`（行銷支出，美元）：連續型數值，衡量市場開拓費用。
  * `State`（公司所在州別）：名目類別變數，包含 `California`、`Florida`、`New York`。
* **目標變數 ($y$)**：`Profit`（公司淨獲利，美元）。
* **特徵工程處置**：
  * **Two Dummies 基準組編碼**：以加州 `California` 為基準組（$\text{FL}=0, \text{NY}=0$），產生 $\text{State\_Florida}$ 與 $\text{State\_New York}$ 兩個虛擬變數，完全避開虛擬變數陷阱（Dummy Variable Trap）。

---

### 2. 🏠 Boston Housing 波士頓城鎮住宅價格資料集 (`BostonHousing.csv`)
* **資料來源**：[selva86 datasets (GitHub)](https://raw.githubusercontent.com/selva86/datasets/master/BostonHousing.csv)
* **直連下載網址**：`https://raw.githubusercontent.com/selva86/datasets/master/BostonHousing.csv`
* **資料規模**：506 筆城鎮住宅區樣本、14 個欄位
* **欄位結構（13 個解釋特徵）**：
  * `crim`：城鎮人均犯罪率（Per capita crime rate by town）。
  * `zn`：佔地超過 25,000 平方英尺之住宅用地比例。
  * `indus`：城鎮非零售商業用地比例。
  * `chas`：查爾斯河虛擬變數（若邊界緊鄰河道 $=1$，否則 $=0$）。
  * `nox`：一氧化氮濃度（每千萬分之一，衡量空氣污染水準）。
  * `rm`：每戶住宅之平均房間數量（顯著正相關特徵）。
  * `age`：1940 年以前建造之老舊自用住宅比例。
  * `dis`：至波士頓五個主要就業服務中心之加權距離。
  * `rad`：輻射狀快速公路連通便利指數。
  * `tax`：每 10,000 美元之全額物業稅率。
  * `ptratio`：城鎮公立學校之師生比例（衡量公共教育資源充裕度）。
  * `b`：城鎮非裔人口比例指標 $1000(Bk - 0.63)^2$。
  * `lstat`：低收入社會階層人口比例（顯著負相關核心特徵）。
* **目標變數 ($y$)**：`medv`（業主自住房屋價值中位數，單位：千美元 $1,000s）。
* **模型決策重點**：原始 13 特徵中存在多組共線性關係，經由奧坎剃刀 1-SE 原則推薦出 Top 10 最優子集，有效剔除屋齡與商業用地雜訊。

---

### 3. 📄 Housing 無標題列資料集 (`housing.csv`)
* **資料來源**：[jbrownlee Datasets (GitHub)](https://raw.githubusercontent.com/jbrownlee/Datasets/master/housing.csv)
* **直連下載網址**：`https://raw.githubusercontent.com/jbrownlee/Datasets/master/housing.csv`
* **資料規模**：506 筆純數值矩陣、**無欄位標題列（Headerless）**
* **用途與測試特性**：
  * 用於測試系統之「無標題自動嗅探引擎」。
  * 系統自動偵測第一列即為數值數據，自動指派欄位標籤 `col_0` 至 `col_13`，並自動將最後一欄 `col_13` 智能推論為預測目標。

---

### 4. 🏥 Medical Insurance 醫療保險支出資料集 (`insurance.csv`，擴充測試案例)
* **資料來源**：[stedy Machine-Learning-with-R-datasets (GitHub)](https://raw.githubusercontent.com/stedy/Machine-Learning-with-R-datasets/master/insurance.csv)
* **直連下載網址**：`https://raw.githubusercontent.com/stedy/Machine-Learning-with-R-datasets/master/insurance.csv`
* **資料規模**：1,338 筆保戶紀錄、7 個欄位
* **欄位結構**：
  * 連續數值：`age`（年齡）、`bmi`（身體質量指數）、`children`（扶養子女數）。
  * 類別文字：`sex`（性別：`male`/`female`）、`smoker`（吸菸：`yes`/`no`）、`region`（居住地區：四個方位分區）。
* **目標變數 ($y$)**：`charges`（個人年度醫療保險理賠支出金額，美元）。
* **用途與測試特性**：
  * 用於驗證自訂資料集在面對多個文字類別特徵時，自動辨識多類別等級（Levels）、挑選頻率最高者為基準組（Baseline），並自動建立完整 One-Hot / Dummy 迴歸特徵矩陣之能力。

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
