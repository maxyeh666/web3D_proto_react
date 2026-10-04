import type { ViewConfig } from "./viewer";

// Asset: 可持久化的場景資產（後端 Asset API 的資料形狀）
// - id / updatedAt 由資料來源產生，建立與更新時不需前端提供
// - id 對齊後端 BIGINT 自動編號（新增由資料庫產生 1、2、3…）
// - config 直接重用 ViewConfig，保持渲染層與持久層同一份形狀
type Asset = {
    id: number;
    name: string;
    config: ViewConfig;
    updatedAt: string;
};

// AssetInput: 建立 / 更新資產時由前端提供的欄位
type AssetInput = {
    name: string;
    config: ViewConfig;
};

export type { Asset, AssetInput };
