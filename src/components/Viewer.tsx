import { Canvas } from "@react-three/fiber"
import { useProgress } from "@react-three/drei"
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib"
import { useRef, useMemo, useState } from "react"

import Scene from "./3d/Scene"
import "./Viewer.css"
import { useAssetConfig } from "../hooks/useAssetConfig"
import { ErrorBoundary } from "./ErrorBoundary"
import { DEFAULT_CUBE_MODEL_KEY } from "../constants/model"
import type { ModelMaterialInfo } from "../types/modelMaterial"

// Viewer: 全螢幕 Canvas 容器
// Canvas camera — position: 相機世界座標 / fov: 垂直視角（度）
// config 來自資料層（local 預設 / 後端 remote），編輯後按 Save 寫回
export default function Viewer(
    { canSave } : {canSave : boolean}
) {
    const controlRef = useRef<OrbitControlsImpl | null>(null);
    const [materials, setMaterials] = useState<ModelMaterialInfo[]>([]);
    const [selectMaterialId, setSelectedMaterialId] = useState("");

    const materialColorOverrides = useMemo(() => {
            return Object.fromEntries(
                materials.map(material => [
                    material.id,
                    material.color
                ])
            )
        }
    , [materials])

    const { config, modelKey, setConfig, save, loading, slowLoading, saving, loadError, saveError, retry } = useAssetConfig();
    // 模型檔（GLB）載入進度：drei 的 useProgress 追蹤 three.js 的 DefaultLoadingManager，
    // 與上面 loading（資產設定 API）是兩件事，7.8MB 的模型要另外提示
    const { active: modelLoading, progress: modelProgress } = useProgress();
    const modelProgressPercent = Math.round(modelProgress) || 0;
    // 暫時使用cube，多資產後處理
    const cubeConfig = config.cube;

    const selectedMaterial = materials.find(material => material.id === selectMaterialId)

    const resetCamera = () => {
        if (controlRef.current) {
            controlRef.current.reset();
        }
    };

    const setCubeConfig = (color: string) => {
        setConfig((prevConfig) => ({
            ...prevConfig,
            cube: {
                ...prevConfig.cube,
                color
            }
        }));
    }

    return (
        <div className="viewer">
            {/* NOTE: fiber 的 camera prop 只在 Canvas 初始化時建立 PerspectiveCamera，
                之後改 config.camera 不會自動更新畫面；
                若要做 Camera 控制 UI，需用 key 重建 Canvas 或在 Scene 內用 useThree + useEffect 同步。 */}
            <ErrorBoundary>
                {/* 材質面板 */}
                {materials.length > 0 && (
                    <div className="material-panel">
                        <h3>Model Materials</h3>

                        {
                            materials.map((material) =>
                                <button 
                                key={material.id}
                                className={selectMaterialId === material.id ? "material-item selected" : "material-item"}
                                onClick={() => setSelectedMaterialId(material.id)}
                                >
                                    <strong>{material.name}</strong>
                                    <small>Mesh: {material.meshNames.join(", ") || "No match mesh"}</small>
                                    <small>
                                        Texture: {material.textureTypes.join(", ") || "N/A"}
                                    </small>
                                </button>
                            )
                        }
                        {/* 選取後換色 */}
                        {selectedMaterial && (
                            <div className="material-editor">
                                <label htmlFor="material-color">Material color: </label>

                                <input
                                    id="material-color"
                                    type="color"
                                    value={selectedMaterial.color}
                                    onChange={(event) => {
                                        const color = event.target.value;

                                        setMaterials((current) =>
                                            current.map((material) =>
                                                material.id === selectMaterialId
                                                    ? { ...material, color }
                                                    : material
                                            )
                                        );
                                    }}
                                />
                            </div>
                        )}
                    </div>
                )}

                <Canvas camera={config.camera}>
                    <Scene
                        controlRef={controlRef}
                        config={config}
                        modelKey={modelKey}
                        materialColorOverrides={materialColorOverrides}
                        onMaterialsChange={setMaterials}
                    />
                </Canvas>
            </ErrorBoundary>

            {loading && 
                <div className="viewer-status">
                    { slowLoading ? "Service starting, please wait..." : "Loading asset..." }
                </div>
            }
            {/* 設定載入完成後才輪到模型檔；cube 模式不載入模型檔 */}
            {!loading && modelKey !== DEFAULT_CUBE_MODEL_KEY && modelLoading && (
                <div className="viewer-status">
                    Loading model… {modelProgressPercent}%
                </div>
            )}
            {!loading && loadError && (
                <div className="viewer-status viewer-status-error">
                    Load failed: {loadError}
                    <button className="asset-retry" onClick={retry}>Retry</button>
                </div>
            )}
            {!loading && saveError && (
                <div className="viewer-status viewer-status-error">
                    Save failed: {saveError} — press Save to try again
                </div>
            )}

            {canSave && (
                <button className="asset-save" onClick={save} disabled={loading || saving}>
                    {saving ? "Saving…" : "Save"}
                </button>
            )}
            <button className="camera-reset" onClick={resetCamera}>
                Reset Camera
            </button>
            {modelKey === DEFAULT_CUBE_MODEL_KEY && (
                    <input className="color-picker" type="color" value={cubeConfig.color} onChange={(e) => setCubeConfig(e.target.value)} />
                )
            }
        </div>
    )
}
