import type { AssetSummary } from "../types/asset";

// AssetBar: 畫布頂端的資產切換列
// 只負責「要看哪一份資產」（內容層級），外觀編輯留在 Appearance 面板
// loading / saving 期間鎖住操作，避免載入中切換造成狀態錯亂
type AssetBarProps = {
    assetList: AssetSummary[] | null;
    pendingAssetId: string;
    currentAssetId: string;
    loading: boolean;
    saving: boolean;
    onSelectAsset: (id: string) => void;
    onLoadAsset: () => void;
};

export default function AssetBar({
    assetList,
    pendingAssetId,
    currentAssetId,
    loading,
    saving,
    onSelectAsset,
    onLoadAsset,
}: AssetBarProps) {
    const disabled = loading || saving;
    const loadDisabled = disabled || !pendingAssetId || pendingAssetId === currentAssetId;

    return (
        <div className="asset-bar">
            <label htmlFor="asset-select">Asset</label>

            <select
                id="asset-select"
                value={pendingAssetId}
                disabled={disabled}
                onChange={(event) => onSelectAsset(event.target.value)}
            >
                {assetList?.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                        {asset.name}
                    </option>
                ))}
            </select>

            <button type="button" onClick={onLoadAsset} disabled={loadDisabled}>
                {loading ? "Loading..." : "Load Asset"}
            </button>
        </div>
    );
}
