// DebugHelper: 座標軸 + 地面格線
// 外層常駐掛載、傳入 visible；元件內用 group 的 visible 開關整組 → 切換只改屬性，不重新掛載
function DebugHelper({ visible }: { visible: boolean }) {
	return (
		<group visible={visible}>
			{/* axesHelper args: [軸線長度]（RGB = XYZ） */}
			<axesHelper args={[5]} />
			{/* gridHelper args: [尺寸, 格數] */}
			<gridHelper args={[10, 10]} />
		</group>
	)
}

export default DebugHelper