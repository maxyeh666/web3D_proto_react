import { useCallback, useEffect, useState } from "react";
import type { ViewConfig } from "../types/viewer";
import type { Asset, AssetSummary } from "../types/asset";
import { defaultConfig, normalizeViewConfig } from "../config/view";
import { assetRepository, DEFAULT_ASSET_ID } from "../data";
import { DEFAULT_CUBE_MODEL_KEY } from "../constants/model";

// useAssetConfig: 載入資產並管理編輯狀態
// - 初始載入：優先 DEFAULT_ASSET_ID，找不到才退回列表第一筆；之後可用資產選擇器切換
// - 資料形狀由後端保證（寫入時驗證）；前端不重驗，只用 normalizeViewConfig 補缺欄位
// - 載入失敗時 fallback 到 defaultConfig（Demo 永不白屏），此時沒有可寫入目標，UI 必須鎖住編輯
// - setConfig 只動本機 state；呼叫 save 才寫回資料來源
function useAssetConfig() {
    const [loading, setLoading] = useState<boolean>(true);
    const [slowLoading, setSlowLoading] = useState<boolean>(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saving, setSaving] = useState<boolean>(false);
    const [asset, setAsset] = useState<Asset | null>(null);
    const [assetList, setAssetList] = useState<AssetSummary[] | null>(null);
    // 選擇器目前選到的資產 id（按下 Load Asset 才真的載入）
    const [pendingAssetId, setPendingAssetId] = useState("");

    const config: ViewConfig = asset?.config ?? defaultConfig;
    // 畫面實際載入的資產 id；空字串代表載入中或載入失敗（fallback 到 defaultConfig）
    const currentAssetId = asset?.id ?? "";

    // asset 為 null（載入失敗、config 退回 defaultConfig）時沒有可寫入的目標，setConfig 會 no-op
    const setConfig = (updater: (prev: ViewConfig) => ViewConfig) => {
        setAsset((prev) => (prev ? { ...prev, config: updater(prev.config) } : prev));
    };
    // 載入初始資產：先 list 拿摘要挑出 id，再 get 抓完整內容
    // 用 useCallback 讓它能安全放進 useEffect 依賴（也能之後重複呼叫）
    const loadAsset = useCallback(() => {
        assetRepository
            .list()
            .then((assetList) => {
                // 優先載入 DEFAULT_ASSET_ID（正式站對齊自動編號），沒有才用第一筆
                setAssetList(assetList)
                const target = assetList.find((item) => item.id === DEFAULT_ASSET_ID) ?? assetList[0];
                if (!target) throw new Error("No asset found.");

                setPendingAssetId(target.id);
                return assetRepository.get(target.id);
            })
            .then((loaded) => {
                // 正規化設定：遠端舊資料沒有 model 欄位，這裡補上預設值
                setAsset({
                    ...loaded,
                    config: normalizeViewConfig(loaded.config)
                });
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
                // 保存後也正規化：舊版後端回傳的 config 可能沒有 model
                setAsset({
                    ...updated,
                    config: normalizeViewConfig(updated.config)
                });
            })
            .catch((error: unknown) => {
                setSaveError(error instanceof Error ? error.message : String(error));
            })
            .finally(() => {
                setSaving(false);
            });
    };

    const loadSelectedAsset = useCallback(() => {
        // 切換資產：選擇器還沒選或已選同一筆時直接略過，避免重複請求
        if (!pendingAssetId || pendingAssetId === asset?.id) return;

        setLoading(true);
        setSlowLoading(false);
        setLoadError(null);
        setSaveError(null);

        assetRepository
            .get(pendingAssetId)
            .then((loaded) => {
                // 正規化：遠端舊資料沒有 model，缺了會在 Viewer 取 config.model 時炸掉
                setAsset({
                    ...loaded,
                    config: normalizeViewConfig(loaded.config)
                });
            })
            .catch((error: unknown) => {
                setLoadError(error instanceof Error ? error.message : String(error));
            })
            .finally(() => {
                setLoading(false);
                // 切換資產同樣會啟動 5 秒的 slowLoading 計時（見下方 effect），這裡一併歸零
                setSlowLoading(false);
            });
    }, [pendingAssetId, asset?.id]);

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
        assetList,
        currentAssetId,
        pendingAssetId,
        setPendingAssetId,
        loadSelectedAsset,
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
