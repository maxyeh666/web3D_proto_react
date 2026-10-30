import { httpAssetRepository } from "./httpAssetRepository";
import { localAssetRepository, DEFAULT_ASSET_ID } from "./localAssetRepository";
import type { AssetRepository } from "./assetRepository";

// 增加環境參數讓其他元件可以共享判斷
const isRemoteDataSource = Boolean(import.meta.env.VITE_API_BASE_URL);
// assetRepository: 依環境變數選擇資料來源
// - 未設定 VITE_API_BASE_URL（例如本機沒建 .env）→ local，不打任何網路
// - 已設定（正式站由 .github/workflows/deploy.yml 注入 Render 後端）→ http，打後端 /assets
// 呼叫端只依賴 AssetRepository 介面，切換實作不需改程式
const assetRepository: AssetRepository = isRemoteDataSource
    ? httpAssetRepository
    : localAssetRepository;

export { isRemoteDataSource, assetRepository, DEFAULT_ASSET_ID };
