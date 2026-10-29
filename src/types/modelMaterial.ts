type ModelMaterialInfo = {
    // 由模型節點路徑組成（例：Shoe[0]/Sole[0]:material[0]），同一模型每次載入都相同，換模型則重算
    id: string;
    name: string;
    meshName: string;
    textureTypes: string[];
    color: string;
}

export type { ModelMaterialInfo }