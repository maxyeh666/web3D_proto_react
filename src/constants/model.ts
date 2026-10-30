const DEFAULT_CUBE_MODEL_KEY = "default-cube";

// 模型檔網址：Scene 載入與 Viewer 清快取必須用「同一個字串」。
// useGLTF 的 cache key 是 [GLTFLoader, url]，字串不同就清不到，
// 症狀是 GLB 載入失敗後按 Retry 不會重抓（錯誤被 suspend-react 快取重拋）。
// 路徑對應後端 GET /models/:modelKey；模型清單與檔案都由後端提供。
function getModelUrl(modelKey: string): string {
    const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL)?.replace(/\/$/, "") ?? "";
    return `${apiBaseUrl}/models/${encodeURIComponent(modelKey)}`;
}

// 判斷是否為前端內建的預設方塊（cube 模式不載入 GLB）
function isDefaultCubeModel(modelKey: string): boolean {
    return modelKey === DEFAULT_CUBE_MODEL_KEY;
}

export { DEFAULT_CUBE_MODEL_KEY, getModelUrl, isDefaultCubeModel };