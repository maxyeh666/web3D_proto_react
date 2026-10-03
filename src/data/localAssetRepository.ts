import type { Asset, AssetInput } from "../types/asset";
import { defaultConfig } from "../config/view";
import type { AssetRepository } from "./assetRepository";

// localAssetRepository: 本機資料來源（預設）
// - 以記憶體保存一筆 id 為 "default" 的資產，初始值來自 defaultConfig
// - GH Pages 是純靜態託管，未設定 VITE_API_BASE_URL 時永遠走這裡
// - 所有方法刻意回傳 Promise，與遠端實作保持相同形狀，方便之後互換
// - 深拷貝使用原生 structuredClone 而非 lodash：ViewConfig 為純資料，原生 API 已足夠，免依賴（詳見 CHANGELOG 2026-10-03）
const DEFAULT_ASSET_ID = "default";

let assets: Asset[] = [
    {
        id: DEFAULT_ASSET_ID,
        name: "Default Cube",
        config: structuredClone(defaultConfig),
        updatedAt: new Date().toISOString(),
    },
];

function now(): string {
    return new Date().toISOString();
}

async function list(): Promise<Asset[]> {
    return structuredClone(assets);
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

// DEFAULT_ASSET_ID: 目前 App 只編輯一筆資產，固定讀寫這一筆
const localAssetRepository: AssetRepository = { list, get, update };

export { localAssetRepository, DEFAULT_ASSET_ID };
