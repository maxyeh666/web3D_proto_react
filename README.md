# Web 3D Viewer (React Three Fiber)

React + Three.js 基礎渲染學習驗證

<!-- TODO: 截圖 / GIF  -->
demo 連結 : https://maxyeh666.github.io/web3D_proto_react/

## Features

- Canvas / Scene 渲染鏈（Viewer.tsx / Scene.tsx）
- Cube：mesh + boxGeometry + meshStandardMaterial（Assets.tsx）
- ambientLight + directionalLight + 光源位置標記（Lights.tsx）
- OrbitControls 視角控制 + Reset Camera（Scene.tsx / Viewer.tsx）
- axesHelper + gridHelper（DebugHelper.tsx）
- Color Picker 即時改 Cube 顏色（Viewer.tsx）
- ViewConfig 集中式狀態：types + config presets（types/viewer.ts / config/）
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

### 2026-10-01 — 狀態架構重構（config 集中管理）

- 型別：新增 `ViewConfig = { camera: CameraConfig; cube: CubeConfig }`，`Viewer` 與 `Scene` 共用（types/viewer.ts）
- 預設值：新增 `defaultConfig` 組合 `defaultCameraConfig` + `defaultCubeConfig`，可序列化純資料（config/view.ts / camera.ts / asset.ts）
- 狀態：`Viewer` 以 `useState<ViewConfig>(defaultConfig)` 持有唯一事實來源，`color-picker` 經 `setConfig` 不可變更新，不再與 `config` 脫鉤（Viewer.tsx）
- 渲染：`Scene` 改為純分發 `config.cube.color`，`controlRef` 走旁邊不進 `config`，簽名簡化為 `SceneProps = { controlRef; config }`（Scene.tsx）
- 相機：`CameraConfig.position` 改用 tuple `[number, number, number]` 對齊 fiber `CameraProps`，`Canvas camera={config.camera}` 吃同一份來源（config/camera.ts / Viewer.tsx）

> **Design Notes**
> - `controlRef`（不可序列化命令式物件）與 `config`（可序列化純資料）分層，`config` 可直接 `JSON.stringify` 做 Preset / localStorage / 後端存檔
> - `Canvas camera` 僅初始化有效：`config.camera` 後續變更不會自動更新畫面（見 Viewer.tsx NOTE），Camera 控制 UI 需另行同步機制

## Roadmap

- [x] Canvas / Scene 渲染鏈
- [x] Cube：mesh + geometry + material
- [x] ambientLight + directionalLight + 光源位置標記
- [x] OrbitControls 視角控制
- [x] axesHelper + gridHelper
- [x] 全螢幕 Canvas 版型
- [x] Camera Reset
- [x] 3D Object 顏色切換 / Color Configuration
- [x] JSON Configuration / React State 管理
- [ ] Loading / Error State
- [ ] UI：Camera 控制（fov / position）/ Asset 資訊面板
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
├── types/
│   └── viewer.ts      # ViewConfig / CameraConfig / CubeConfig（唯一型別來源）
├── config/
│   ├── view.ts        # defaultConfig（組合 camera + cube）
│   ├── camera.ts      # defaultCameraConfig
│   └── asset.ts       # defaultCubeConfig
└── components/
    ├── Viewer.tsx     # useState<ViewConfig> + controlRef + UI（reset / picker）
    └── 3d/
        ├── Scene.tsx      # 純分發：Cube / Lights / DebugHelper / OrbitControls
        ├── Assets.tsx
        ├── Lights.tsx
        └── DebugHelper.tsx
```

## Usage

npm install / npm run dev / npm run build
