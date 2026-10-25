# Web 3D Viewer

React + Three.js 基礎 3D Viewer Prototype。

Demo: https://maxyeh666.github.io/web3D_proto_react/

## Features

- Canvas / Scene 渲染鏈（Viewer.tsx / Scene.tsx）
- Cube：mesh + boxGeometry + meshStandardMaterial（Assets.tsx）
- ambientLight + directionalLight + 光源位置標記（Lights.tsx）
- OrbitControls 視角控制 + Reset Camera
- axesHelper + gridHelper
- Color Picker 即時修改顏色（cube 模式改 Cube，glTF 模式改選取的材質）
- ViewConfig 集中式狀態管理
- Camera / Asset configuration 分離
- AssetRepository 資料存取的固定寫法：local（存在記憶體）/ remote（後端 API）可以換（data/、api/）
- Loading / Error State + Save（寫回資料來源）
- 請求逾時 65 秒；GET 失敗自動重試（最多 3 次、指數退避）
- 慢速載入提示與 Retry（載入 / 儲存錯誤分開顯示）
- 全螢幕 Canvas 版型
- 管理者登入（僅設定 `VITE_API_BASE_URL` 的遠端模式時顯示）：登入後才能 Save
- glTF 模型載入：依資產的 `modelKey` 向後端 `GET /models/:modelKey` 拿檔；`modelKey` 為 `default-cube` 時顯示內建立方體
- 模型下載進度：下載中顯示百分比（Canvas 外的 DOM 浮層）
- 材質面板：列出模型的材質（名稱 / 使用它的 mesh / 貼圖型別），可點選並即時改色

## Development Log

開發過程與設計決策見 [CHANGELOG.md](./CHANGELOG.md)。

## Roadmap

### Phase 1 — Frontend

- [x] Canvas / Scene 渲染鏈
- [x] Cube：mesh + geometry + material
- [x] ambientLight + directionalLight + 光源位置標記
- [x] OrbitControls
- [x] axesHelper + gridHelper
- [x] 全螢幕 Canvas
- [x] Camera Reset
- [x] 3D Object 顏色切換
- [x] JSON Configuration
- [x] React State 管理
- [x] ViewConfig 架構
- [x] Frontend Proto

### Phase 2 — Backend Integration

Backend 將於獨立 Repository 開發。

Frontend-side:

- [x] 資料來源抽象（AssetRepository）
- [x] Loading / Error handling
- [x] Save（寫回資料來源）
- [x] Connect Asset API（設定 VITE_API_BASE_URL 後才會連到後端）
- [x] 管理者登入與寫入權限（`App.tsx` + `api/adminToken.ts`；token 存記憶體，重整需重新登入）
- [x] 逾時 / GET 重試 / 錯誤提示（含 Retry）

Backend-side:

- [x] Asset API（SQL 資料表存模型）
- [x] Load Assets from Backend

### Phase 3 — 3D / Application

本階段目標：從「顯示單一展示物件」推進到「可切換檢視多筆資產的真實模型」。
編輯器功能（拖曳 / 縮放物件）不在範圍內，詳見 Non-goals。

- [x] glTF 模型載入（模型由後端提供；`modelKey` 為 `default-cube` 時退回內建立方體）
- [x] 模型載入進度（下載中顯示百分比）
- [ ] Asset 選擇介面（切換檢視多筆資產）
- [ ] 切換時的非同步正確性（競態、儲存中鎖定選單、未存變更提示）
- [ ] Asset Information Panel（名稱 / 模型來源 / mesh 與頂點數）
- [ ] 輔助顯示切換（格線 / 座標軸 / 光源標記可各自開關）
- [ ] 模型依 bounding box 對齊原點平面（目前僅置中，底部會沉入格線）

以下為後續優化，未包含在本階段：

- [ ] 手機版型（目前控制項為固定 px 定位）
- [ ] 記住上次選擇的資產
- [ ] Bundle 拆分與載入最佳化

## Non-goals

- 新增 / 刪除資產：這是「看模型」的 Viewer，不是「管模型」的後台，資產由資料來源提供。
- 即時同步 / WebSocket：單人檢視器沒有協作場景，且免費部署方案（Render 會休眠）不適合長連線。
- 自動化測試：型別由 `tsc -b` 把關、API 契約由後端驗證，此 prototype 未導入測試框架。
- 編輯器功能（拖曳 / 旋轉 / 縮放物件、新增或刪除物件）：這是檢視器，不是 3D 編輯器；需要 transform 與 undo 是另一個規模的專案。

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- CSS

### 3D

- React Three Fiber
- Three.js
- WebGL

## Project Structure

```text
src/
├── App.tsx
├── main.tsx
├── index.css
├── vite-env.d.ts
├── api/
│   ├── adminToken.ts
│   └── client.ts
├── data/
│   ├── assetRepository.ts
│   ├── localAssetRepository.ts
│   ├── httpAssetRepository.ts
│   └── index.ts
├── hooks/
│   └── useAssetConfig.ts
├── types/
│   ├── viewer.ts
│   ├── asset.ts
│   └── modelMaterial.ts    ← 材質清單的資料形狀（名稱 / mesh / 貼圖型別 / 顏色）
├── config/
│   ├── view.ts
│   ├── camera.ts
│   └── asset.ts
├── components/
    ├── ErrorBoundary.tsx
    ├── Viewer.tsx             ← 材質面板 + 模型下載進度浮層
    ├── Viewer.css
    └── 3d/
        ├── Scene.tsx          ← modelKey 分支：cube 或 glTF；材質上報 + 顏色覆寫
        ├── Assets.tsx
        ├── Lights.tsx
        └── DebugHelper.tsx
└── constants/
    └── model.ts               ← 預設模型 key（`default-cube`）

## Usage

```bash
npm install
npm run dev
npm run build
npm run lint
```

環境變數（見 `.env.example`）：

| 變數 | 說明 | 未設定時 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | 後端 Asset API 網址 | 使用記憶體資料（local），不打任何網路請求 |
| `VITE_DEFAULT_ASSET_ID` | local 資料源使用的資產 id | `2` |

設定 `VITE_API_BASE_URL` 後：載入為 `GET /assets`（依 `DEFAULT_ASSET_ID` 挑一筆，找不到退回第一筆）→ `GET /assets/:id`（取完整設定），Save 為 `PUT /assets/:id`。

glTF 模式的材質改色只作用於畫面，不會寫回 Asset config（`ViewConfig` 只有 `camera` 與 `cube.color`）。模型資產（`MaterialsVariantsShoe.glb`）由後端提供，來源與授權見後端 repo 的 `models/ATTRIBUTION.md`。

請求失敗的處理：

- 逾時 65 秒，時間到即中止請求（`src/api/client.ts`）
- 只有 GET 會重試：連線錯誤或回應 408 / 429 / 500 / 502 / 503 / 504 時重試，最多 3 次、間隔 1 秒 / 2 秒；PUT 不重試，避免重複寫入
- 載入超過 5 秒顯示「Service starting」提示（涵蓋後端冷啟動）；載入失敗顯示錯誤與 Retry，儲存失敗單獨顯示、不提供 Retry
