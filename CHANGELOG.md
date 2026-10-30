# Changelog

開發日誌：依日期記錄前端各階段的變更與設計決策。每則包含背景（為何做）、變更（做了什麼）、設計決策（為何這樣做）、已知限制 / 後續。學習筆記另外放在 [LEARNING.md](./LEARNING.md)。

## 2026-10-30 — 材質顏色存回後端、資產選擇器、GLB 載入失敗的 Retry

**背景**
- 10-29 的材質改色只存在前端 state，按 Save 不會寫回後端，重新載入就消失。
- 作品集近期終點要求「切得動資產、存得住設定」，但資產選擇介面（Phase 3）尚未實作。
- GLB 載入失敗後按 Retry 無效：`suspend-react` 把錯誤快取住，且載入與清除各自組 URL 字串，`useGLTF.clear()` 清不到同一個 key。
- 慢速提示文案寫著「Service starting, please wait...」，但切換資產同樣會啟動 5 秒計時，文案會誤導成「後端重啟中」。

**變更**
- `src/types/viewer.ts`：新增 `ModelConfig`（`materialColorOverrides: Record<string, string>`，key 為材質槽 id、值為 `#rrggbb`）；`ViewConfig` 新增 `model` 欄位。
- `src/config/view.ts`：`defaultConfig` 補上 `model: { materialColorOverrides: {} }`；`normalizeViewConfig` 在 `model` 缺失時補預設（遠端舊資料沒有該欄位）。
- `src/hooks/useAssetConfig.ts`：新增 `assetList` / `pendingAssetId` / `setPendingAssetId` / `loadSelectedAsset`（選擇器未選或選同一筆直接略過，避免重複請求）；初始載入、Save 回傳、切換資產三處都呼叫 `normalizeViewConfig`。`setConfig` 在 `asset` 為 `null` 時為 no-op（載入失敗、config 退回 defaultConfig，沒有可寫入目標）。
- `src/components/Viewer.tsx`：`setMaterialColor` 把覆寫寫進 `config.model`，`resetMaterialColor` 複製後 `delete` 該 key（回到原色）；新增資產 `<select>` + Load Asset（載入中、未選、選同一筆時鎖定）；材質面板在異常時鎖定編輯；新增 GLB 錯誤橫幅（條件見設計決策 4）；`retryModel` 改用 `getModelUrl` 同一字串清除快取並遞增 `modelRetryKey`；慢速提示改為「Still loading… the backend may be waking up. Please wait.」。
- `src/components/3d/Scene.tsx`：新增 `ModelErrorBoundary`（class component；`getDerivedStateFromError` 收錯誤、`componentDidCatch` 記日誌），`key` 綁 `modelKey:modelRetryKey`，fallback 用 cube 顯示當前顏色；`MaterialSlot` 新增 `originalColor`（取不到 `color` 的材質用 `#555555`，不再寫死 `#ffffff`）；套色改為 `materialColorOverrides[id] ?? originalColor`，有覆寫用覆寫、沒有用 GLB 原色。
- `src/data/localAssetRepository.ts`：改為兩筆示範資產（Default Cube / Blue Cube，id 預設 `"2"` / `"3"`，以 `VITE_DEFAULT_ASSET_ID` 覆寫其中之一）；深拷貝續用 `structuredClone`。
- `src/constants/model.ts`：`getModelUrl` / `isDefaultCubeModel` 為 URL 與模式判斷的單一來源；Scene 與 Viewer 的 Retry 共用同一輸出。
- `src/components/Viewer.css`：新增 `.asset-selector`（標籤 + 下拉 + 按鈕直排，鎖定時半透明）與 `.material-editor button` 圓角。

