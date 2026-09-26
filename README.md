# 物理男孩：實驗室大冒險

2026-09-26 第一人稱分區版，獨立 HTML 試玩版。這是獨立 Lab Quest 倉庫；原 Physical-Boys 教材只讀，沒有改動。

## 本版玩法

24 × 14 遊戲單位的大實驗室，地板面積約原版 2.19 倍，有隔牆、走廊和七個實驗區。玩家先出現在范德格拉夫炸毛展示前，再自由探索摩擦、氣球與黑板、感應、接觸、萊頓瓶與原驗電器。路過不強制開任務；每張桌由玩家按互動鍵開始。

- WASD／方向鍵或左下搖桿：移動。
- 拖曳畫面：轉頭；Q／R 或右下兩個轉頭按鍵也可使用。不要求 Pointer Lock。
- E／互動鍵：走近器材後主動操作。
- 桌面採固定 2.5D 視角：原驗電器與摩擦桌是立體模型的正交特寫，旁桌是有深度提示的 Canvas 科學示意。
- 驗電器使用同一顆搖桿連續調整棒距離；氣球維持遠／中／近三段。
- 「返回實驗室」／Esc：回原站位與朝向，不瞬間傳送到另一張桌。
- 導覽圖只導覽，不自動接任務；背包與原存檔仍在右上角。
- 整個遊戲與控制在 16:9 橫式框內，不需要捲頁；直式有橫向使用提示。

March、曉臻老師與舊角色素材留在庫內，本版入口不下載角色、不顯示人物或手臂動畫。角色、服裝、物品與新獎勵系統延後，不刪除既有存檔。

## 內容與邊界

| 區 | 已做 |
| --- | --- |
| 01 范德格拉夫 | 既有炸毛現象與主動觀察；不是精密起電機模擬 |
| 02 摩擦 | 毛皮→塑膠尺；玻棒→絲絹，四個示意電子，預測／摩擦／解釋 |
| 03 氣球 | 明示乳膠＋羊毛衣物情境，中性黑板的束縛電荷極化；質性吸附 |
| 04 感應 | 正負棒、接地／斷地／移棒順序，原教材 6→2／10 電子模型 |
| 05 接觸 | 等大孤立金屬球，±8 與 0 接觸後各 ±4；分開保留 |
| 06 萊頓瓶 | 全新 Blender 模型，完整／剖面／拆解；充放電尚待確認 |
| 07 驗電器 | 原桌與器材尺寸逐字保留，原五題和連續分布公式 |

科學卡在 docs/concepts/。藍色表示電子／負電，紅色表示固定正電區。所有數值是教材示意單位，非庫侖或精密電場解。氣球實際吸附受材質／表面／濕度影響，本版材料選擇待老師試玩確認。

舊 +40／+60 經驗與 localStorage 存檔保留；新完成流程要求操作與概念回答。滿 100 經驗仍解鎖既有等大金屬球與琥珀工具箱。這版未新增貨幣、服裝、班級排名或完整密室解謎。

## 本機開啟

以 HTTP 開 electricity_lab_first_person.html，不用 file://。Three.js、GLTFLoader 與 GLB 均為本機資產，不需 CDN 或 npm 建置。

```sh
python3 -m http.server 8766 --bind 127.0.0.1
```

開 http://127.0.0.1:8766/electricity_lab_first_person.html 。

線上試玩：https://flyer19820218.github.io/Lab_Quest/electricity_lab_first_person.html 。原 index.html 保留 March 版本；這次依老師要求發布獨立頁面，資產由 GitHub Pages 提供，R2 未更新。

## Blender 原檔與重建

- assets/environment/electricity-gallery.blend：可編輯場景，材質、桌、隔牆、萊頓瓶分集合。
- assets/environment/electricity-gallery.glb：約 3.95 MB，合併材質與網格瘦身的網頁版本。
- assets/environment/leyden-jar.glb：約 128 KB，保留完整／剖面具名零件。
- scripts/build-electricity-lab.py：以遊戲座標建模，轉成 Blender Z-up，匯出後 Three.js Y-up 不需旋轉補丁。

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python scripts/build-electricity-lab.py
```

此命令重建本專案生成的 .blend／GLB／預覽圖；未加瘦身工具時環境 GLB 約 7.46 MB。可在命令後加 `-- --gltfpack /工具路徑/gltfpack` 重現約 3.95 MB 版本；使用普通頂點格式，不要求額外 Draco／Meshopt 解碼器。不要對老師手動細修後的 .blend 任意執行重建。

原驗電器幾何由 src/electroscope-station.js 保留，Blender 內的驗電器僅為配置參考，刻意不輸出到環境模型，避免雙重器材。

## 驗證

- `npm test`：33 項科學／導航／原幾何比對。
- `npm run test:browser`：需要 Playwright、pngjs 與本機 Chrome；走訪七區、主動觸發、WebGL 動畫像素差、科學流向／順序、舊存檔／經驗、16:9 桌面及 iPhone／iPad 尺寸。
- artifacts/first-person-lab/：Blender 和實際遊戲截圖，不進 Git。
- tests/game.test.cjs、friction-browser.test.cjs 假設歷史第三人稱入口，保留參考；現行脚本使用 first-person-browser.test.cjs。

模擬測試不等於真機 Safari。本次發布供老師試玩，仍需老師確認 iPhone／iPad 的載入、多指搖桿／轉頭與桌面操作。完整狀態／模組／回復說明見 docs/FIRST_PERSON_HANDOFF.md。

Three.js r160.1 與 GLTFLoader 為 MIT，見 vendor/THREE-LICENSE.txt。Blender 新模型由本專案程序生成；老師提供的角色仍在 assets/characters/。
