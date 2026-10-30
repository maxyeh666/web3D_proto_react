
type CameraConfig = {
    position: [number, number, number];
    fov: number;
}

type CubeConfig = {
    color: string;
}

// ModelConfig: GLB 模型的顯示設定
// - materialColorOverrides：key 是「材質槽 id（節點路徑，例：Shoe[0]/Sole[0]:material[0]）」
//   值是 #rrggbb。沒有改過色的槽不會出現在這裡，缺 key 就代表用 GLB 原色
type ModelConfig = {
    materialColorOverrides: Record<string, string>;
}

type ViewConfig = {
    camera: CameraConfig;
    cube: CubeConfig;
    model: ModelConfig;
}

export type { ViewConfig, CameraConfig, CubeConfig, ModelConfig };