**設計決策**
- 覆寫表採用稀疏表而非整包顏色：缺 key 即代表用 GLB 原色，Reset 只需刪 key；整包存會混雜「使用者改過的」與「模型原本的」，模型換版本時整包顏色反而會蓋掉新原色。
- 後端 `model` 欄位設為可省略、但出現即嚴格驗：設必填會讓既有舊資料在部署後全部被 400；完全放行則錯誤值靜默進 DB，直到前端套色才失敗。寫入時由後端補預設值，讀取端永遠拿到完整形狀。
- `modelError` 同時記錄 `assetId` 與 `modelKey`：只有一組錯誤 state，切換資產或模型後舊錯誤會殘留，等於顯示不存在於當前畫面的錯誤；條件式要求兩者都等於當前值才顯示。
- `Retry` 必須用同一個 URL 字串：`useGLTF` 的快取 key 是「載入器 + url」參數陣列，字串不同清不到，快取的重拋錯誤會讓 Retry 永遠無效。
- 錯誤橫幅加 `!loading`：切換資產的載入期間不該閃出上一筆的錯誤；`canEditConfig` 同理維持 `!loading && !loadError`。
- `originalColor` 記在 slot 上、無 `color` 材質用 `#555555`：面板要能顯示「目前實際顏色」又不污染 GLB 原值；寫回 `#ffffff` 會讓免改色槽的顯示值與實際渲染（灰色）不一致。

**學習筆記**
10 則，見 [LEARNING.md](./LEARNING.md) 的 2026-10-30 段。

**已知限制 / 後續**
- 切換資產不會套用該資產的 `camera`：fiber 的 `camera` prop 只在 Canvas 初始化時建立 PerspectiveCamera，之後改 `config.camera` 不會更新畫面；目前得按 Reset Camera。要自動套用得用 key 重建 Canvas（會重載模型）或在 Scene 內用 `useThree` + `useEffect` 同步。
- 材質覆寫跨模型失效：覆寫 key 是節點路徑，換模型整組重算；即使 Save 已把覆寫寫回後端，切到別的模型仍對不上。
- 選擇器沒有「未儲存變更」警告：切換資產前未 Save 的編輯會被直接蓋掉。
- 後端資料庫目前只有 1 筆資產：remote 模式的選擇器只有一個選項，要展示多筆需新增 seed 資產。
- 載入失敗時 `asset` 維持上一筆成功值（只在成功時 `setAsset`），`currentAssetId` 也維持舊值；錯誤僅由 `loadError` 呈現。
- 無障礙缺口：3D 畫布本身無鍵盤操作（OrbitControls 只吃滑鼠，鍵盤無法旋轉視角）；按下 Retry 後焦點留在原地而非移往新的狀態。另材質槽清單用 `aria-pressed` 表達單選屬於折衷，嚴格做法是 `role="radiogroup"` + `role="radio"` 並以方向鍵切換。

---


## 2026-10-29 — 材質槽 id 改為節點路徑、輔助元素改常駐掛載

**背景**
- 10-26 的材質槽 id 用 `${mesh.uuid}:${materialIndex}`：uuid 由 three.js 在每次建立物件時生成，同一份模型重載或換模型後整組 id 都變，材質面板的選取狀態與顏色覆寫無法跨載入沿用。
- 輔助元素（光源標記）原本用條件渲染開關（`{showHelper && <LightMaker … />}`），第一次開啟時 `Text` 才開始載入字型、觸發 suspend；suspend 的邊界若落到 Canvas 內建的 Suspense，R3F 會把整個場景設為 `visible = false`，模型隨之短暫消失。

