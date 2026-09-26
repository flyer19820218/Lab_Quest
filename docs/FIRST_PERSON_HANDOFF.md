# 第一人稱分區版｜2026-09-26 交付紀錄

狀態：獨立 HTML 試玩版。原 Physical-Boys 教材未改；原 index.html 的 March 版本保留。依老師 2026-09-26 要求，發布 electricity_lab_first_person.html 至 GitHub Pages，待真機與教學驗收。

## 已實作

- 24 × 14 的完整 3D 室內、隔牆開口、七區多桌、觸控與鍵盤第一人稱，面積約原版 2.19 倍。
- 初始站位在炸毛展示前；路過不自動觸發，地圖不傳送。退出桌面保留探索站位與朝向。
- 摩擦兩組材料、氣球與中性黑板、感應的正負棒／接地順序、等大球接觸／分開、原五題驗電器。
- 萊頓瓶重新建模：完整、剖面、三層拆解；內部導體連內箔，外端連外箔，玻璃隔離兩層。
- 舊 +40／+60 經驗與存檔保留；新的獲得流程要求操作證據與概念回答，不新增服裝／貨幣系統。
- 場景、科學、渲染與輸入分模組。驗電器桌／器材繪圖碼逐字比對原型，所有幾何數字不變。

## 界線與待驗收

- 萊頓瓶未做虛擬充放電；另有待老師確認的 LEYDEN_JAR_SPEC.md。范德格拉夫為既有現象展示，不是可操控的精密起電機模擬。
- 氣球使用明示的乳膠＋羊毛衣物教學情境；黑板用束縛電荷極化示意，淨電荷不改變。實際表面／濕度不在這個質性模型內；材質選擇待老師試玩確認。
- 小桌面的文字、故事對白、完整密室謎題仍需教師與學生試玩迭代，不能把這次分區版當成最終 20–30 場景。
- 已驗 Chrome 桌面、觸控 iPhone／iPad 尺寸；並非真機 Safari。老師需用實際 Safari 檢查載入與多指移動／轉頭。
- 本次依老師明確要求推送 GitHub，素材由 GitHub Pages 提供；未上傳 R2。第一人稱入口為 electricity_lab_first_person.html，原首頁不替換。

## 模組定位

| 檔案 | 工作 |
| --- | --- |
| src/lab-layout.js | 站點、實物碰撞、可達範圍 |
| src/first-person.js | 第一人稱鏡頭及移動，不依賴角色 |
| src/game-fp.js | 入口、互動、HUD、存檔和素材整合 |
| src/electroscope-station.js | 原桌與驗電器，不重建原幾何 |
| src/friction.js / friction-station.js | 原有摩擦模型與立體演示 |
| src/inquiry-engine.js / inquiry-view.js | 旁桌規則與 2.5D 視覺 |
| scripts/build-electricity-lab.py | 可重建的 Blender 模型與網頁 GLB |

## 驗證與回復

`npm test`：33 項，包含原兩套驗電器、摩擦、感應／接觸／極化、導航可達性與原幾何逐字比對。

`npm run test:browser`：真實 WebGL 渲染、七區走訪、主動觸發、正確電子方向／接地順序、像素差、舊存檔／經驗、無人物下載、16:9 桌面／觸控尺寸、直式提示。

`artifacts/first-person-lab/` 有 Blender 與網頁預覽截圖，不提交 Git。歷史 tests/game.test.cjs、friction-browser.test.cjs 假設舊入口，留作歷史參考，現行瀏覽器腳本已改為 first-person-browser.test.cjs。

若教師不要此方向，以正式提交另開還原工作，而不是硬重設或刪除角色庫。未經要求不動既有存檔。
