import { useCallback, useEffect, useState } from "react";
import type { ViewConfig } from "../types/viewer";
import type { Asset } from "../types/asset";
import { defaultConfig } from "../config/view";
import { assetRepository, DEFAULT_ASSET_ID } from "../data";
import { DEFAULT_CUBE_MODEL_KEY } from "../constants/model";

// useAssetConfig: 從列表選一筆資產載入，並管理編輯狀態
// - 暫時取列表第一筆為展示用資產；之後做多筆選擇介面時，改掉「取第一筆」的挑選即可
// - 資料形狀由後端保證（寫入時驗證）；前端只處理請求失敗，不重驗資料
// - 載入失敗時 fallback 到 defaultConfig（Demo 永不白屏）
// - setConfig 只動本機 state；呼叫 save 才寫回資料來源
function useAssetConfig() {
    const [loading, setLoading] = useState<boolean>(true);
    const [slowLoading, setSlowLoading] = useState<boolean>(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saving, setSaving] = useState<boolean>(false);
    const [asset, setAsset] = useState<Asset | null>(null);

    const config: ViewConfig = asset?.config ?? defaultConfig;

    // 把新的 config 寫回 asset
    const setConfig = (updater: (prev: ViewConfig) => ViewConfig) => {
        setAsset((prev) => (prev ? { ...prev, config: updater(prev.config) } : prev));
    };
    // 載入第一筆資產：先 list 拿摘要挑出 id，再 get 抓完整內容
    // 用 useCallback 讓它能安全放進 useEffect 依賴（也能之後重複呼叫）
    const loadAsset = useCallback(() => {
        assetRepository
            .list()
            .then((assetList) => {
                // 暫時根據設定顯示預設ID資產
                const target = assetList.find((item) => item.id === DEFAULT_ASSET_ID) ?? assetList[0];
                if (!target) throw new Error("No asset found.");
                return assetRepository.get(target.id);
            })
            .then((loaded) => {
                setAsset(loaded);
                setLoadError(null);
                setSaveError(null);
            })
            .catch((err: unknown) => {
                // 連線失敗 / 列表為空 / 找不到時 fallback：config 由 asset?.config ?? defaultConfig 自然回退
                setLoadError(err instanceof Error ? err.message : String(err));
            })
            .finally(() => {
                setLoading(false);
                setSlowLoading(false);
            });
    }, []);

    const retry = useCallback(() => {
        setLoading(true);
        setSlowLoading(false);
        loadAsset();
    }, [loadAsset]);

    const save = () => {
        if (!asset) {
            setSaveError("No asset loaded.");
            return;
        }

        setSaving(true);
        setSaveError(null);
        assetRepository
            .update(asset.id, { name: asset.name, config: asset.config })
            .then((updated) => {
                setAsset(updated);
            })
            .catch((error: unknown) => {
                setSaveError(error instanceof Error ? error.message : String(error));
            })
            .finally(() => {
                setSaving(false);
            });
    };

    useEffect(() => {
        loadAsset();
    }, [loadAsset]);

    useEffect(() => {
        if (!loading) return;

        const timeoutId = window.setTimeout(() => {
            setSlowLoading(true);
        }, 5000)

        return () => window.clearTimeout(timeoutId);
    }, [loading]);

    return {
        config,
        modelKey: asset?.modelKey ?? DEFAULT_CUBE_MODEL_KEY,
        setConfig,
        save,
        loading,
        slowLoading,
        saving,
        loadError,
        saveError,
        retry
    };
}

export { useAssetConfig };
