/// <reference types="vite/client" />

// Vite 環境變數型別宣告
// VITE_ 開頭的變數會被打包進前端，只放非機密的公開設定
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}
