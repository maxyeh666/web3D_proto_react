import type { Asset, AssetInput } from "../types/asset";
import { request } from "../api/client";
import type { AssetRepository } from "./assetRepository";

// httpAssetRepository: 遠端資料來源（待後端完成）
// - 打 REST /assets 端點，request/response 形狀即 types/asset.ts 的 Asset
// - 只在設定 VITE_API_BASE_URL 時啟用（見 data/index.ts）
async function list(): Promise<Asset[]> {
    return request<Asset[]>("/assets");
}

async function get(id: string): Promise<Asset> {
    return request<Asset>(`/assets/${encodeURIComponent(id)}`);
}

async function update(id: string, input: AssetInput): Promise<Asset> {
    return request<Asset>(`/assets/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(input),
    });
}

const httpAssetRepository: AssetRepository = { list, get, update };

export { httpAssetRepository };
