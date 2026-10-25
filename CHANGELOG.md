# Changelog

開發日誌：依日期記錄前端各階段的變更與設計決策。每則包含背景（為何做）、變更（做了什麼）、設計決策（為何這樣做）、已知限制 / 後續。學習筆記另外放在 [LEARNING.md](./LEARNING.md)。

## 2026-10-25 — glTF 載入、材質列表與改色

**背景**
- 後端 `GET /models/:modelKey` 已能上線，真實 glTF 模型終於有穩定出處；資產用 `modelKey` 指到哪個模型，不存絕對 URL。
- 需求是「看得到模型、知道載到哪、能點材質改色」三件事一次做完：載入、進度、材質面板缺一不可。

**變更**
- `src/constants/model.ts`（新增）：`DEFAULT_CUBE_MODEL_KEY = "default-cube"`，cube 與 glTF 的分支只認這個值。
- `src/types/modelMaterial.ts`（新增）：`ModelMaterialInfo`（id / name / meshNames / textureTypes / color），材質清單的資料形狀。
- `src/components/3d/Scene.tsx`：新增 `ShowModel`，依 url 用 `useGLTF` 載入 glTF；`model` 經 `useMemo` 處理：clone 場景、每 mesh 複製獨立材質、最長邊縮放到 2 單位並置中；`modelKey` 為 `default-cube` 時走內建立方體，否則走 `Suspense` 包住的 `ShowModel`。
- 材質上報：`model` 變動時 traverse 全場景，用 `material.uuid` 去重，收集名稱 / mesh 名 / 貼圖型別 / 顏色，經 `onMaterialsChange` 傳給 Viewer。
- 顏色覆寫：`materialColorOverrides` 變動時 traverse 全場景，用 uuid 查表改色（只改記憶體，不寫回後端）。
- `src/components/Viewer.tsx`：`materials` / `selectMaterialId` 兩組 state + `materialColorOverrides`（`Object.fromEntries` 由材質陣列轉成 uuid→顏色字典）；`useProgress` 追蹤模型檔下載進度（與資產設定 API 的 `loading` 是兩件事）；Cube 顏色選擇器只在 cube 模式顯示。
- `src/components/Viewer.css`：新增 `.material-panel` / `.material-item` 等材質面板樣式。
- `src/hooks/useAssetConfig.ts`：回傳值新增 `modelKey`（`asset?.modelKey ?? DEFAULT_CUBE_MODEL_KEY`）；載入改為依 `DEFAULT_ASSET_ID` 找資產，找不到退回第一筆。
- `src/data/localAssetRepository.ts`：`DEFAULT_ASSET_ID` 預設由 `"1"` 改為 `"2"`；`modelKey` 改用 `DEFAULT_CUBE_MODEL_KEY` 常數。
- `src/components/3d/Lights.tsx`：`ambientLight` 強度由 `0.05` 調為 `1`（模型模式下場景太暗）。

**設計決策**
- 材質上報與顏色覆寫是**兩支獨立** `useEffect`，不能合併：合併成一支會讓「改色 → 觸發上報 → 上報的顏色是舊值」形成循環，最後顏色被洗回原始值。分開寫讓資料只往一個方向流：模型 → 上報（一次），顏色 → 覆寫（每次）。
- `Scene` 內兩個 `clone` 用途不同：第一處 clone（`model` 的 `useMemo`）是「拿到載入結果先複製再調整，避免污染快取」；第二處（`material` 欄位）是「每個 mesh 給獨立材質實體，改一個 mesh 的顏色不影響共用同一材質的其他 mesh」。
- 顏色型別走過 `as THREE.MeshStandardMaterial` 轉型：`THREE.Material` 基底型別沒有 `color` 與貼圖欄位，不轉就拿不到。
- `useProgress` 與資產載入的 `loading` 是兩件事：`loading` 是資產設定 API（幾 KB 的 JSON），`useProgress` 追的是 three.js 下載管理器（7.8MB 的模型檔）；進度浮層只在「設定已載入、且 modelKey 不是 cube」時顯示。
- local 模式（未設 `VITE_API_BASE_URL`）看不到進度條是預期行為：`modelKey` 是 `default-cube`，走內建立方體，根本不載入模型檔。

**學習筆記**
3 則，見 [LEARNING.md](./LEARNING.md) 的 2026-10-25 段。

