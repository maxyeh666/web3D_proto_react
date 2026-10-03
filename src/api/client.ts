// api/client.ts — 後端 API 用的薄 fetch 封裝
// baseURL 由 Vite 環境變數 VITE_API_BASE_URL 提供（見 .env.example）
// 注意：VITE_ 開頭的變數會被打包進前端，只放非機密的公開設定

function getBaseUrl(): string {
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    if (!baseUrl) {
        throw new Error("VITE_API_BASE_URL is not set");
    }
    return baseUrl.replace(/\/+$/, "");
}

// request: JSON 請求的薄封裝
// - 自動帶 Content-Type: application/json
// - 非 2xx 時丟出帶狀態碼的 Error，方便 UI 顯示
// - `<T>` 為泛型：呼叫時由實際型別代入（例如 request<Asset>），回傳 Promise<T> 即為該型別，本檔各處沿用此寫法
async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${getBaseUrl()}${path}`, {
        ...init,
        headers: { "Content-Type": "application/json", ...init?.headers },
    });

    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(
            `API ${response.status} ${response.statusText}${body ? `: ${body}` : ""}`,
        );
    }

    // 204 = 成功但無回傳內容（例如 DELETE）。body 為空不可 .json()，否則會 SyntaxError，直接回 undefined
    if (response.status === 204) {
        return undefined as T;
    }
    return (await response.json()) as T;
}

export { request };
