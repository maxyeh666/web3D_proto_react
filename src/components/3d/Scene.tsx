// OrbitControls: 旋轉 / 縮放 / 平移視角
import { OrbitControls, useGLTF } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Suspense, useMemo, useEffect, type RefObject } from "react";
import * as THREE from "three";

import type { ViewConfig } from "../../types/viewer";
import { Cube } from "./Assets";
import Lights from "./Lights";
import DebugHelper from "./DebugHelper";
import { DEFAULT_CUBE_MODEL_KEY } from "../../constants/model";
import type { ModelMaterialInfo } from "../../types/modelMaterial";

type ShowModelProps = {
	url: string;
	materialColorOverrides: Record<string, string>;
	onMaterialsChange?: (materials: ModelMaterialInfo[]) => void;
}

type SceneProps = {
	controlRef: RefObject<OrbitControlsImpl | null>;
	config: ViewConfig;
	modelKey: string;
	materialColorOverrides: Record<string, string>;
	showHelper: boolean;
	onMaterialsChange?: (materials: ModelMaterialInfo[]) => void;
};
// 一個「材質槽」= 某個 mesh 的第 N 個材質，也就是面板上的一列
type MaterialSlot = {
	id: string;
	// glTF 載入的標準材質都有 color；ShaderMaterial 之類沒有，用可選屬性表示
	material: THREE.Material & { color?: THREE.Color };
	info: ModelMaterialInfo;
};

// three 的 mesh.material 可能是單一材質或陣列，統一成陣列處理
function toMaterialArray(material: THREE.Material | THREE.Material[]) {
	return Array.isArray(material) ? material : [material];
}
// 取得節點的穩定路徑
function getStableNodeSegment(object: THREE.Object3D): string {
	const nodeName = object.name.trim() || object.type || "Object";
	// 找出同層級的其他節點
	// 只跟「同名」的兄弟比序號，才不會因為插入其他節點而位移
	// 複雜度 O(深度 × 兄弟數)：鞋子模型（數十個 mesh）可忽略；
	// 若之後要載上百 mesh 的場景，再於 traverse 前用 Map 快取每個父節點的分組索引
	const siblings = object.parent?.children.filter((sibling) => {
		const siblingName = sibling.name.trim() || sibling.type || "Object";
		return siblingName === nodeName
	}) ?? [object];

	const siblingIndex = siblings.indexOf(object);
	// 節點名常帶 "/"、":"、"["（從建模工具或 glTF 帶出），先跳脫避免與路徑分隔字元混淆
	return `${encodeURIComponent(nodeName)}[${Math.max(siblingIndex, 0)}]`;
}
// 產生「從模型節點到該 mesh」的路徑字串
// uuid 每次載入都重新生成，不能當穩定 id，所以改用「節點名 + 同名兄弟序號」
function getStableMeshPath(
	mesh: THREE.Object3D,
	modelRoot: THREE.Object3D
): string {
	const segments: string[] = [];
	let current: THREE.Object3D | null = mesh;
	// 往上追到 root 為止；root 本身不算（它只是載入容器，名稱對使用者沒有意義）
	while (current && current !== modelRoot) {
		segments.unshift(getStableNodeSegment(current));
		current = current.parent;
	}

	return segments.join("/");
}

