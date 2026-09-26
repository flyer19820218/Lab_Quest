# Lab Quest 協作約定

這是獨立的網頁遊戲倉庫，不是原 Physical-Boys 教材倉庫。老師決定科學內容與遊戲方向；程式、視覺和任務必須服務於可觀察、可操作的科學探究。

## 目前確定的方向

- **2026-09-26 最新方向優先：第一人稱探索，不顯示／下載 March 或手臂動畫。** 24 × 14 的 Blender 建模實驗室，七區自由探索；靠近後主動互動，再進固定 2.5D 桌面。March 等角色素材留庫、不刪除；角色、服裝與新獎勵仍延後。

- 物理館電學實驗室是自由探索遊戲。March 暫作可走動角色；角色造型、服裝、物品與新獎勵系統延後。
- 玩家走近器材時不得自動開任務或強制對話；須由玩家主動選擇互動。故事可有線索與密室感，但操作結果必須符合科學規則。
- 規劃中的內容依序涵蓋范德格拉夫靜電球、萊頓瓶、摩擦起電、感應起電、接觸起電，最後以驗電器整合驗證。此順序是故事鋪陳，不代表鎖住其他展品或禁止自由探索。
- 既有 3D 實驗桌和驗電器配置是已驗證的原型資產。不要因新增場景而擅自重畫或改變其科學狀態邏輯。

## 修改邊界

- 原 Physical-Boys 教材是科學與教學流程的權威來源。只讀取、引用或在本倉庫另建實作；不要修改原教材。
- 新實驗先寫科學規格卡：初始條件、玩家可改變的量、可觀察結果、不變量、錯誤操作與提示。科學定義或教學結論有疑義時，先標給老師決定，不要自行改寫教材。
- 電子／負電荷用藍色且只有電子移動；本遊戲現有驗電器以靜止紅色表現帶正電區域。視覺效果不得暗示正電荷粒子在金屬中流動。
- 科學狀態、可見動畫與成功條件應由同一套規則得出；不要用動畫假象掩蓋不同步的判定。
- 不把每種實驗硬塞進同一種資料格式。共用場景、輸入和存檔等通用機制，特殊科學操作可有獨立模組。
- 未經明確要求，不推送 GitHub、改動正式網站或移除舊存檔資料。

## 工作路徑

- 新增或大改場景：讀 docs/SCENE_PRODUCTION_SOP.md，使用 docs/templates/SCENE_CARD.md；場景故事見 docs/ELECTRICITY_HALL_STORY.md。
- 第一人稱入口在 electricity_lab_first_person.html；原 index.html 保留 March 版。第一人稱整合在 src/game-fp.js、鏡頭／輸入在 src/first-person.js、站點／碰撞在 src/lab-layout.js。Blender 源檔 assets/environment/electricity-gallery.blend 與 scripts/build-electricity-lab.py。src/game.js 為舊第三人稱實作，留作數值／幾何比對，仍由原 index.html 使用，不是第一人稱入口。
- 驗電器規則在 src/physical-boys-bench.js，原幾何抽出在 src/electroscope-station.js；摩擦引擎 src/friction.js 不變；感應／接觸／氣球使用 src/inquiry-engine.js 與科學卡 docs/concepts/ELECTRICITY_SIDE_TABLES_SPEC.md。萊頓瓶只做結構，充放電仍待確認。不要把早期 src/engine.js 與現行驗電器公式混用。
- 依修改範圍執行單元測試：npm test、node --test tests/physical-boys-bench.test.cjs。改動 3D、觸控或 UI 時再跑 npm run test:browser，並實測 iPhone／iPad Safari；桌面模擬不能代替真機驗收。
- 每次交付清楚區分「已在程式中完成」、「只有規劃」及「等待老師或真機確認」。
