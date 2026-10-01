
type CameraConfig = {
    position: [number, number, number];
    fov: number;
}

type CubeConfig = {
    color: string;
}

type ViewConfig = {
    camera: CameraConfig;
    cube: CubeConfig;
}

export type { ViewConfig, CameraConfig, CubeConfig };