// ShowModel：依 url 載入 glTF → 正規化顯示 → 上報材質給面板 → 套用改色（只改記憶體）
// 載入中由上層 <Suspense fallback={null}> 留白，進度提示在 Viewer 的 DOM 浮層
function ShowModel({ url, materialColorOverrides, onMaterialsChange }: ShowModelProps) {
	const { scene } = useGLTF(url);
	// useMemo計算減少渲染效能消耗
	const model = useMemo(() => {
		// 先複製場景調整，避免修改原本設定
		// clone沒有深複製，以後更複雜的模型/材質要注意
		const clone = scene.clone(true);

		// 材質處理範圍：只認 THREE.Mesh（含 SkinnedMesh / InstancedMesh）。
		// 刻意不納入 Line / Points / Sprite：模型來源是 glTF 的 TRIANGLES primitive，
		// 不會產生 LINES / POINTS；漏掉的物件會保留原始共用材質，只是不能在面板改色，
		// 不會影響其他物件的顏色，屬於安全忽略。
		// 若之後真的要支援，除了改這裡的判斷，還要一併處理面板標示（現在寫死 Mesh:）
		// 與材質屬性差異（LineBasicMaterial 沒有 normalMap / roughnessMap），那是新需求。
		clone.traverse((object) => {
			if (object instanceof THREE.Mesh) {
				object.material = Array.isArray(object.material)
					? object.material.map(material => material.clone())
					: object.material.clone();
			};
		})

		// 調整比例/位置
		// THREE.Box3大致同模型的Bounding box
		const box = new THREE.Box3().setFromObject(clone);
		const size = box.getSize(new THREE.Vector3());
		const center = box.getCenter(new THREE.Vector3());
		// 取最長邊縮放到 2 單位（用最短邊的話模型可能超出畫面）
		// scale 會讓原本的中心偏移，所以中心座標要乘上同一個比例補正回去
		const maxDimension = Math.max(size.x, size.y, size.z);
		if (maxDimension === 0) return clone;

		const scale = 2 / maxDimension;
		clone.scale.setScalar(scale);
		// 垂直方向改成「底部貼齊 y=0」：把 bounding box 最低點移到原點，模型才站在格線上而不是陷進去
		clone.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);

		return clone;
	}, [scene]);
	// 材質槽：一次 traverse 同時決定 id、材質物件與要上報的資料
	// id 只在這裡組一次；上報與改色都吃同一份，避免兩邊各寫一次而靜默對不上
	const materialSlots = useMemo<MaterialSlot[]>(() => {
		const slots: MaterialSlot[] = [];

		model.traverse((object) => {
			// 範圍與 clone 階段一致：只處理 Mesh（含 SkinnedMesh / InstancedMesh）
			if (!(object instanceof THREE.Mesh)) return;

			const meshName = object.name || "(unnamed mesh)";
			const meshPath = getStableMeshPath(object, model);
			const meshMaterials = toMaterialArray(object.material);

			meshMaterials.forEach((material, materialIndex) => {
				// 讀貼圖欄位用：基底 Material 型別沒有 map / roughnessMap / aoMap 這些屬性
				// 讀貼圖欄位用：基底 Material 型別沒有 map / roughnessMap / aoMap 這些屬性
				const mat = material as THREE.MeshStandardMaterial;
				// id 用路徑而非 uuid（原因見 getStableMeshPath），同 mesh 多材質時再補序號
				const id = `${meshPath}:material[${materialIndex}]`;

				const textureTypes = [
					mat.map && "Color",
					mat.normalMap && "Normal",
					mat.roughnessMap && "Roughness",
					mat.metalnessMap && "Metalness",
					mat.aoMap && "AO",
					mat.emissiveMap && "Emissive"
				].filter((value): value is string => Boolean(value));

				// 一個 mesh 可能有多個材質（geometry group）；同名時補序號才分得出來
				const suffix = meshMaterials.length > 1 ? ` #${materialIndex + 1}` : "";

				slots.push({
					id,
					material,
					info: {
						id,
						name: `${mat.name || "(unnamed material)"}${suffix}`,
						// 一個材質槽只對應一個 mesh
						meshName,
						textureTypes,
						// 不是每種材質都有 color（例如 ShaderMaterial）
						color: mat.color ? `#${mat.color.getHexString()}` : "#ffffff"
					}
				})
			})
		})

		return slots;
	}, [model]);
	// 上報：材質槽變動（換模型 / 重新載入）時做一次
	useEffect(() => {
		onMaterialsChange?.(materialSlots.map(slot => slot.info));
	}, [materialSlots, onMaterialsChange]);
	// 顏色：只改記憶體、不存檔也不寫回後端
	// 合併成一支會變成「改色 → 上報 → 上報的顏色是舊值 → 洗回原色」
	useEffect(() => {
		for (const { id, material } of materialSlots) {
			const color = materialColorOverrides[id];
			if (!color) continue;

			material.color?.set(color);
		}
	}, [materialSlots, materialColorOverrides]);
	// primitive是Three.js用來掛載物件的標籤
	return <primitive object={model} />;
}

// Scene: 場景組合 — Cube / Lights / DebugHelper / OrbitControls
function Scene({ controlRef, config, modelKey, materialColorOverrides, showHelper, onMaterialsChange } : SceneProps) {
	const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL)?.replace(/\/$/, "") ?? "";
	const modelUrl = `${apiBaseUrl}/models/${encodeURIComponent(modelKey)}`;

	return (
		<>
			{modelKey === DEFAULT_CUBE_MODEL_KEY ? (
					// 2x2x2 立方體，底部貼齊 y=0 格線
					<Cube color={config.cube.color} />
				) : (
					// 後端GLB/GLTF模型
					// 載入中的提示在 Viewer 的 DOM 浮層（Canvas 內只能放 3D 物件），這裡不給 fallback
					<Suspense fallback={null}>
						<ShowModel url={modelUrl} onMaterialsChange={onMaterialsChange} materialColorOverrides={materialColorOverrides} />
					</Suspense>
				)
			}

			{/* 環境光 + 兩組方向光 */}
			<Lights showMarkers={showHelper} />

			{/* 座標軸 + 地面格線 */}
			<DebugHelper visible={showHelper} />

			{/* 視角控制：左鍵旋轉 / 滾輪縮放 / 右鍵平移 */}
			<OrbitControls ref={ controlRef } enableDamping dampingFactor={0.05} />
		</>
	);
}

export default Scene;
