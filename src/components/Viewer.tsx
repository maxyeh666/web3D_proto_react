import { Canvas } from "@react-three/fiber"
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib"
import { useRef, useState } from "react"
import type { ViewConfig } from "../types/viewer"

import Scene from "./3d/Scene"
import "./Viewer.css"
import { defaultConfig } from "../config/view"

// Viewer: 全螢幕 Canvas 容器
// Canvas camera — position: 相機世界座標 / fov: 垂直視角（度）
export default function Viewer() {
    const controlRef = useRef<OrbitControlsImpl | null>(null);
    const [config, setConfig] = useState<ViewConfig>(defaultConfig);
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
            <Canvas camera={config.camera}>
                <Scene controlRef={controlRef} config={config} />
            </Canvas>

            <button className="camera-reset" onClick={resetCamera}>
                Reset Camera
            </button>
            <input className="color-picker" type="color" value={activeModel.color} onChange={(e) => setPickColor(e.target.value)} />
        </div>
    )
}