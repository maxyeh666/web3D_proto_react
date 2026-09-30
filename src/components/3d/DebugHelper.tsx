// DebugHelper: 座標軸 + 地面格線
function DebugHelper() {
    return (
        <>
            {/* axesHelper args: [軸線長度]（RGB = XYZ） */}
            <axesHelper args={[5]} />
            {/* gridHelper args: [尺寸, 格數] */}
			<gridHelper args={[10, 10]} />
        </>
    )
}

export default DebugHelper