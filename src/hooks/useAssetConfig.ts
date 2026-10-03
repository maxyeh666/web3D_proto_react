import { useEffect, useState } from "react";
import type { ViewConfig } from "../types/viewer";
import { defaultConfig } from "../config/view";
import { assetRepository, DEFAULT_ASSET_ID } from "../data";

// useAssetConfig: 從資料來源載入目前資產的 config，並管理編輯狀態
// - 載入中：loading；載入失敗：error，並 fallback 到 defaultConfig（Demo 永不白屏）
// - 編輯（setConfig）只動本機 state；呼叫 save 才寫回資料來源
function useAssetConfig() {
    const [config, setConfig] = useState<ViewConfig>(defaultConfig);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState<boolean>(false);

    useEffect(() => {
        let cancelled = false;

        assetRepository
            .get(DEFAULT_ASSET_ID)
            .then((asset) => {
                if (!cancelled) {
                    setConfig(asset.config);
                    setError(null);
                }
            })
            .catch((err: unknown) => {
                // remote 連線失敗時回退到 defaultConfig，並留下錯誤訊息
                if (!cancelled) {
                    setConfig(defaultConfig);
                    setError(err instanceof Error ? err.message : String(err));
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const save = async () => {
        setSaving(true);
        setError(null);
        try {
            const updated = await assetRepository.update(DEFAULT_ASSET_ID, {
                name: "Default Cube",
                config,
            });
            setConfig(updated.config);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setSaving(false);
        }
    };

    return { config, setConfig, save, loading, saving, error };
}

export { useAssetConfig };
