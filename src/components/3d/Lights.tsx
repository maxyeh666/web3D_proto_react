
import { Html } from "@react-three/drei";

type lightProps = {
	position: [number, number, number];
	color: string;
	intensity?: number;
	label: string;
}

// LightHelper: 光源位置標記（球體 + Html 標籤）
// group — position: 群組原點，子物件座標相對此點
function LightHelper({ position, color, label }:lightProps) {
	return(
		<group position={position}>
			<mesh>
				{/* sphereGeometry args: [半徑, 寬段數, 高段數] */}
				<sphereGeometry args={[0.25, 16, 16]} />
				{/* meshBasicMaterial — color / toneMapped: 是否受色調映射影響，標記用 false 保持原色 */}
				<meshBasicMaterial color={color} toneMapped={false} />
			</mesh>

			{/* Html — distanceFactor: 隨距離縮放係數 / center: 置中對齊 / transform: 是否跟隨 3D 變換 */}
			<Html distanceFactor={12} center transform={false}>
				<div style={{ color: 'white', fontSize: 12, pointerEvents: 'none' }}>{label}</div>
			</Html>
		</group>
	)
}

// LightMaker: directionalLight + 位置標記
// directionalLight — position: 光源位置（指向原點） / intensity: 強度
function LightMaker({position, color, intensity, label}:lightProps) {
	return (
		<>
			<directionalLight position={position} intensity={intensity} />

			<LightHelper position={position} color={color} label={label}/>
		</>
	)
}

function Lights () {
	return (
		<>
			{/* ambientLight — intensity: 全域基礎亮度，無方向性 */}
			<ambientLight intensity={0.05} />

			{/* 主光：右上方向光 / 補光：左側方向光 */}
			<LightMaker position={[5, 8, 5]} color="yellow" intensity={2.5} label="main light" />
			<LightMaker position={[-4, 3, 2]} color="green" intensity={0.5} label="secondary light" />
		</>
	)
}

export default Lights