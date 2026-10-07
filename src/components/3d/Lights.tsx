
import { Text } from "@react-three/drei";

type LightProps = {
	position: [number, number, number];
	color: string;
	intensity?: number;
	label: string;
}

// LightHelper: 光源位置標記（球體 + Text 標籤）
// group — position: 群組原點，子物件座標相對此點
function LightHelper({ position, color, label }:LightProps) {
	return(
		<group position={position}>
			<mesh>
				{/* sphereGeometry args: [半徑, 寬段數, 高段數] */}
				<sphereGeometry args={[0.25, 16, 16]} />
				{/* meshBasicMaterial — color / toneMapped: 是否受色調映射影響，標記用 false 保持原色 */}
				<meshBasicMaterial color={color} toneMapped={false} />
			</mesh>

			{/* Text — 用 troika 直接在場景畫文字，不像 Html 會另開巢狀 React root（避免 React 19 的 unmount 警告）
			position: 文字位置（球體上方）/ fontSize: 字級 / anchorY: 對齊方式 */}
			<Text
				position={[0, 0.5, 0]}
				color="white"
				fontSize={0.4}
				anchorX="center"
				anchorY="bottom"
				outlineWidth={0.02}
				outlineColor="#333333"
			>
				{label}
			</Text>
		</group>
	)
}

// LightMaker: directionalLight + 位置標記
// directionalLight — position: 光源位置（指向原點） / intensity: 強度
function LightMaker({position, color, intensity, label}:LightProps) {
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