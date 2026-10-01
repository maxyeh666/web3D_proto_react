import type { ViewConfig } from "../types/viewer"
import { defaultCameraConfig } from "./camera"
import { defaultCubeConfig } from "./asset"

const defaultConfig: ViewConfig = {
    camera: defaultCameraConfig,
    cube: defaultCubeConfig
}

export { defaultConfig } ;