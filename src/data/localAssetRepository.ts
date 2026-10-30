import type { Asset, AssetInput, AssetSummary } from "../types/asset";
import { defaultConfig } from "../config/view";
import type { AssetRepository } from "./assetRepository";
import { DEFAULT_CUBE_MODEL_KEY } from "../constants/model";

// localAssetRepository: 本機資料來源（本機未設定 VITE_API_BASE_URL 時使用）
// - 以記憶體保存兩筆示範資產（Default Cube / Blue Cube），讓資產選擇器有東西可切
// - 初始值皆來自 defaultConfig；id 預設為 "2" / "3"，可用 VITE_DEFAULT_ASSET_ID 覆寫
// - 所有方法刻意回傳 Promise，與遠端實作保持相同形狀，方便之後互換
// - 深拷貝使用原生 structuredClone 而非 lodash：ViewConfig 為純資料，原生 API 已足夠，免依賴
// 預設載入的資產 id：對齊後端自動編號，兩筆都只存在記憶體
const DEFAULT_ASSET_ID = import.meta.env.VITE_DEFAULT_ASSET_ID ?? "2";
// 第二筆示範資產的 id：刻意避開 DEFAULT_ASSET_ID，確保選擇器一定有兩個選項
const SECONDARY_ASSET_ID = DEFAULT_ASSET_ID === "2" ? "3" : "2";

let assets: Asset[] = [
    {
        id: DEFAULT_ASSET_ID,
        name: "Default Cube",
        config: structuredClone(defaultConfig),
        updatedAt: new Date().toISOString(),
        modelKey: DEFAULT_CUBE_MODEL_KEY
    },
    {
        id: SECONDARY_ASSET_ID,
        name: "Blue Cube",
        config: {
            ...structuredClone(defaultConfig),
            cube: {
                ...defaultConfig.cube,
                color: "#4f8cff"
            }
        },
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

const localAssetRepository: AssetRepository = { list, get, update };

export { localAssetRepository, DEFAULT_ASSET_ID };
