# Changelog

開發日誌：依日期記錄前端各階段的變更與設計決策。每則包含背景（為何做）、變更（做了什麼）、設計決策（為何這樣做）、學習筆記、已知限制 / 後續。

## 2026-10-07 — 明確 id 載入 + 信任後端（移除 isDisplayableAsset）、光源標籤改用 3D 文字（修 React 19 unmount 警告）

**背景**
- 後端 `GET /assets` 改回摘要（`{ id, name }[]`），列表不再帶 `config`；且資料髒掉是資料問題，不該由前端掃 `config` 猜哪一筆能顯示。

**變更**
- 型別：新增 `AssetSummary = { id, name }`，與後端一致（types/asset.ts）
- 契約：`AssetRepository.list()` 改為 `Promise<AssetSummary[]>`（data/assetRepository.ts）
- 實作：local `list()` 回 `assets.map(...)` 摘要；http `list()` 改 `request<AssetSummary[]>`（data/localAssetRepository.ts、data/httpAssetRepository.ts）
- 載入：hook 改為先 `list()` 取第一筆再 `get(id)`（hooks/useAssetConfig.ts），`isDisplayableAsset` / `isVec3` 移除
- 狀態：`config` 回傳給 `Viewer`（`asset?.config ?? defaultConfig`，載入失敗自然回退）；`setConfig` 維持函式形式；`save` 改為 `{ name: asset.name, config: asset.config }` 並以 `setAsset(updated)` 更新
- 出入口：`DEFAULT_ASSET_ID` 改名（原 `localDefaultId`，無 fallback）並加 `?? "1"`、`data/index.ts` 重新匯出；`vite-env.d.ts` 宣告 `VITE_DEFAULT_ASSET_ID`；`.env.example` 補範例

**設計決策**
- 前端只處理「請求失敗」，不重驗資料形狀：寫入端驗證（後端 `validateUpdateAssetInput`）、讀取端信任（型別）；這取代前端用 `isDisplayableAsset` 掃列表挑第一筆的舊做法
- `loadAsset` 用 `useCallback` 包起來並放進 `useEffect` 依賴：普通函式配空陣列會觸發 `react-hooks/exhaustive-deps` 警告；同時保留未來重複呼叫的可能
- 載入走「`list` 挑 → `get` 拿」兩段式：`list` 只做挑選（取第一筆，TODO 等選擇介面），驗證仍不做（由後端保證）；單一筆的 `get(DEFAULT_ASSET_ID)` 雖少一次請求，但遇到環境 id 對不上的情況較難發現，現階段通用性優先
- `loadAsset` 不在同步段呼叫 `setLoading(true)`：`useEffect` 內同步 setState 會觸發 `react-hooks/set-state-in-effect`；掛載時 `loading` 本來就是 `true`，且 `.finally()` 保證結束時回到 `false`，同步那一次呼叫是多餘的
- `DEFAULT_ASSET_ID` 留在 `localAssetRepository` 並由 `data/index.ts` 轉匯出：local 記憶體資產與 remote 抓取用同一值，避免兩邊 id 對不上
- 不做新增 / 刪除資產：這個專案是做一個「看」模型的 Viewer，不是「管」模型的後台。
  資產有幾筆、叫什麼名字，是資料來源的事；Viewer 只負責讀出來、調角度、把改過的設定存回去。
  硬把新增 / 刪除塞進來，使用者會搞不清楚自己到底是在看模型、還是在管理模型庫，定位會糊掉。

**學習筆記**
- 問：為什麼 `useEffect` 裡用到的函式（例如 `loadAsset`）要先用 `useCallback` 包起來、再放進依賴陣列？直接寫普通的函式不行嗎？
  答：元件每次重新渲染，寫在裡面的函式都會被重新建立、變成「另一個」函式。如果把它列進 `useEffect` 的依賴陣列，React 會覺得「依賴每次都變」，於是每次渲染都重跑 effect，變成無限迴圈；但如果乾脆不列，`react-hooks/exhaustive-deps`（ESLint 檢查 effect 依賴有沒有列齊的規則）又會警告「你用了它卻沒列」。`useCallback`（幫函式記住身分：內容沒變就不換成新的）能讓同一個函式在重新渲染後仍是同一個身分，這樣既列進依賴、又不會無限重跑，兩邊都滿足，也不用關掉規則。