**已知限制 / 後續**
- 材質改色不持久化：`ViewConfig` 只有 `camera` 與 `cube.color`，改的材質顏色只存在前端 state，重載就回到原始色。之後若要存，需把材質顏色寫進 config。
- `KHR_materials_variants` 的三種變體（Beach / Midnight / Street）未做切換 UI，目前只呈現預設變體再改色。
- `DEFAULT_ASSET_ID = 2` 是暫定對齊測試資料；選擇介面出來後改由使用者挑選。
- 模型垂直置中而非底部貼 `y=0`：`position` 以 `box.getCenter()` 校正（`Scene.tsx:63`），高度 2 單位的模型有一半沉在格線下（Cube 模式的 `position=[0,1,0]` 沒有這問題）；修正要用 `box.min.y`。
- 輔助元素（`axesHelper` / `gridHelper` / 光源標記）常駐、無開關：目前寫死在 `Scene.tsx`，尚未提供 UI 切換。


## 2026-10-24 — 管理者登入面板（遠端模式）與寫入權限對齊

**背景**
- 後端 `PUT /assets/:id` 已加上 `requireAdmin`（驗證管理者身分的中介層），前端 Save 沒帶 token，正式環境存檔會被 401（未授權）擋下。
- remote 模式（有設定 `VITE_API_BASE_URL`）需要登入入口；local 模式（GH Pages 靜態展示）沒有後端也沒有寫入保護，不該出現登入框。

**變更**
- `src/api/adminToken.ts`（新增）：模組層級變數保存 token，提供 `setAdminToken` / `getAdminToken` / `clearAdminToken`
- `src/App.tsx`：新增管理者登入面板，只在 `isRemoteDataSource` 為 true 時渲染；密碼輸入 + `POST /auth/login`，成功後存 token 並切換 `isAdmin`，登入中鎖住按鈕、失敗顯示錯誤、提供 Logout；登入按鈕為 `type="submit"`，表單以 `onSubmit` 送出（點擊與 Enter 皆可觸發）
- `src/data/index.ts`：`isRemoteDataSource` 改為具名匯出，供 App 與 Viewer 共用同一個判斷
- `src/data/httpAssetRepository.ts`：`update()` 帶上 `Authorization: Bearer <token>`（有 token 才加）
- `src/components/Viewer.tsx`：新增 `canSave` prop，只有 `!isRemoteDataSource || isAdmin` 時顯示 Save

**設計決策**
- token 只存記憶體（模組變數），不寫 `localStorage`：原型階段沒有「記住登入」需求，存進瀏覽器會讓 token 在 XSS（跨站腳本：惡意程式碼在別人瀏覽器執行的攻擊）下長期外流；代價是重整頁面要重新登入
- 登入面板只在 remote 模式渲染：local 模式的 Save 只寫記憶體，沒有任何權限概念，顯示登入框只會讓人誤以為存檔需要密碼
- Save 顯示條件寫成 `!isRemoteDataSource || isAdmin` 而不是 `isAdmin`：靜態 demo 要能直接按 Save 展示，remote 模式才收斂成需登入
- 用 `<form onSubmit>` 而不是按鈕 `onClick`：`required` 的原生檢查與 Enter 送出直接可用，語意上也才是「送出一份表單」
- 登入狀態先留在 `App.tsx` 不拆元件：目前只有一組輸入加一顆按鈕，拆出去只是為了拆而拆；等 Phase 3 有多個面板再抽出 `AdminPanel`
- 失敗訊息暫留 API 原文（例如 `API 401 ...`）：開發期能分辨是密碼錯還是後端沒開；要對外展示時應改成一句中文

**學習筆記**
1 則，見 [LEARNING.md](./LEARNING.md) 的 2026-10-24 段。
**已知限制 / 後續**
- token 存記憶體，重整頁面後 `isAdmin` 與 token 都會消失，需重新登入
- token 15 分鐘後過期，前端不會主動偵測：`isAdmin` 仍為 true，直到按 Save 收到 401 才發現；後續應在 401 時自動清除登入狀態並提示重新登入


## 2026-10-23 — Asset 新增 modelKey（對齊後端）

