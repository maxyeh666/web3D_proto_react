type AssetProps = {
    position?: [number, number, number];
    rotation?: [number, number, number];
    color?: string;
};

// Cube: mesh = geometry + material
// mesh — position: 世界座標 / rotation: 歐拉角（弧度，XYZ 順序）
export function Cube({ position = [0, 1, 0], rotation = [0, 0, 0], color = "gray" }: AssetProps = {}) {
    return (
        <mesh position={position} rotation={rotation}>
            {/* boxGeometry args: [寬, 高, 深] */}
            <boxGeometry args={[2, 2, 2]} />

            {/* meshStandardMaterial — color / metalness: 金屬度(0~1) / roughness: 粗糙度(0~1) */}
            <meshStandardMaterial color={color} metalness={0} roughness={0.8}/>
        </mesh>
    );
}