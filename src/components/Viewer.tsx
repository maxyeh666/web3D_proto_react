import { Canvas } from "@react-three/fiber"
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib"
import { useRef } from "react"

import Scene from "./3d/Scene"
import "./Viewer.css"
import { useAssetConfig } from "../hooks/useAssetConfig"
import { ErrorBoundary } from "./ErrorBoundary"

// Viewer: 全螢幕 Canvas 容器
// Canvas camera — position: 相機世界座標 / fov: 垂直視角（度）
// config 來自資料層（local 預設 / 後端 remote），編輯後按 Save 寫回
export default function Viewer() {
    const controlRef = useRef<OrbitControlsImpl | null>(null);
    const { config, setConfig, save, loading, slowLoading, saving, loadError, saveError, retry } = useAssetConfig();
    // 暫時使用cube，多資產後處理
    const activeModel = config.cube;

    const resetCamera = () => {
        if (controlRef.current) {
            controlRef.current.reset();
        }
    };

    const setPickColor = (color: string) => {
        setConfig((prevConfig) => ({
            ...prevConfig,
            cube: {
                ...prevConfig.cube,
                color
            }
        }));
    }

    return (
        <div className="viewer">
            {/* NOTE: fiber 的 camera prop 只在 Canvas 初始化時建立 PerspectiveCamera，
                之後改 config.camera 不會自動更新畫面；
                若要做 Camera 控制 UI，需用 key 重建 Canvas 或在 Scene 內用 useThree + useEffect 同步。 */}
            <ErrorBoundary>
                <Canvas camera={config.camera}>
                    <Scene controlRef={controlRef} config={config} />
                </Canvas>
            </ErrorBoundary>

            {loading && 
                <div className="viewer-status">
                    { slowLoading ? "Service starting, please wait..." : "Loading asset..." }
                </div>
            }
            {!loading && loadError && (
                <div className="viewer-status viewer-status-error">
                    Load failed: {loadError}
                    <button className="asset-retry" onClick={retry}>Retry</button>
                </div>
            )}
            {!loading && saveError && (
                <div className="viewer-status viewer-status-error">
                    Save failed: {saveError} — press Save to try again
                </div>
            )}

            <button className="asset-save" onClick={save} disabled={loading || saving}>
                {saving ? "Saving…" : "Save"}
            </button>
            <button className="camera-reset" onClick={resetCamera}>
                Reset Camera
            </button>
            <input className="color-picker" type="color" value={activeModel.color} onChange={(e) => setPickColor(e.target.value)} />
        </div>
    )
}
