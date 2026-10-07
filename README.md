# Web 3D Viewer

React + Three.js 基礎 3D Viewer Prototype。

Demo: https://maxyeh666.github.io/web3D_proto_react/

## Features

- Canvas / Scene 渲染鏈（Viewer.tsx / Scene.tsx）
- Cube：mesh + boxGeometry + meshStandardMaterial（Assets.tsx）
- ambientLight + directionalLight + 光源位置標記（Lights.tsx）
- OrbitControls 視角控制 + Reset Camera
- axesHelper + gridHelper
- Color Picker 即時修改 Cube 顏色
- ViewConfig 集中式狀態管理
- Camera / Asset configuration 分離
- AssetRepository 資料存取的固定寫法：local（存在記憶體）/ remote（後端 API）可以換（data/、api/）
- Loading / Error State + Save（寫回資料來源）
- 全螢幕 Canvas 版型

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

Backend-side:

- [x] Asset API（SQL 資料表存模型）
- [x] Load Assets from Backend

### Phase 3 — 3D / Application

- [ ] Asset 選擇介面（切換檢視多筆）
- [ ] Asset Information Panel
- [ ] GLB / glTF
- [ ] WebSocket / Realtime

## Non-goals

- 新增 / 刪除資產：這是「看模型」的 Viewer，不是「管模型」的後台，資產由資料來源提供。

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
│   └── asset.ts
├── config/
│   ├── view.ts
│   ├── camera.ts
│   └── asset.ts
└── components/
    ├── Viewer.tsx
    ├── Viewer.css
    └── 3d/
        ├── Scene.tsx
        ├── Assets.tsx
        ├── Lights.tsx
        └── DebugHelper.tsx

## Usage

npm install / npm run dev / npm run build / npm run lint

VITE_API_BASE_URL 沒設定就用存在記憶體的資料；設定後會依序打後端的 `GET /assets`（列表挑一筆）與 `GET /assets/:id`（取完整內容）（見 .env.example）。
