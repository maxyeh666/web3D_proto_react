import type { Asset, AssetInput, AssetSummary } from "../types/asset";
import { defaultConfig } from "../config/view";
import type { AssetRepository } from "./assetRepository";
import { DEFAULT_CUBE_MODEL_KEY } from "../constants/model";

// localAssetRepository: 本機資料來源（預設）
// - 以記憶體保存一筆 id 為 "1" 的資產，初始值來自 defaultConfig（對齊後端自動編號的第一筆）
// - GH Pages 是純靜態託管，未設定 VITE_API_BASE_URL 時永遠走這裡
// - 所有方法刻意回傳 Promise，與遠端實作保持相同形狀，方便之後互換
// - 深拷貝使用原生 structuredClone 而非 lodash：ViewConfig 為純資料，原生 API 已足夠，免依賴（詳見 CHANGELOG 2026-10-03）
// App 預設編輯的資產 id，TODO:暫時先調整為ID = 2，多資產後進一步處理
const DEFAULT_ASSET_ID = import.meta.env.VITE_DEFAULT_ASSET_ID ?? "2";

let assets: Asset[] = [
    {
        id: DEFAULT_ASSET_ID,
        name: "Default Cube",
        config: structuredClone(defaultConfig),
        updatedAt: new Date().toISOString(),
        modelKey: DEFAULT_CUBE_MODEL_KEY
    },
];

function now(): string {
    return new Date().toISOString();
}

async function list(): Promise<AssetSummary[]> {
    return assets.map((asset) => ({ id: asset.id, name: asset.name }));
}

async function get(id: string): Promise<Asset> {
    const found = assets.find((asset) => asset.id === id);
    if (!found) {
        throw new Error(`Asset not found: ${id}`);
    }
    return structuredClone(found);
}

async function update(id: string, input: AssetInput): Promise<Asset> {
    const found = assets.find((asset) => asset.id === id);
    if (!found) {
        throw new Error(`Asset not found: ${id}`);
    }
    const updated: Asset = {
        ...found,
        name: input.name,
        config: structuredClone(input.config),
        updatedAt: now(),
    };
    assets = assets.map((asset) => (asset.id === id ? updated : asset));
    return structuredClone(updated);
}

// localAssetRepository: 本機資料來源（單筆記憶體資產，未設定 VITE_API_BASE_URL 時使用）
const localAssetRepository: AssetRepository = { list, get, update };

export { localAssetRepository, DEFAULT_ASSET_ID };
