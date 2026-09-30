# Web 3D Viewer (React Three Fiber)

React + Three.js 基礎渲染學習驗證

<!-- TODO: 截圖 / GIF  -->
demo 連結 : https://maxyeh666.github.io/web3D_proto_react/

## Features

- Canvas / Scene 渲染鏈（Viewer.tsx / Scene.tsx）
- Cube：mesh + boxGeometry + meshStandardMaterial（Assets.tsx）
- ambientLight + directionalLight + 光源位置標記（Lights.tsx）
- OrbitControls 視角控制（Scene.tsx）
- axesHelper + gridHelper（DebugHelper.tsx）
- 全螢幕 Canvas 版型（index.css）

## Progress Log

### 2026-09-30 — 基礎渲染驗證

- 場景：Viewer 以 Canvas 承載 Scene（Viewer.tsx / Scene.tsx）
- Cube 底部貼齊 y=0 格線，避免一半沉入格線下（Assets.tsx）
- 標記球用 meshBasicMaterial 而非 Standard：標記須保持原色、不受場景燈光染色（Lights.tsx）
- 全螢幕版型：#root 移除 Vite 預設 1126px 限制，改由 html/body/#root 繼承高度（index.css）

> **Known Limitations**
> - Html label 無 occlude，被遮擋時仍顯示
> - 無陰影：需 Cube + directionalLight + shadow map 三處配合
> - DebugHelper 常駐：原型階段保留格線

## Roadmap

- [x] Canvas / Scene 渲染鏈
- [x] Cube：mesh + geometry + material
- [x] ambientLight + directionalLight + 光源位置標記
- [x] OrbitControls 視角控制
- [x] axesHelper + gridHelper
- [x] 全螢幕 Canvas 版型
- [ ] Camera Reset
- [ ] 3D Object 顏色切換 / Color Configuration
- [ ] JSON Configuration / React State 管理
- [ ] Loading / Error State
- [ ] UI：顏色選擇 / Camera 控制 / Asset 資訊面板
- Phase 2（預計）：GLB/glTF 載入 / 多 Asset / 資訊面板 / REST / WebSocket
- Phase 3（預計）：即時資料 / Sensor / Alarm / Highlight / 搜尋篩選

## Tech Stack

- Frontend：React / TypeScript / Vite / CSS
- 3D：React Three Fiber / Three.js / WebGL
- 3D 資產：目前 Three.js Primitive；未來 glTF / GLB

## Project Structure

```text
src/
├── App.tsx
├── main.tsx
├── index.css
└── components/
    ├── Viewer.tsx
    └── 3d/
        ├── Scene.tsx
        ├── Assets.tsx
        ├── Lights.tsx
        └── DebugHelper.tsx
```

## Usage

npm install / npm run dev / npm run build