- 問：為什麼不能在 `useEffect` 的一開始就直接呼叫 `setLoading(true)`？（`react-hooks/set-state-in-effect` 這條規則在擋什麼？）
  答：這條規則在擋「effect 一進來就同步改 state」的寫法。effect 是在畫面渲染完之後才執行，若一進去又同步設一次 state，React 會立刻再排一次渲染，等於多繞一圈、也多一次沒必要的重繪。以本專案來說，`loading` 初始值本來就是 `true`，而載入流程最後的 `.finally()` 一定會把它設回 `false`，所以那句同步的 `setLoading(true)` 是多餘的，直接拿掉即可。
- 問：為什麼開發模式下瀏覽器的 Network 面板會看到 `GET /assets` 送了兩次、正式打包（build）後卻只送一次？而 `PUT` 又只送一次？
  答：因為 `main.tsx` 包了 `<StrictMode>`。StrictMode 在開發模式會故意把每個 effect 走成「掛載 → 清除 → 再掛載」一輪，用來提早抓出沒寫好清除邏輯的程式；負責載入資料的 effect 因此被觸發兩次，`GET` 就跟著送兩次。這是開發模式才有的行為，正式打包不會這樣，所以 production 只送一次。`PUT` 只送一次，是因為它掛在「使用者按儲存」的事件上、不是掛在 effect，StrictMode 不會去重跑事件處理，自然只發一次。

**已知限制 / 後續**
- 目前只編輯預設一筆；多筆資產的選擇介面出現時，再接上 `list()` 摘要

**背景**
- 開發模式每次載入頁面，Console 都會出現 `Attempted to synchronously unmount a root while React was already rendering...`。追查後確認不是本專案程式碼：drei 的 `<Html>` 為了顯示 HTML 內容，會額外建立一個巢狀 React root，並在其 `useLayoutEffect` 的清除函式中「同步」呼叫 `unmount()`；搭配 `main.tsx` 的 `<StrictMode>`（開發時會把 effect 跑成「掛載 → 清除 → 再掛載」），該清除落在 React 的 commit 階段，剛好命中 React 19 的偵測。屬已知上游問題（pmndrs/drei#2867），10.8 / 11 alpha 仍未修。

**變更**
- Lights.tsx：光源位置標籤由 drei `<Html>` 改為 `<Text>`（場景內 3D 文字），不再建立巢狀 DOM root

**設計決策**
- 警告只在 dev 出現、不影響功能，但會污染 Console；上游未修、升級 drei 也無效，因此改在本機端處理
- 標籤本來就只是光源的 debug 標記，改用畫在場景內的 3D 文字比疊一層 HTML 更貼合用途，也讓 production 完全不牽扯巢狀 root

**已知限制 / 後續**
- `<Text>` 未指定 `font` 時，預設會向 CDN 抓 Roboto 字型；若要離線或固定字型需自帶 `.woff`（留意 `vite.config.ts` 的 `base` 路徑）
- 標籤改為世界座標大小，鏡頭拉遠會變小；原本 `<Html distanceFactor>` 是維持固定螢幕大小，如需固定需另外依距離縮放

**學習筆記**
- 問題：為什麼 React 專案載入時，瀏覽器開發者工具的 Console 會出現「Attempted to synchronously unmount a root while React was already rendering」這條警告？
  答：這是 React 19 在開發模式的提醒。當某段程式在 React「正在渲染 / 提交」的過程中，去卸載另一個 React root 時就會出現。本專案的觸發點是 drei 的 `<Html>`：它為了顯示 HTML 內容，會在同一頁另外建立一個獨立的 React root，而移除時是「同步」卸載，被 React 偵測到。改用畫在場景內的 3D 文字 `<Text>`（不會另開 root）後，警告就消失了。