**背景**
- 後端 `Asset` 回傳形狀新增 `modelKey`（對應模型檔案的 key，Phase 3 切換模型的基礎），前端型別必須同步，否則契約對不上。

**變更**
- `src/types/asset.ts`：`Asset` 新增 `modelKey: string`（必填）
- `src/data/localAssetRepository.ts`：local 初始資產補 `modelKey: "default-cube"`（與後端 migration `004` 的回填值一致）；`update()` 以展開運算子保留原有欄位，不需額外處理
- `src/data/httpAssetRepository.ts`：以 `request<Asset>` 直接吃後端回應，不需改動（後端已回 `modelKey`）

**設計決策**
- `modelKey` 設為必填而非可選：後端保證每次都回，設必填才能在編譯期（`npm run build` 的 `tsc -b`）抓到漏接的地方；這次就是靠這個機制在本地發現 `localAssetRepository` 沒同步
- 本地回填值固定 `"default-cube"`：對齊後端既有資料，local 與 remote 看到的是同一筆資產

**已知限制 / 後續**
- `modelKey` 目前只存著未被使用：真正依 key 載入不同模型是 Phase 3 的 glTF 工作（載入進度、資產選擇介面）


## 2026-10-22 — API 請求逾時與 GET 重試、載入 / 儲存錯誤分離、Retry 與收尾（Error Boundary、CI lint）

**背景**
- 後端在 Render 免費方案、資料庫是 Neon 免費方案，兩者閒置後會休眠；冷啟動時第一個請求可能等上數十秒或直接失敗，這件事在本機開發完全遇不到。
- 前端原本只用 fetch 最基本的寫法：沒有逾時（請求卡住時 Promise 一直 pending，畫面停在 Loading）、沒有重試，而且載入與儲存共用同一個 `error`，存檔失敗的訊息會被下一次載入結果蓋掉。
- 目標是：請求有等待上限、暫時性失敗自動重試、慢速載入看得出來、失敗後使用者能自己重試。

**變更**
- `src/api/client.ts`：新增 `REQUEST_TIMEOUT_MS`（65000）、`MAX_GET_RETRIES`（2）、`fetchWithTimeout()`（以 `AbortController` + `setTimeout` 補上 fetch 沒有的逾時，並轉接呼叫端的 `signal`、`finally` 移除監聽）、`shouldRetry()`（408 / 429 / 500 / 502 / 503 / 504）、`getRetryDelay()`（`1000 * 2 ** attempt`）、`withRetry()`（GET 最多 3 次嘗試、非 GET 只 1 次、重試前 `response.body?.cancel()`）；`request()` 改走 `withRetry()`
- `src/hooks/useAssetConfig.ts`：`error` 拆成 `loadError` / `saveError`，載入成功時兩者一併清除；新增 `slowLoading`（起始 `false`）與 5 秒計時 effect（`loading` 為 true 時計時、依賴變動或卸載時清除）；新增 `retry()`（重設 `loading` / `slowLoading` 後重新載入）；`save()` 在沒有資產時改為設定 `saveError`，不再靜默 return
- `src/components/Viewer.tsx`：載入中依 `slowLoading` 顯示 `Loading asset...` 或 `Service starting, please wait...`；載入失敗顯示 `Load failed: <訊息>` 加 Retry 按鈕；儲存失敗獨立顯示 `Save failed: <訊息>` 並附行動指示（press Save to try again）
- `src/components/Viewer.css`：新增 `.asset-retry` 與 `.asset-retry:hover`
- `src/components/3d/Scene.tsx`：`OrbitControlsImpl` 改用 `import type`（只當型別用，不進 bundle）
- `.env.example`：`VITE_DEFAULT_ASSET_ID` 的註解改為「local 資料源使用的資產 id」（remote 模式改由 `GET /assets` 取第一筆）
- `README.md`：Features / Roadmap / Usage 補上逾時、GET 重試、慢速載入提示、Retry 與環境變數說明
- `src/components/ErrorBoundary.tsx`（新增）：以 class component 接住 `<Canvas>` 在 render 期丟出的錯誤，`Viewer.tsx` 改以 `<ErrorBoundary>` 包住 `<Canvas>`
- `.github/workflows/deploy.yml`：`Build` 之前新增 `npm run lint` 步驟

