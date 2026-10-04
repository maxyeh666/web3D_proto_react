import type { Asset, AssetInput } from "../types/asset";

// AssetRepository: 資產資料存取介面（契約）
// local（本機）與 remote（後端 API）兩種實作都必須符合此介面，
// 切換資料來源時不必改動呼叫端（hooks / 元件）。
type AssetRepository = {
    list(): Promise<Asset[]>;
    get(id: number): Promise<Asset>;
    update(id: number, input: AssetInput): Promise<Asset>;
};

export type { AssetRepository };
