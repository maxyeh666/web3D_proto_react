import type { Asset, AssetInput, AssetSummary } from "../types/asset";
import type { AssetRepository } from "./assetRepository";
import { request } from "../api/client";

// httpAssetRepository: 遠端資料來源（後端 Asset API）
// - 打 REST /assets 端點，request/response 形狀即 types/asset.ts 的 Asset
// - 只在設定 VITE_API_BASE_URL 時啟用（見 data/index.ts）
// - id 為字串（對齊後端 BIGINT），可直接帶入路徑，不需再轉型
async function list(): Promise<AssetSummary[]> {
    return request<AssetSummary[]>("/assets");
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
