// ============================================================
// vite.config.ts — Vite（開發伺服器 + 打包工具）的設定檔
// ------------------------------------------------------------
// 新手只要記得：跑 `npm run dev` 時，Vite 會來讀這個檔案，
// 決定「用什麼外掛來理解 React」。
// ============================================================

// @vitejs/plugin-react：官方外掛，負責兩件事：
// 1. 把 JSX（長得像 HTML 的 JS）轉成瀏覽器看得懂的 JS。
// 2. 開發時「熱更新」：你存檔，網頁不用重整就自動更新。
import react from '@vitejs/plugin-react'

// defineConfig：Vite 提供的輔助函式，只是為了讓 TS 有自動提示。
// 白話：包一層，讓你打 plugins 時會有提示、打錯會報錯。
import { defineConfig } from 'vite'

// https://vite.dev/config/ → 官方文件，想加更多設定可以查這裡。
export default defineConfig({
  // base：GitHub Pages 會把網站放在子路徑
  // https://<user>.github.io/<repo>/，所以要用 repo 名稱當 base，
  // 否則 build 出來的 /assets/*.js 會變成絕對路徑而 404 白畫面。
  // 本地 `npm run dev` 不受影響；只有 `npm run build` 會加上前綴。
  base: '/web3D_proto_react/',
  // plugins：外掛清單。目前只需要 react() 一個。
  // 之後如果要加路徑別名、3D 模型載入器等，都是加在這個陣列裡。
  plugins: [react()],
})

