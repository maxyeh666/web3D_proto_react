import { httpAssetRepository } from "./httpAssetRepository";
import { localAssetRepository, DEFAULT_ASSET_ID } from "./localAssetRepository";
import type { AssetRepository } from "./assetRepository";

// assetRepository: 依環境變數選擇資料來源
// - 未設定 VITE_API_BASE_URL（預設 / GH Pages）→ local，不打任何網路
// - 設定後 → http，打後端 /assets
// 呼叫端只依賴 AssetRepository 介面，切換實作不需改程式
const assetRepository: AssetRepository = import.meta.env.VITE_API_BASE_URL
    ? httpAssetRepository
    : localAssetRepository;

export { assetRepository, DEFAULT_ASSET_ID };
