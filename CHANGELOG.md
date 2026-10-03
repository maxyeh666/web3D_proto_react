# Changelog

開發日誌：依日期記錄前端各階段的變更與設計決策。每則包含背景（為何做）、變更（做了什麼）、設計決策（為何這樣做）、已知限制 / 後續。

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
