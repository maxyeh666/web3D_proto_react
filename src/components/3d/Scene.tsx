// OrbitControls: 旋轉 / 縮放 / 平移視角
import { OrbitControls } from "@react-three/drei";
import { Cube } from "./Assets";
import Lights from "./Lights";
import DebugHelper from "./DebugHelper";

// Scene: 場景組合 — Cube / Lights / DebugHelper / OrbitControls
function Scene() {
	return (
		<>
			{/* 2x2x2 立方體，底部貼齊 y=0 格線 */}
			<Cube />

			{/* 環境光 + 兩組方向光 */}
			<Lights />

			{/* 座標軸 + 地面格線 */}
			<DebugHelper />

			{/* 視角控制：左鍵旋轉 / 滾輪縮放 / 右鍵平移 */}
			<OrbitControls />
		</>
	);
}

export default Scene;