**設計決策**
- 逾時訂 65 秒：Render 冷啟動加上 Neon 喚醒的實測等待在數十秒量級，取比最壞情況再寬一點；太短會把「正在啟動」誤判成失敗，太長則失去逾時的意義
- 只有 GET 自動重試：PUT 是使用者主動按下的寫入，重送等於再寫一次，成功時的回應也可能被誤認為第二次操作；閱讀類請求重送沒有副作用
- 重試 2 次、間隔 1 秒與 2 秒：Render 冷啟動最常見的失敗是第一次連線直接被拒，短時間內再試就會過；更長的退避只是讓使用者多等
- 重試前先 `response.body?.cancel()`：不讀 body 就丟掉 response，連線不會被釋放，重試幾次就把可用連線佔滿
- 逾時用 `controller.abort(new Error(...))` 帶訊息：畫面顯示得出「是等太久」，而不是瀏覽器籠統的 `Failed to fetch`
- 呼叫端的 `signal` 用轉接而非直接傳入：一次 fetch 只能吃一個 signal，但這裡要同時支援「自己計時」與「呼叫端取消」兩種來源；`finally` 拆掉監聽，避免每送一次請求就累積一個 listener
- 慢速提示等 5 秒才出現：一般請求都在 1 秒內，立刻顯示「啟動中」會讓正常情況看起來像卡住；5 秒是「明顯不正常」的門檻
- `slowLoading` 初始值為 `false`：`loading` 一開始就是 `true`，若 `slowLoading` 也給 `true`，首次 render 就會顯示啟動訊息
- 載入與儲存錯誤分開、只有載入提供 Retry：載入失敗重試是安全的；儲存失敗再按一次 Retry 等於重複寫入，交給使用者自己決定要不要再按 Save
- 儲存失敗只改文案、不加自動重試：PUT 非冪等，自動重試等於重複寫入；一行行動指示（press Save to try again）讓使用者知道下一步，不誤導成「系統會自動補償」
- 錯誤訊息保留固定前綴（`Load failed:` / `Save failed:`）加原始訊息：一眼分得出是哪一段失敗，除錯時仍看得到後端回傳的內容
- lint 放進 CI 且排在 build 之前：格式與未使用變數不該等到部署才發現；lint 比 build 快，先跑能更早失敗、回饋更短
- ErrorBoundary 用 class component：React 目前沒有對應的 hook；只包 `<Canvas>` 而不是整個 App，讓 3D 掛掉時錯誤訊息與按鈕仍可用
- ErrorBoundary 只顯示訊息、不提供重試：render 期錯誤多半來自環境（WebGL 不可用）或程式缺陷，重新渲染不會改善，給重試按鈕反而是錯誤期待
- CI 只加 lint、不加測試：目前沒有測試可跑；`npm run build` 內含 `tsc -b`，型別錯誤本來就會擋下部署
- `WebSocket / Realtime` 不做：單人檢視器沒有協作與衝突問題，而 Render 免費方案會休眠，長連線本來就不適合這種部署；把它留在 Roadmap 只會給人「以後會做」的錯誤期待
- 自動化測試不做：型別由 `tsc -b`、契約由後端驗證把關，prototype 階段沒有回歸風險需要測試網保護；若日後要補，優先測 `client.ts` 的重試邏輯（需注意該檔用了 `window.setTimeout`，測試環境要 jsdom）

**學習筆記**
4 則，見 [LEARNING.md](./LEARNING.md) 的 2026-10-22 段。
**已知限制 / 後續**
- 只有文字提示，沒有進度百分比或剩餘時間
- 儲存失敗不提供重試按鈕，使用者要自己再按一次 Save
- 開發模式下 `StrictMode` 會讓載入 effect 跑兩次，`GET /assets` 會送兩次（正式打包不會）
- 多資產選擇介面完成後，`retry()` 需改為重新載入當前選取的資產
- bundle 1.27 MB（gzip 358 kB）超過 Vite 500 kB 警告，暫不處理：three.js 佔主要體積，拆 chunk 只改善快取、不減總量，等展示就緒前再評估

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
3 則，見 [LEARNING.md](./LEARNING.md) 的 2026-10-07 段。
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
2 則，見 [LEARNING.md](./LEARNING.md) 的 2026-10-07 段。
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
4 則，見 [LEARNING.md](./LEARNING.md) 的 2026-10-03 段。
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
