import type { ViewConfig } from "./viewer";

// Asset: 可持久化的場景資產（後端 Asset API 的資料形狀）
// - id / updatedAt 由資料來源產生，建立與更新時不需前端提供
// - id 為字串識別碼，對齊後端 BIGINT（pg 一律以字串回傳，避免超出 JS number 安全範圍）
// - config 直接重用 ViewConfig，保持渲染層與持久層同一份形狀
type Asset = {
    id: string;
    name: string;
    config: ViewConfig;
    updatedAt: string;
};

// AssetSummary: 列表（list）回傳的輕量形狀，只含辨識欄位（對齊後端）
type AssetSummary = {
    id: string;
    name: string;
};

// AssetInput: 建立 / 更新資產時由前端提供的欄位
type AssetInput = {
    name: string;
    config: ViewConfig;
};

export type { Asset, AssetInput, AssetSummary };
