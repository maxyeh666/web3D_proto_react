import { Canvas } from "@react-three/fiber"
import { useGLTF, useProgress } from "@react-three/drei"
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib"
import { useRef, useState, useCallback } from "react"

import Scene from "./3d/Scene"
import "./Viewer.css"
import { useAssetConfig } from "../hooks/useAssetConfig"
import { ErrorBoundary } from "./ErrorBoundary"
import { getModelUrl, isDefaultCubeModel } from "../constants/model"
import type { ModelMaterialInfo } from "../types/modelMaterial"

function ModelProgressOverlay({ visible }: { visible: boolean }) {
    const { active, progress } = useProgress();
    if (!visible || !active) return null;
    return <div className="viewer-status">Loading model… {Math.round(progress) || 0}%</div>;
}

// Viewer: 全螢幕 Canvas 容器
// Canvas camera — position: 相機世界座標 / fov: 垂直視角（度）
// config 來自資料層（local 預設 / 後端 remote），編輯後按 Save 寫回
export default function Viewer(
    { canSave } : {canSave : boolean}
) {
    const {
        assetList,
        currentAssetId,
        pendingAssetId,
        setPendingAssetId,
        loadSelectedAsset,
        config,
        modelKey,
        setConfig,
        save,
        loading,
        slowLoading,
        saving,
        loadError,
        saveError,
        retry
    } = useAssetConfig();

    const controlRef = useRef<OrbitControlsImpl | null>(null);
    const [materials, setMaterials] = useState<ModelMaterialInfo[]>([]);
    const [selectedMaterialId, setSelectedMaterialId] = useState("");
    const [showHelper, setShowHelper] = useState(false);
    const [modelError, setModelError] = useState<{
        assetId: string;
        modelKey: string;
        message: string;
    } | null>(null);
    const [modelRetryKey, setModelRetryKey] = useState(0);
    const isDefaultCube = isDefaultCubeModel(modelKey);
    // 沒有載入成功的資產時，config 只是 defaultConfig；此時改值無處可寫（setConfig 會 no-op），UI 必須鎖住
    const canEditConfig = !loading && !loadError;

    // 覆寫表同時給 Scene（套色）與面板（顯示目前顏色）用，抽出來避免兩邊各取一次
    const materialColorOverrides = config.model.materialColorOverrides;
    // cube 只在兩種情況出現：資產本身是內建方塊，或 GLB 載入失敗 fallback（顏色由這裡提供）
    const cubeConfig = config.cube;
    // 選中的材質槽可能因換模型而失效（id 由模型節點路徑組成，換模型就整組重算）：失效時退回第一條。
    // 不用 effect 同步 state —— eslint 的 react-hooks/set-state-in-effect 會擋，且會造成連鎖渲染
    const effectiveSelectedId = materials.some(material => material.id === selectedMaterialId)
        ? selectedMaterialId
        : materials[0]?.id ?? ""
    const selectedMaterial = materials.find(material => material.id === effectiveSelectedId)
    const isModelFallback =
        modelError?.assetId === currentAssetId &&
        modelError?.modelKey === modelKey;
    const isFallback =
        (!currentAssetId && !loading) ||
        Boolean(isModelFallback);
    const isCubeMode = isFallback || isDefaultCube;

    // 重試機制：GLB 載入失敗時用
    const retryModel = () => {
        const modelUrl = getModelUrl(modelKey);
        // 清掉這個網址的載入結果（含失敗的快取錯誤）：不清的話 suspend-react 會持續重拋同一個 error，Retry 等於沒作用
        useGLTF.clear(modelUrl);

        setModelError(null);
        setModelRetryKey((current) => current + 1);
    }

    const handleError = useCallback((error: Error) => {
        setModelError({
            assetId: currentAssetId,
            modelKey,
            message: error.message
        });

        // GLB 失效時清掉材質資料，否則面板會留著上一個模型的材質（選中的 id 也已經失效）
        setMaterials([]);
        setSelectedMaterialId("");
    }, [currentAssetId, modelKey])

    const resetCamera = () => {
        if (controlRef.current) {
            controlRef.current.reset();
        }
    };
    // 回復GLB原始顏色設定
    const resetMaterialColor = (materialId: string) => {
        setConfig((prevConfig) => {
            // 複製一份覆寫表（展開運算子會產生新物件，原本的不會被動到）
            const remainingOverrides = { ...prevConfig.model.materialColorOverrides };
            // 刪掉這一筆（刪的是剛複製出來的那份）
            delete remainingOverrides[materialId];
            return ({
                ...prevConfig,
                model: {
                    ...prevConfig.model,
                    materialColorOverrides: remainingOverrides
                }
            });
        })
    }

    const setCubeConfig = (color: string) => {
        setConfig((prevConfig) => ({
            ...prevConfig,
            cube: {
                ...prevConfig.cube,
                color
            }
        }));
    }

    const setMaterialColor = (materialId: string, color: string) => {
        setConfig((prevConfig) => ({
            ...prevConfig,
            model: {
                ...prevConfig.model,
                materialColorOverrides: {
                    ...prevConfig.model.materialColorOverrides,
                    [materialId]: color
                }
            }
        }));
    }

    return (
        <div className="viewer">
            {/* NOTE: fiber 的 camera prop 只在 Canvas 初始化時建立 PerspectiveCamera，
                之後改 config.camera 不會自動更新畫面；因此切換資產時不會套用該資產的 camera，
                目前得按 Reset Camera。要自動套用得用 key 重建 Canvas（會重載模型，不建議）
                或在 Scene 內用 useThree + useEffect 同步 camera 與 controls。 */}
            <ErrorBoundary>
                {/* 材質面板：資產選擇 + （cube 模式改方塊顏色 / 模型模式列出材質並改選取項目的顏色） */}
                {/* 整合預設方塊與GLB模型介面 */}
                {(!isFallback || materials.length > 0) && (
                    <div className="material-panel appearance-panel">
                        <h3>Appearance</h3>

                        <div className="asset-selector">
                            <label htmlFor="asset-select">Asset:</label>

                            <select
                                id="asset-select"
                                value={pendingAssetId}
                                disabled={loading}
                                onChange={(event) => {
                                    setPendingAssetId(event.target.value)
                                }}
                            >
                                {assetList?.map((asset) => (
                                    <option key={asset.id} value={asset.id}>
                                        {asset.name}
                                    </option>
                                ))}
                            </select>

                            <button
                                type="button"
                                onClick={loadSelectedAsset}
                                disabled={loading || !pendingAssetId || pendingAssetId === currentAssetId}
                            >
                                {loading ? "Loading..." : "Load Asset"}
                            </button>
                        </div>


                        {!canEditConfig && (
                            <p>
                                {loading ? "Loading asset…" : "Asset not loaded — appearance is read-only."}
                            </p>
                        )}

                        {isCubeMode ? (
                            <div className="material-editor">
                                <label htmlFor="cube-color">Cube Color:</label>
                                <input
                                    id="cube-color"
                                    type="color"
                                    value={cubeConfig.color}
                                    disabled={!canEditConfig}
                                    onChange={(event) => setCubeConfig(event.target.value)}
                                />
                            </div>
                        ) : (
                            <>
                                <h4>Model Materials</h4>
                                {/* 材質面板 */}
                                {materials.map((material) =>
                                        <button 
                                            key={material.id}
                                            type="button"
                                            aria-pressed={effectiveSelectedId === material.id}
                                            className={effectiveSelectedId === material.id ? "material-item selected" : "material-item"}
                                            onClick={() => setSelectedMaterialId(material.id)}
                                        >
                                            <strong>{material.name}</strong>
                                            <small>
                                                Mesh: {material.meshName}
                                            </small>
                                            <small>
                                                Texture: {material.textureTypes.join(", ") || "N/A"}
                                            </small>
                                        </button>
                                )}
                                {/* 材質覆蓋換色 */}
                                {selectedMaterial && (
                                    <div className="material-editor">
                                        <label htmlFor="material-color">Material color: </label>

                                        <input
                                            id="material-color"
                                            type="color"
                                            value={selectedMaterial.color}
                                            onChange={(event) => {
                                                setMaterialColor(effectiveSelectedId, event.target.value)
                                            }}
                                        />
                                        <button
                                            type="button"
                                            disabled={!canEditConfig || !materialColorOverrides[effectiveSelectedId]}
                                            onClick={() => resetMaterialColor(effectiveSelectedId)}
                                        >
                                            Reset Color
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                <Canvas camera={config.camera}>
                    <Scene
                        controlRef={controlRef}
                        config={config}
                        modelKey={modelKey}
                        materialColorOverrides={materialColorOverrides}
                        showHelper={showHelper}
                        modelRetryKey={modelRetryKey}
                        onMaterialsChange={setMaterials}
                        onModelError={handleError}
                    />
                </Canvas>
            </ErrorBoundary>

            {loading && 
                <div className="viewer-status" role="status" aria-live="polite">
                    { slowLoading ? "Still loading… the backend may be waking up. Please wait." : "Loading asset..." }
                </div>
            }
            {/* 設定載入完成後才輪到模型檔；cube 模式不載入模型檔 */}
            <ModelProgressOverlay visible={!loading && !isDefaultCube} />
            {/* 讀取錯誤 */}
            {!loading && loadError && (
                <div className="viewer-status viewer-status-error" role="status" aria-live="polite">
                    Load failed: {loadError}
                    <button className="asset-retry" onClick={retry}>Retry</button>
                </div>
            )}
            {/* GLB載入錯誤 */}
            {!loading && isModelFallback && (
                <div className="viewer-status viewer-status-error" role="status" aria-live="polite">
                    Model loading failed: {modelError.message}
                    <button className="asset-retry" onClick={retryModel}>Retry</button>
                </div>
            )}
            {/* 儲存錯誤 */}
            {!loading && saveError && (
                <div className="viewer-status viewer-status-error" role="status" aria-live="polite">
                    Save failed: {saveError} — press Save to try again
                </div>
            )}

            {canSave && (
                <button className="asset-save" onClick={save} disabled={!canEditConfig || saving}>
                    {saving ? "Saving…" : "Save"}
                </button>
            )}
            {/* 攝影機歸位 */}
            <button className="camera-reset" onClick={resetCamera}>
                Reset Camera
            </button>
            {/* 輔助顯示 */}
            <button
                className="helper-toggle"
                type="button"
                aria-pressed={showHelper}
                onClick={() => setShowHelper((current) => !current)}
            >
                {showHelper ? "Hide helper" : "Show helper"}
            </button>
        </div>
    )
}
