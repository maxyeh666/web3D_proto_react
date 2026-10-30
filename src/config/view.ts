import type { ViewConfig } from "../types/viewer"
import { defaultCameraConfig } from "./camera"
import { defaultCubeConfig } from "./asset"

const defaultConfig: ViewConfig = {
    camera: defaultCameraConfig,
    cube: defaultCubeConfig,
    model: {
        materialColorOverrides: {}
    }
}
// 正規化設定：遠端舊資料可能沒有 model 欄位，這裡補上預設值，讓渲染層可以直接取值
function normalizeViewConfig(config: ViewConfig): ViewConfig {
    return {
        ...config,
        model: config.model ?? { materialColorOverrides: {} }
    }
}

export { defaultConfig, normalizeViewConfig } ;