**變更**
- `src/components/3d/Scene.tsx`：新增 `getStableNodeSegment` / `getStableMeshPath`，材質槽 id 改為 `<節點路徑>:material[<序號>]`（例：`Shoe[0]/Sole[0]:material[0]`）；序號只跟同層同名兄弟比（同層新增其他名稱的節點不影響既有 id），節點名用 `encodeURIComponent` 跳脫（序號是純數字不跳脫），路徑不含載入容器。`MaterialSlot.material` 型別改為 `THREE.Material & { color?: THREE.Color }`，改色改用 `material.color?.set()`。模型垂直位置改為底部貼齊 `y=0`。
- `src/components/3d/DebugHelper.tsx` / `src/components/3d/Lights.tsx`：輔助元素改為常駐掛載、以 `visible` 屬性開關（`DebugHelper` 的 prop 由 `showMarkers` 改為 `visible`，內部用 `<group visible>`；`Lights` 的 `showMarkers` 由選填改必填），移除外層條件渲染；`Suspense` 邊界留在 `LightMaker` 內。
- `src/components/Viewer.tsx`：材質面板 `Mesh:` 欄位直接輸出 `meshName`，移除已無法觸發的 `No match mesh` fallback。
- `src/types/modelMaterial.ts`：`meshNames: string[]` 改為 `meshName: string`（10-26 記錄的「`meshNames` 已無實質意義」於本日完成）。

**設計決策**
- id 用節點路徑而非 uuid：同一份模型重載時節點樹相同、路徑必然相同，選取與顏色覆寫才有機會跨載入沿用（真正持久化仍需後端支援，見已知限制）。代價是 id 變長，且換模型後整組 id 仍會不同——不同模型的節點樹本來就不同。
- 輔助元素改常駐掛載、用 `visible` 開關：條件渲染會讓 `Text` 每次開啟都重新掛載，第一次必定 suspend；常駐後排版與字型在頁面載入時就完成，之後切換僅變更屬性，耗時可忽略。代價是沒開啟輔助元素的使用者也要付一次 troika 初始化，該成本在可接受範圍。
- `Suspense` 邊界刻意留在 `LightMaker` 內、不靠 Canvas 內建那一層：R3F 在 Canvas 內建 Suspense 觸發時會把整個場景設為不可見（含模型），邊界下移到標記本身後，suspend 期間只有標記缺席。完整機制見 LEARNING.md 的 2026-10-29 段。
- 模型底部貼齊 `y=0`：格線在 `y=0`，模型原本以原點為中心、底部會落到格線下方；貼齊後「站在地面上」較符合檢視習慣。

**學習筆記**
2 則，見 [LEARNING.md](./LEARNING.md) 的 2026-10-29 段。

**已知限制 / 後續**
- 換模型後 id 整組不同：顏色覆寫存在 `Viewer` 的 state、以 id 為 key，換模型即失效。行為與 10-26 相同，差別在失效原因從「uuid 重建」變成「節點樹不同」。
- `OrbitControls` 的 target 仍是原點：底部貼齊 `y=0` 後，旋轉是繞模型底面而不是模型中心；目前模型高度約 2，差異不明顯，後續可將 target 設為 bounding box 中心，或改為繞底部旋轉並說明用途。
- 材質收集只認 `THREE.Mesh`（含 `SkinnedMesh` / `InstancedMesh`），不含 `Line` / `Points` / `Sprite`：glTF 的三角形圖元不會產生這些物件；真要支援還要一併處理材質屬性差異（`LineBasicMaterial` 沒有 `normalMap` 等）與面板標示，屬於新需求。
- `<primitive object={model}>` 的 clone 材質與幾何沒有顯式 `dispose()`：切回 cube 模型後 clone 出來的材質仍留在記憶體，單一模型切換的洩漏量可忽略，多模型輪替時要補清理。

## 2026-10-26 — 材質槽改寫、Appearance 面板整合、輔助元素開關與手機版調整

**背景**
- 10-25 的材質面板按材質 uuid 合併：一個材質被多個 mesh 共用時只顯示一列，點哪一列、改到哪裡不易對應；且 cube 模式的顏色選擇器與 glTF 材質面板是兩套介面，做的卻是「改外觀」同一件事。
- 後端沒開時面板看似可用、實際改色無效（`setConfig` 對 `null` 資產不執行任何動作），載入錯誤又被面板遮住，使用者看不到原因；格線 / 座標軸 / 光源標記常駐顯示，無法隱藏；窄螢幕下控制項仍是桌機版固定定位。