- 問題：為什麼畫面明明是第一次載入，開發模式卻好像在「卸載」東西、觸發這個警告？
  答：因為 `main.tsx` 用了 `<StrictMode>`。StrictMode 在開發模式會故意把每個 effect 執行成「先掛載、再清除、再掛載一次」，用來提早抓出沒寫好清除邏輯的程式；那個「清除」正好讓 drei `<Html>` 觸發一次同步卸載，所以第一次開頁面也會看到警告。

## 2026-10-05 — Asset id 改為字串（對齊 BIGINT）

**背景**
- 後端 `pg` 讀 `BIGINT` 主鍵一律回傳字串，且 `BIGINT` 可能超出 JS `number` 的安全整數範圍（2^53−1）。2026-10-04 把 id 改成 `number`，會在多一層轉換時留下精度風險。

**變更**
- 型別：`Asset.id` 改為 `string`（types/asset.ts）
- 契約：`AssetRepository` 的 `get` / `update` 參數改為 `id: string`（data/assetRepository.ts）
- 實作：http 不再需要 `String(id)`，直接帶入路徑（data/httpAssetRepository.ts）
- 實作：`DEFAULT_ASSET_ID` 由 `1` 改為 `"1"`（data/localAssetRepository.ts）

**設計決策**
- id 一路用字串（後端 JSON → 前端型別 → 網址路徑），與後端契約一致
- id 是識別碼、不做運算；用字串可避免 BIGINT 轉 number 的精度問題，也為之後換 UUID 留餘地
- 取代 2026-10-04「Asset id 對齊後端數字主鍵」

**已知限制 / 後續**
- 多筆資產的選擇 / 新增 / 刪除介面尚未補上

## 2026-10-04 — Asset id 對齊後端數字主鍵

**背景**
- 後端 `assets` 資料表已定為 `BIGINT` 自動編號，前端 `id: string` / `"default"` 跟契約對不上，一起改掉。

**變更**
- 型別：`Asset.id` 改為 `number`（types/asset.ts）
- 契約：`AssetRepository` 的 `get` / `update` 參數改為 `id: number`（data/assetRepository.ts）
- 實作：http 拼網址時轉字串；local 的 `DEFAULT_ASSET_ID` 改為 `1`，對齊後端自動編號的第一筆（data/httpAssetRepository.ts、data/localAssetRepository.ts）

**設計決策**
- `DEFAULT_ASSET_ID = 1` 只是暫時對齊第一筆，之後有多筆資產再補選擇介面（詳見後端 CHANGELOG 2026-10-04）

**已知限制 / 後續**
- 多筆資產的選擇 / 新增 / 刪除介面尚未補上

## 2026-10-03 — 前端資料層接縫（Backend Seam）

**背景**
- Phase 2 要接後端 API；在後端完成前，先把前端的資料存取方式整理好，讓後端完成後只需換掉實際做法，不用改使用它的程式。

**變更**
- 型別：新增 `Asset = { id, name, config: ViewConfig, updatedAt }` 與 `AssetInput`（types/asset.ts）
- 契約：新增 `AssetRepository`（list / get / update），其他程式只跟這個固定寫法打交道（data/assetRepository.ts）
- 實作：local（存在記憶體，預設使用）與 http（等後端）兩種；由 `VITE_API_BASE_URL` 決定用哪一種（data/、api/）
- 狀態：新增 `useAssetConfig`，非同步載入目前資產，失敗時 fallback `defaultConfig`（hooks/useAssetConfig.ts）
- UI：Viewer 改用 hook，新增 loading / error 提示與 Save 按鈕；Color Picker 與 Reset Camera 不變（Viewer.tsx / Viewer.css）
- 環境：新增 `.env.example`，並以 vite-env.d.ts 宣告 `VITE_API_BASE_URL` 型別

**設計決策**
- 資料是使用者可以改的設定（相機位置、顏色這類），整包存進後端的 JSON 欄位即可
- `list` 先留著：之後後端用 SQL 資料表存多筆模型時，讀取列表本來就需要它
- 資料的寫法直接用手寫的 TS 型別；`import.meta.env` 的型別用 vite-env.d.ts 補上
- local 的做法是存在記憶體裡一筆 `id: "default"` 的資料：網站是純靜態頁，沒設定 env 時全程不打網路
- 資料是普通的陣列 / 數字 / 字串，直接用瀏覽器和 Node 內建的 `structuredClone` 深拷貝，不用額外裝 lodash 的 `cloneDeep`；也讓安裝的套件和打包體積少一點

