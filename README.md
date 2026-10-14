# 🚀 AIoT 50 Startups: 多元線性迴歸與特徵選擇互動式探索系統
### Multiple Linear Regression & Feature Selection Parsimony Explorer (Cyber Edition)

> 🌐 **線上互動展示系統（Live Demo）**：  
> **[https://yui000130.github.io/AIoT-L6-DIC2-MultipleLR/](https://yui000130.github.io/AIoT-L6-DIC2-MultipleLR/)**

> 📦 **GitHub 專案倉庫**：  
> **[https://github.com/yui000130/AIoT-L6-DIC2-MultipleLR](https://github.com/yui000130/AIoT-L6-DIC2-MultipleLR)**

---

[![GitHub Repo](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/yui000130/AIoT-L6-DIC2-MultipleLR)
[![Live Demo](https://img.shields.io/badge/Live-Demo_Online-00f0ff?logo=googlechrome&logoColor=white)](https://yui000130.github.io/AIoT-L6-DIC2-MultipleLR/)
[![Python](https://img.shields.io/badge/Python-3.8+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Scikit-Learn](https://img.shields.io/badge/scikit--learn-F7931E?logo=scikit-learn&logoColor=white)](https://scikit-learn.org/)
[![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?logo=chartdotjs&logoColor=white)](https://www.chartjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📖 專案目錄 (Table of Contents)
- [專案簡介 (Overview)](#-專案簡介-overview)
- [核心方法與理論 (Methodology)](#-核心方法與理論-methodology)
- [特徵選擇與決策結果 (Feature Selection & Decision)](#-特徵選擇與決策結果-feature-selection--decision)
- [互動式網頁系統功能 (Interactive Web App)](#-互動式網頁系統功能-interactive-web-app)
- [專案檔案架構 (Repository Structure)](#-專案檔案架構-repository-structure)
- [本地安裝與執行指南 (Installation & Quickstart)](#-本地安裝與執行指南-installation--quickstart)
- [GitHub Pages 部署說明 (Deployment)](#-github-pages-部署說明-deployment)

---

## 🎯 專案簡介 (Overview)

本專案為 **AIoT 智慧物聯網與資料分析（DIC2）** 核心實作專案，針對 **50 家新創公司（50 Startups Dataset）** 的營運與財務數據進行深入的 **多元線性迴歸（Multiple Linear Regression）** 與 **特徵選擇（Feature Selection）** 實踐。

遵循國際標準資料探勘流程 **CRISP-DM**：
1. **Business Understanding（商業理解）**：評估新創公司在「研發支出 (R&D Spend)」、「行政支出 (Administration)」、「行銷推廣 (Marketing Spend)」與「所在州別 (State)」對「公司獲利 (Profit)」的實質影響，找出預測力最強且最精簡的模型。
2. **Data Understanding（資料理解）**：50 筆紀錄，無缺失值，探索各特徵與 Profit 之相關係數（研發支出相關性高達 $r = 0.973$）。
3. **Data Preparation（資料準備）**：進行類別變數的 **Two Dummies** 編碼（以加州 California 為基準組）。
4. **Modeling（模型建置）**：全特徵基準 Model B、前向選擇（Forward SFS）、Lasso (L1)、RFE 遞迴特徵消除、隨機森林重要度、ElasticNet 等。
5. **Evaluation（模型評估）**：Repeated K-Fold (5×5) 交叉驗證、1-SE Rule（奧坎剃刀原則）、VIF 多重共線性檢查、學生化殘差與 Cook's Distance 離群值檢定。
6. **Deployment（模型部署）**：產生輕量化部署模型檔 `startup_final_model.pkl`，並建立 Cyber 暗黑科技風格的 **純前端即時互動式探索與利潤預測網站**。

---

## 🔬 核心方法與理論 (Methodology)

### 1. 類別變數編碼：Two Dummies（虛擬變數陷阱防範）
新創公司分佈於三個州別（New York, California, Florida）。為避免 Dummy Variable Trap（虛擬變數陷阱引起完全多重共線性）：
- **California（加州）**：$\text{State\_FL} = 0, \text{State\_NY} = 0$（**基準組 Baseline**）
- **Florida（佛州）**：$\text{State\_FL} = 1, \text{State\_NY} = 0$
- **New York（紐約州）**：$\text{State\_FL} = 0, \text{State\_NY} = 1$

### 2. 奧坎剃刀原則與一個標準誤法則（1-SE Rule）
在特徵選擇過程中，盲目追求最小的訓練誤差往往導致**過擬合（Overfitting）**並引入無效的多重共線性雜訊。
- **步驟 A**：找出交叉驗證中 RMSE 最低的特徵組合與特徵數 $K_{\min}$。
- **步驟 B**：計算判定門檻 $\text{Threshold} = \text{RMSE}_{\min} + 1 \times \text{SE}$。
- **步驟 C**：在所有 $\text{RMSE} \le \text{Threshold}$ 的組合中，挑選**特徵數量最少（最簡單）**的模型。
- **理論意義**：統計上如果效能差異小於一個標準誤，代表其差異可能僅源自抽樣隨機波動，選擇最精簡的模型（Parsimonious Model）更具備泛化能力與商務解釋性。

### 3. 多重共線性檢定（VIF）
- 變異數膨脹因子（Variance Inflation Factor, VIF）：
  $$\text{VIF}_j = \frac{1}{1 - R_j^2}$$
- **判定標準**：$\text{VIF} < 5$（安全正常）、$5 \le \text{VIF} \le 10$（中度共線性）、$\text{VIF} > 10$（嚴重共線性）。全特徵模型中 R&D 與行銷支出存在潛在共線性，精簡模型有效規避此問題。

### 4. 離群值診斷（Outlier Analysis）
- **學生化殘差（Studentized Residuals）**：標準化每個數據點的誤差，$|r_i| > 2$ 值得注意，$|r_i| > 3$ 視為顯著離群點。
- **Cook's Distance**：衡量單一觀測值對整體迴歸係數估計的影響力，門檻為 $D_i > \frac{4}{n} = 0.08$。
- **關鍵離群點發現**：**Startup #49 (California)** 研發支出為 0 但利潤為 $14,681，其學生化殘差達 $-3.788$，Cook's D 達 $0.562$，為顯著槓桿離群點。

---

## 📊 特徵選擇與決策結果 (Feature Selection & Decision)

各特徵組合經由 **Repeated 5-Fold 交叉驗證** 與 **獨立測試集（Test Set）** 評估比較如下：

| 特徵數 $K$ | 納入特徵組合 | 訓練集 CV RMSE | 1-SE 門檻 | 測試集 RMSE | 測試集 $R^2$ | 決策狀態 |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| **$K=1$** | **R&D Spend** | **$9,824 \pm 607$** | **$\le 10,070$ ✓** | **$7,714** | **0.9265** | **✅ ★ 1-SE 最終選用** |
| **$K=2$** | R&D Spend, Marketing Spend | $9,509 \pm 611$ | $\le 10,070$ ✓ | $8,206$ | 0.9168 | ★ 甜蜜點（最低 RMSE） |
| **$K=3$** | R&D Spend, Marketing, Administration | $9,463 \pm 607$ | $\le 10,070$ ✓ | $8,996$ | 0.9001 | 最低 CV RMSE |
| **$K=4$** | R&D, Marketing, Admin, State_Florida | $9,709 \pm 603$ | $\le 10,070$ ✓ | $9,056$ | 0.8987 | 邊際效益遞減 |
| **$K=5$** | 全部 5 特徵（Model B 基準） | $10,138 \pm 636$ | $> 10,070$ ✗ | $9,056$ | 0.8987 | 全特徵基準（過擬合） |

> **最終結論**：  
> 僅使用單一特徵 **R&D Spend（研發支出）**，測試集 $R^2$ 即達 **0.9265**，測試集 RMSE 僅 **$7,714**，超越商業成功標準（$R^2 \ge 0.90$），且完全避開多重共線性風險。

---

## 💻 互動式網頁系統功能 (Interactive Web App)

專案已打造為高科技感（Cyber Dark Mode & Glassmorphism）前端單頁式應用（SPA）：

1. **五大演算法即時切換 (Step 1)**：
   - ⚡ **Forward SFS**（前向逐步選擇）
   - 🎯 **Lasso**（L1 正則化自動特徵稀疏化）
   - 🔄 **RFE**（遞迴特徵消除）
   - 🌲 **ElasticNet**（混合正則化）
   - 🔬 **Exhaustive**（全域最佳窮舉法）
2. **模型複雜度階梯切換 (Step 2, $K=1 \sim 5$)**：
   - 快速點選即可動態切換模型特徵數，並連動更新全站指標卡、係數表、圖表與預測方程式。
3. **4 大 Chart.js 動態交互視覺化圖表**：
   - **RMSE Trajectory Chart**：展示不同演算法隨特徵數 $K$ 變化的損失曲線。
   - **$R^2$ Curve Chart**：呈現解釋力增長與甜蜜點。
   - **Actual vs. Predicted Scatter Plot**：50 家公司實際獲利對比預測獲利，含 $y=x$ 理想參考線與 Top 離群點標記。
   - **Feature Importance / Impact Bar Chart**：直觀展示特徵係數權重大小。
4. **即時獲利預測模擬器 (Live Profit Predictor HUD)**：
   - 即時拉桿控制：研發支出 ($0 \sim \$200\text{K}$)、行政支出 ($50\text{K} \sim \$200\text{K}$)、行銷支出 ($0 \sim \$500\text{K}$)、州別選擇。
   - 一鍵預設情境：🦄 科技獨角獸、🚀 輕量精實創業、📢 行銷導向、📊 50 家平均值。
   - **瀑布流拆解 (Waterfall Breakdown)**：清晰條列各項支出為該模型利潤帶來的實質正負加減金額。
5. **50 筆原始數據集瀏覽器 (Raw Dataset Modal)**：
   - 點擊頂部「瀏覽資料集 (50筆)」即可彈出半透明視窗，支援即時關鍵字過濾搜尋（如搜尋州名）。

---

## 📁 專案檔案架構 (Repository Structure)

```bash
AIoT-L6-50-startup/
├── index.html                           # 網頁主結構 (Cyber Dark Mode UI & Modal)
├── style.css                            # 霓虹暗黑科技風 CSS 設計系統與玻璃擬態動效
├── app.js                               # 核心前端邏輯、Chart.js 渲染與即時預測計算
├── model_data.js                        # 5 大演算法各步階統計數據、係數與 50 筆原始紀錄
├── main.py                              # Python 後端完整資料處理、模型訓練與特徵選擇腳本
├── startup_final_model.pkl              # 訓練完成之最終部屬模型 (Scikit-Learn Joblib 封裝)
├── all_models_predictions_and_outliers.csv # 各模型之詳細預測值、殘差與學生化殘差
├── top10_outliers.csv                   # 選定模型之 Top 10 離群值明細表
├── forward_selection_results.md         # 前向選擇階段性評估數據 Markdown 表格
├── model_comparison.md                  # Model B 全特徵 vs. 精簡模型比較報告
└── .gitignore                           # Git 忽略配置檔 (排除暫存檔與快取)
```

---

## 🛠️ 本地安裝與執行指南 (Installation & Quickstart)

### 1. 複製專案庫
```bash
git clone https://github.com/yui000130/AIoT-L6-DIC2-MultipleLR.git
cd AIoT-L6-DIC2-MultipleLR
```

### 2. Python 模型管線執行
安裝所需套件：
```bash
pip install requests pandas numpy scikit-learn matplotlib seaborn joblib
```
執行特徵選擇與模型訓練腳本：
```bash
python main.py
```
*(程式將自動從網路下載 50 Startups 資料集，執行 5×5 Repeated K-Fold 交叉驗證、輸出統計報告與離群值清單)*

### 3. 本地啟動互動式網頁
您可以使用 Python 內建的輕量 HTTP 伺服器啟動網站：
```bash
python -m http.server 8088
```
啟動後在瀏覽器中開啟：
👉 **`http://localhost:8088/`**

---

## 🌐 GitHub Pages 部署說明 (Deployment)

本專案的前端系統為零依賴的靜態單頁應用（Vanilla HTML / CSS / JS + CDN），可直接透過 **GitHub Pages** 免費且永久在線發布：

1. 開啟您的 GitHub 專案：[https://github.com/yui000130/AIoT-L6-DIC2-MultipleLR](https://github.com/yui000130/AIoT-L6-DIC2-MultipleLR)
2. 進入頁面右上角的 **Settings** ➔ 點擊左側選單的 **Pages**。
3. 在 **Build and deployment** 區塊：
   - **Source**：選擇 `Deploy from a branch`。
   - **Branch**：選擇 `main`，資料夾選擇 `/ (root)`。
   - 點擊 **Save**。
4. 部署完成後，即可直接透過專屬網址存取：  
   👉 **`https://yui000130.github.io/AIoT-L6-DIC2-MultipleLR/`**

---

## 👥 貢獻與開發資訊 (Credits & License)

- **開發團隊**：AIoT 專案團隊 (DIC2)
- **聯絡資訊**：`a0982758422@gmail.com`
- **授權條款**：本專案採用 [MIT License](LICENSE) 開源授權。