**變更**
- `src/components/3d/Scene.tsx`：材質收集改為「材質槽」（一個 mesh 的一個材質 = 一個 slot），id 用 `${mesh.uuid}:${materialIndex}`；上報與改色共用同一份 `materialSlots`，上報時直接送 `slot.info`，不再另建一次。
- `src/components/Viewer.tsx`：cube 顏色選擇器與 glTF 材質面板合併為同一個「Appearance」面板；新增 `canEditConfig`（`!loading && !loadError`），資產未載入時輸入框鎖住並顯示唯讀提示；材質選取改為渲染期推導 `effectiveSelectedId`（失效時退回第一筆）；新增 `showHelper` 開關。
- `src/components/Viewer.css`：面板樣式整合為 `.appearance-panel`；`.viewer-status` 移到左下並加 `z-index: 20`（先前被面板 `z-index: 10` 蓋住）；`<=600px` 媒體查詢調整面板與控制項位置、狀態訊息移到下方；刪除 `.color-picker` 舊樣式與重複的 `.asset-save` / `.camera-reset` 規則。
- `src/components/3d/Lights.tsx`：`LightMaker` 新增 `showMarkers`（是否顯示光源位置標記），由 `Scene` 依 `showHelper` 傳入；格線與座標軸由 `DebugHelper` 同步開關。
- `src/App.tsx` / `src/App.css`：管理面板改為收合式（窄螢幕下按鈕開關，桌機維持常開）；補回 `.admin-panel` 遺失的 `display: flex` 四行（密碼框與登入鈕曾垂直堆疊）。
- `src/index.css`：3D 背景（body）由 `#16171d` 改為 `#36373e`（Canvas 透明，直接透出此色）。

**設計決策**
- 材質槽 id 用 `${mesh.uuid}:${materialIndex}` 而非材質 uuid：模型檔常把同一材質重用給多個 mesh（例如鞋面與鞋底），用材質 uuid 會合併成一列、改色時整批一起動；per-mesh 拆開後每列只影響一個 mesh，符合「點哪列改哪裡」的預期。代價是 uuid 每次載入重建，id 只在本次瀏覽有效，不可持久化。
- 上報與改色共用同一份 `materialSlots`：`Scene` 內只算一次 id，上報給 Viewer 的就是改色用的 key，避免「兩處各算一次、改一邊忘一邊」造成靜默對不上。
- 選取失效用渲染期推導而非 `useEffect` 同步：`eslint-plugin-react-hooks` 的 `react-hooks/set-state-in-effect`（禁止在 effect 內同步呼叫 setState 的規則）在本專案為 error，直接在 effect 內 `setState` 會使 `npm run lint` 失敗；推導版本只有一份真相，不多一次渲染。
- `canEditConfig` 定義為 `!loading && !loadError`：後端沒開（`asset === null`）時 `setConfig` 不執行任何動作，與其讓使用者拖動顏色卻沒反應，不如鎖住輸入框並明示唯讀。
- `.viewer-status` 從左上移到左下並加 `z-index: 20`：桌機上它與 `.material-panel`（`top:16 / left:16 / z-index:10`）完全重疊，錯誤訊息被蓋住；左下目前沒有其他浮層。
- 輔助開關做成總開關而非各自獨立：目前只有「檢視模型時清乾淨」的需求，拆三個開關是多餘的 UI；之後需要再拆。

**學習筆記**
1 則，見 [LEARNING.md](./LEARNING.md) 的 2026-10-26 段。

**已知限制 / 後續**
- 材質改色不持久化：`ViewConfig` 只有 `camera` 與 `cube.color`，改色只存在前端 state；換模型或重新載入後材質槽重建，回到原始色（10-25 已記，id 改為 slot 後行為相同）。
- `meshNames` 已無實質意義：每列只對應一個 mesh，恆為單一元素；目前保留型別不動，之後可簡化為單一 `meshName`。
- 手機版仍是固定 px 定位：媒體查詢只調整位置與尺寸，未改用流動版面（README 已標註進度）。
- 管理面板登入成功後不會自動收合（手機版仍顯示 Admin MODE，需手動關閉）。


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