**學習筆記**
- `structuredClone` 是瀏覽器和 Node 內建的深拷貝做法，以前大家習慣用 lodash 的 `_.cloneDeep`；資料單純時用它就夠了
- `request` 的 `<T>` 是泛型佔位符：使用時填入 `Asset` / `Asset[]` / `void` 就得到對應型別
- C# 也有泛型（`List<T>` / `Dictionary<TKey, TValue>`），概念跟 TS 的 `<T>` 一樣；C# 的 `dynamic` 類似 TS 的 `any`（都是關掉編譯期的型別檢查），現代 C# 只有在 COM 互操作、舊式動態 JSON、`ViewBag` 等情況才會看到，新程式能免則免
- TS 的 `any`、C# 的 `dynamic`、Java 的 `Object` 轉型，都是繞過型別檢查的寫法：知道有這些就好，平常少用；本專案一律不用 `any`

**已知限制 / 後續**
- remote 還沒有真正的後端可以接；`list` 目前沒有介面在使用，先留著等後端
- 之後後端可以存多筆模型時，再補選擇 / 新增 / 刪除的介面

## 2026-10-01 — 狀態架構重構

**背景**
- 顏色狀態與 config 脫鉤；需把狀態收斂成單一來源，並把相機與資產設定分離。

**變更**
- 型別：新增 `ViewConfig = { camera: CameraConfig; cube: CubeConfig }`，Viewer 與 Scene 共用（types/viewer.ts）
- 預設值：新增 `defaultConfig` 組合 `defaultCameraConfig` + `defaultCubeConfig`（config/view.ts / camera.ts / asset.ts）
- 狀態：Viewer 以 `useState<ViewConfig>(defaultConfig)` 持有唯一狀態來源
- Color Picker 經由 `setConfig` 不可變更新，不再與 config 脫鉤（Viewer.tsx）
- 渲染：Scene 純分發 `config.cube.color`
- `controlRef` 維持命令式物件，不進入 `config`
- `SceneProps` 簡化為 `{ controlRef; config }`
- `CameraConfig.position` 改用 tuple `[number, number, number]` 對齊 React Three Fiber Camera Props
- `Canvas camera={config.camera}` 使用同一份 Camera Config

**設計決策**
- `controlRef`（不可序列化命令式物件）與 `config`（可序列化純資料）分層
- `config` 可直接 `JSON.stringify`，未來可用於 Preset / localStorage / API
- `Canvas camera` 僅初始化時有效；後續 Camera Config 變更不會自動同步畫面

**已知限制 / 後續**
- Camera Config 變更後不會自動同步畫面（需 key 重建 Canvas 或 useThree 同步）

## 2026-09-30 — 基礎渲染驗證

**背景**
- 從零建立最小可驗證的 React Three Fiber 渲染鏈，確認 Canvas → Scene → 物件 / 光源的組合正確。

**變更**
- 場景：Viewer 以 Canvas 承載 Scene（Viewer.tsx / Scene.tsx）
- Cube：2x2x2 boxGeometry + meshStandardMaterial，底部貼齊 y=0 格線（Assets.tsx）
- 光源：ambientLight + 兩組 directionalLight，並以球體 + Html 標記光源位置（Lights.tsx）
- 輔助：axesHelper + gridHelper（DebugHelper.tsx）
- 全螢幕版型：`#root` 移除 Vite 預設 1126px 限制，改由 html/body/#root 繼承高度（index.css）

**設計決策**
- 標記球使用 meshBasicMaterial，而非 Standard Material：標記須保持原色、不受場景燈光染色
- Cube 底部貼齊 y=0 格線，避免一半沉入格線下

**已知限制 / 後續**
- Html label 無 occlude，被遮擋時仍顯示
- 無陰影：需 Cube + directionalLight + shadow map 三處配合
- DebugHelper 常駐：原型階段保留格線
