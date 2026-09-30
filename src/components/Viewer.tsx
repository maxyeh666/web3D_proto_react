import { Canvas } from "@react-three/fiber"
import Scene from "./3d/Scene"

// Viewer: 全螢幕 Canvas 容器
// Canvas camera — position: 相機世界座標 / fov: 垂直視角（度）
export default function Viewer() {
    return (
        <div style={{ width: "100%", height: "100%" }}>
            <Canvas camera={{ position: [3, 5, 5], fov: 60 }}>
                <Scene />
            </Canvas>
        </div>
    )
}