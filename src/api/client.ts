// api/client.ts — 後端 API 用的薄 fetch 封裝
// baseURL 由 Vite 環境變數 VITE_API_BASE_URL 提供（見 .env.example）
// 注意：VITE_ 開頭的變數會被打包進前端，只放非機密的公開設定
const REQUEST_TIMEOUT_MS = 65000;
const MAX_GET_RETRIES = 2;

function getBaseUrl(): string {
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    if (!baseUrl) {
        throw new Error("VITE_API_BASE_URL is not set");
    }
    return baseUrl.replace(/\/+$/, "");
}

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function shouldRetry(status: number): boolean {
    return [408, 429, 500, 502, 503, 504].includes(status);
}
// 指數退避，根據2的次方增加延遲
function getRetryDelay(attempt: number): number {
    return 1000 * 2 ** attempt;
}

// fetchWithTimeout: 在 fetch 外層加上「最多等多久」
// - fetch 沒有逾時參數，連線卡住時 Promise 會一直 pending；這裡用 AbortController（瀏覽器內建的取消開關）
//   自己計時，時間到就 abort() 中止這次請求
// - 呼叫端若也帶了 signal（例如元件卸載要取消），會轉接到內部的 controller，並在 finally 移除監聽，避免累積
// - init?: RequestInit 是 fetch 第二個參數（method / headers / body / signal 等設定）的型別；不傳即為 GET
async function fetchWithTimeout(
    url: string,
    init?: RequestInit
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
        controller.abort(new Error(`API request timed out after ${REQUEST_TIMEOUT_MS}ms`));
    }, REQUEST_TIMEOUT_MS);

    const abortFromCaller = () => controller.abort(init?.signal?.reason);

    if (init?.signal?.aborted) {
        abortFromCaller();
    } else {
        init?.signal?.addEventListener("abort", abortFromCaller, { once: true });
    }

    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } finally {
        window.clearTimeout(timeoutId);
        init?.signal?.removeEventListener("abort", abortFromCaller);
    }
}

async function withRetry(
    url: string,
    init?: RequestInit
): Promise<Response> {
    // fetch 沒帶 method 時預設就是 GET，不能只看 init.method === "GET"
    const isGet = (init?.method ?? "GET").toUpperCase() === "GET";
    const maxAttempts = isGet ? MAX_GET_RETRIES + 1 : 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        let response: Response;

        try {
            response = await fetchWithTimeout(url, init);
        } catch (error) {
            if (init?.signal?.aborted || attempt >= maxAttempts - 1) throw error;

            await wait(getRetryDelay(attempt));
            continue;
        }

        if (isGet && shouldRetry(response.status) && attempt < maxAttempts - 1) {
            await response.body?.cancel().catch(() => {});
            await wait(getRetryDelay(attempt));
            continue;
        }

        return response;
    }

    // 正常流程跑不到這裡：最後一回合失敗會 throw、成功會 return。
    // TypeScript 不會跨迴圈回合推理，所以補一個明確的結尾讓回傳型別成立。
    throw new Error("withRetry: exhausted all attempts without a response");
}

// request: JSON 請求的薄封裝
// - 自動帶 Content-Type: application/json
// - 非 2xx 時丟出帶狀態碼的 Error，方便 UI 顯示
// - `<T>` 為泛型：呼叫時由實際型別代入（例如 request<Asset>），回傳 Promise<T> 即為該型別，本檔各處沿用此寫法
async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await withRetry(`${getBaseUrl()}${path}`, {
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
