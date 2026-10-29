import { Suspense } from "react";
import { Text } from "@react-three/drei";

type LightProps = {
	position: [number, number, number];
	color: string;
	intensity?: number;
	label: string;
}
// showMarkers 由外層決定：LightMaker 收到的一定是布林值
type LightMakerProps = LightProps & { showMarkers: boolean };
// visible 由外層決定：LightHelper 收到的一定是布林值
type LightHelperProps = LightProps & { visible: boolean };

// LightHelper: 光源位置標記（球體 + Text 標籤）
// group — position: 群組原點，子物件座標相對此點
function LightHelper({ position, color, label, visible }: LightHelperProps) {
	return(
		<group position={position} visible={visible}>
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
function LightMaker({ position, color, intensity, label, showMarkers }: LightMakerProps) {
	return (
		<>
			<directionalLight position={position} intensity={intensity} />

			{/* Text 首次掛載要抓字型，會 suspend（掛起等非同步資源）。邊界必須放在這裡：
				若落到 Canvas 內建的 Suspense，R3F 會把整個場景設為 visible=false（含模型）→ 模型隨之短暫消失。
				標記常駐掛載、用 visible 開關：字型在頁面載入時就緒，之後切換僅變更屬性，耗時可忽略 */}
			<Suspense fallback={null}>
				<LightHelper position={position} color={color} label={label} visible={showMarkers} />
			</Suspense>
		</>
	)
}

function Lights({ showMarkers }: { showMarkers: boolean }) {
	return (
		<>
			{/* ambientLight — intensity: 全域基礎亮度，無方向性 */}
			<ambientLight intensity={1} />

			{/* 主光：右上方向光 */}
			<LightMaker
				position={[5, 8, 5]}
				color="yellow"
				intensity={2.5}
				label="main light"
				showMarkers={showMarkers}
			/>
			{/* 補光：左側方向光 */}
			<LightMaker
				position={[-4, 3, 2]}
				color="green"
				intensity={0.5}
				label="secondary light"
				showMarkers={showMarkers}
			/>
		</>
	)
}

export default Lights
