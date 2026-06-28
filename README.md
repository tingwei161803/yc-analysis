# Y Combinator Atlas

> 把 [Y Combinator](https://www.ycombinator.com/) — 全世界最有影響力的新創加速器 — 自 2005 年至今
> 的**每一家上線過的公司、每一個批次,以及形塑它的思想**,整理成一份可搜尋、可多軸篩選、可中英切換的互動圖鑑。
>
> An interactive, bilingual atlas of every launched Y Combinator company, every batch, and the
> ideas that shaped the world's most influential startup accelerator.

---

## 線上版 (Live)

| 入口 | URL |
| --- | --- |
| 🌐 互動圖鑑 | <https://yc-analysis.peteraim.com/> |

預設為**英文**,右上角可一鍵切換**繁體中文**;另有深 / 淺色模式,選擇會跨頁記憶。

---

## ✨ 功能特色

- **5,988 家公司全收錄** — 涵蓋 Summer 2005 ~ 今的每一家「已上線」YC 公司,而非只挑明星案例。
- **四軸篩選 × 全文搜尋** — 產業(9)× 狀態(營運中 / 上市 / 併購 / 關閉)× 年代(6 個世代)× 地區(13),即時組合;搜尋公司名 / 摘要 / 批次 / 標籤。
- **分層深度** — 91 家 top + 23 家上市 + 重大退出等知名公司附**上網查證的估值 / 募資 / 創辦人 / 來源連結**;其餘公司附從官方描述萃取的精煉重點。
- **獨角獸徽章** — Unicorn ($1B+) / Decacorn ($10B+) / Hectocorn ($100B+) 估值層級一眼可辨。
- **多頁面結構** — 總覽 / 公司圖鑑 / 批次與年代 / 深度分析 / 關鍵人物 / 生態系 / Essays / 詞彙與名言,各有獨立 URL。
- **10 章深度分析** — 從起源、標準投資條件、Demo Day、校友網絡、三個世代的領導,到 AI 浪潮與批評爭論。
- **批次與年代時間軸** — 50 個批次依 6 個世代分組,每批列出代表公司,點擊直達該公司。
- **關鍵人物 16 位** — Paul Graham、Jessica Livingston、Sam Altman、Garry Tan、Michael Seibel… 等。
- **競爭對手檔案** — Techstars、500 Global、Antler 等加速器與 YC 的對照。
- **Paul Graham essays 摘要 18 篇** + **YC / 新創詞彙表 32 條** + **名言錄 28 句**。
- **完整互動** — 卡片點開詳細 Dialog、←/→ 鍵切換、`Esc` 關閉、`#slug` deep-link、漸進式載入(5,988 張卡不卡頓)。
- **完整 SEO** — 每頁 canonical / Open Graph / Twitter card / JSON-LD,og-image,PWA-ready favicon。
- **零 build 純靜態** — HTML + CSS + Vanilla JS,無框架、無打包,丟任何靜態空間都能跑。

---

## 📂 內容結構與資料來源

```
.
├── index.html              # 總覽 (hub)
├── companies.html          # 5,988 家公司圖鑑(四軸篩選 + 搜尋 + Dialog)
├── batches.html            # 批次與年代時間軸
├── analysis.html           # 10 章深度分析
├── people.html             # 關鍵人物
├── ecosystem.html          # 競爭對手加速器
├── essays.html             # Paul Graham essays 摘要
├── glossary.html           # 詞彙表 + 名言
├── assets/
│   ├── styles.css          # 自訂設計系統(YC 橙、深淺色 token)
│   ├── shell.js            # 共用 chrome:appbar / 跨頁 nav / footer / dialog / 語言+主題
│   └── app.js              # 8 個頁面 renderer + 互動邏輯
├── data/
│   ├── site-data.js        # SITE_PAGES + 字典 + 統計 + 章節/人物/競品/essays/名言/詞彙(每頁載入)
│   └── companies.js        # 5,988 家公司資料(僅 companies 頁載入)
└── data/build/             # 資料管線(可重現)
    ├── normalize.py        # 抓 yc-oss 公開資料 → 正規化 + 分層 + 切 chunk
    ├── assemble.py         # 合併正規化 + 加值 + 內容 → data/*.js
    ├── gen_pages.py        # 產生 8 個 HTML 頁面 + og-image
    ├── enriched/           # 各公司雙語摘要 / 重點(加值產出)
    └── content/            # 章節 / 人物 / 競品 / essays / 名言 / 詞彙(敘事內容)
```

**資料來源 (Data sources)**

- 公司結構化資料(名稱、批次、狀態、產業、地區、官方描述)來自公開的
  [**yc-oss / api**](https://github.com/yc-oss/api) 資料集(YC 官方公司頁的鏡像)。
- 估值 / 募資 / 創辦人 / 退出等補充事實,來自公開新聞與公司頁,逐筆附上來源連結。
- 深度分析、人物、競品、essays 摘要等敘事內容為整理自公開資料的研究參考。

> ⚠️ **本站為非官方整理**,內容僅供研究參考;公司數量、批次、狀態、估值以
> [Y Combinator 官方](https://www.ycombinator.com/companies) 與各來源為準,引用前請自行查證。

---

## 🛠 本機執行 (Run locally)

純靜態網站,無 build 步驟、無 dependencies。

```bash
git clone git@github.com:tingwei161803/yc-analysis.git
cd yc-analysis

# 用 uv 起一個本機 server(本專案的偏好)
uv run --no-project python -m http.server 4173
# 開 http://localhost:4173/
```

或直接用瀏覽器打開 [`index.html`](./index.html)(所有資源都是相對路徑)。

### 重新產生資料(選配)

```bash
uv run --no-project python data/build/normalize.py   # 抓 yc-oss → 正規化 + 切 chunk
# （加值步驟由研究產出 data/build/enriched/ 與 content/,已隨 repo 附上）
uv run --no-project python data/build/assemble.py    # 合併 → data/site-data.js + data/companies.js
uv run --no-project python data/build/gen_pages.py   # 重新產生 8 個 HTML 頁面
```

---

## 📈 流量分析

本站使用 Google Analytics 4(property:*Y Combinator Atlas - GA4*)做匿名造訪統計,僅在線上版生效。
本機開啟不會送出任何資料。

---

## 📝 聲明 (License & disclaimer)

- 本 repo 為**非官方**研究整理,與 Y Combinator 無任何隸屬關係,也未獲其背書。
- 引用任何數字、批次、狀態、估值前,請對照 [YC 官方來源](https://www.ycombinator.com/) 與各筆來源連結。
- 程式碼(HTML / CSS / JS)以 MIT 授權釋出;底層公司事實之著作權屬於各自原始來源。
