# 學習筆記（前端）

> 這裡記錄實作過程中搞懂的概念，一問一答：問題寫成脫離對話也看得懂的完整句子。
> 對應的程式變更與設計理由見 [CHANGELOG.md](./CHANGELOG.md)。

## 主題索引

- **React** — 10-03、10-07、10-24
- **React Three Fiber / three.js** — 10-07、10-25
- **瀏覽器 API 與網路請求** — 10-22
- **TypeScript** — 10-24、10-25

---

## 2026-10-25 — glTF 載入、材質列表與改色

**學習筆記**
- `useGLTF` 在 render 期間觸發 Suspense，須由同層 `<Suspense>` 包覆；`fallback`（載入中顯示內容）設為 `null`，因 WebGL 畫布內僅能放置 3D 物件，無法顯示文字或 HTML。
- `@types/three` 的 `Material` 基底型別未定義 `color`（僅存檔用的 `MaterialJSON` 有此欄位）；執行期 glTF 載入器提供標準材質，故以 `as THREE.MeshStandardMaterial` 轉型後讀取 `color`。若模型含 `ShaderMaterial`（無 `color`），轉型後的 `mat.color` 為 `undefined`，寫回顏色的 effect 已用可選鏈處理。
- `Object.fromEntries(materials.map(...))` 建立「uuid → 顏色」字典，`Scene` 的覆寫 effect 以 uuid 查表，較逐次掃描陣列有效率。

## 2026-10-24 — 管理者登入面板（遠端模式）與寫入權限對齊

**學習筆記**
- 問：React 的 `onSubmit` 事件型別應撰寫 `SubmitEvent` 或 `FormEvent`？為何網路上兩種寫法皆可見，而 `@types/react` 又標記 `FormEvent` 已棄用？

  答：兩者皆為 React 包裝的事件型別（合成事件：React 為統一各瀏覽器行為而額外包裝的事件物件），差異在精確度。`FormEvent` 為早期留下的泛稱，`@types/react` 內直接註明其實際上已不存在並標為棄用；`SubmitEvent` 方為專指「送出表單該次」的型別，定義為 `SubmitEvent<T> extends SyntheticEvent<T, NativeSubmitEvent>`，第二個型別參數即瀏覽器原生的 `SubmitEvent`（含 `submitter`，可知由哪顆按鈕送出）。故 `onSubmit` 應撰寫 `SubmitEvent<HTMLFormElement>` 最為精確；`FormEvent<HTMLFormElement>` 雖仍可編譯（React 為相容舊程式保留），新程式不應再撰寫。命名上為與瀏覽器原生型別區分，匯入時撰寫為 `type SubmitEvent as ReactSubmitEvent`。

## 2026-10-22 — API 請求逾時與 GET 重試、載入 / 儲存錯誤分離、Retry 與收尾（Error Boundary、CI lint）

- 問題：`AbortController` 是什麼？為何 `fetch` 須藉由它方能實作「逾時」？

  答：`fetch`（瀏覽器內建的發送請求函式）僅負責「送出請求、等候回應」，本身未提供「最多等候幾秒」的設定；伺服器若一直未回應，Promise 即持續停留於等待狀態。

  `AbortController` 為瀏覽器內建的「取消開關」：`controller.signal` 為掛載於請求的取消訊號，將其傳入 `fetch`，後續呼叫 `controller.abort()`，該請求即立刻中止並轉為失敗。

  以 `setTimeout` 作為計時器、時間到即呼叫 `abort()`，等同補上 `fetch` 所無的逾時機制。
- 問題：為何 `fetchWithTimeout` 須監聽呼叫端傳入的 `signal`，且於 `finally` 將其移除？

  答：呼叫端亦可能欲取消同一請求（例如元件卸載時），但單次 `fetch` 僅接受一個 `signal`，而此函式已將自身的 controller 交出。

  故改為「監聽外部 signal，一旦中止，即連帶中止自身的 controller」，使兩種取消來源皆生效。

  `finally` 中的 `removeEventListener` 係拆除監聽：此段程式每送一次請求即執行一次，未拆除則監聽持續累積，久而久之成為記憶體負擔。
- 問題：`RequestInit` 究竟是什麼？為何參數須撰寫為 `init?: RequestInit`？

  答：`RequestInit` 為 TypeScript 內建（瀏覽器型別定義中）的型別名稱，用以描述 `fetch` 第二個參數可放置的設定：`method`（GET / PUT 等）、`headers`（須攜帶的標頭）、`body`（須送出的內容）、`signal`（取消訊號）等。

  `init?:` 的 `?` 表示「可不傳入」，故僅撰寫 `fetch(url)` 亦可使用，該情況下預設即為 GET。

  `request()` 中的 `{ ...init, headers: { ... } }` 係先複製呼叫端的設定一份、再覆寫 `headers`，不會更動呼叫端傳入的原始物件。
- 問題：呼叫 `abort()` 之後，錯誤由何者接手？為何不會被重試機制吞掉？

  答：`abort()` 會使 `fetch` 該行直接擲出錯誤（錯誤名稱為 `AbortError`），故進入 `withRetry` 的 `catch`。

  該處以 `init?.signal?.aborted` 判斷「是否為呼叫端自行取消」：若是，則不再重試，將錯誤原樣向上擲出；重試僅保留予「網路本身異常、且尚有重試次數」的情況。

## 2026-10-07 — 明確 id 載入 + 信任後端（移除 isDisplayableAsset）、光源標籤改用 3D 文字（修 React 19 unmount 警告）

### 明確 id 載入與信任後端

- 問：為何 `useEffect` 使用的函式（例如 `loadAsset`）須先以 `useCallback` 包裝、再列入依賴陣列？直接撰寫普通函式有何不可？

  答：元件每次重新渲染，定義於其中的函式皆會重新建立、成為「另一個」函式。

  若將其列入 `useEffect` 的依賴陣列，React 會判定「依賴每次皆變更」，於是每次渲染皆重跑 effect，形成無限迴圈；但若刻意不列，`react-hooks/exhaustive-deps`（ESLint 檢查 effect 依賴是否列齊的規則）又會警告「已使用卻未列出」。

  `useCallback`（使函式保持身分：內容未變更即不換為新的）可使同一函式於重新渲染後仍為同一身分，如此既列入依賴、又不致無限重跑，兩邊皆滿足，亦無須關閉規則。
- 問：為何不可於 `useEffect` 開頭直接呼叫 `setLoading(true)`？（`react-hooks/set-state-in-effect` 此條規則在防範什麼？）

  答：此規則防範「effect 一進入即同步修改 state」的寫法。effect 於畫面渲染完畢後方執行，若一進入又同步設定一次 state，React 會立即再排一次渲染，等於多繞一圈、亦多一次不必要的重繪。

  以本專案而言，`loading` 初始值本即為 `true`，而載入流程最終的 `.finally()` 必定將其設回 `false`，故該句同步的 `setLoading(true)` 屬多餘，直接移除即可。
- 問：為何開發模式下瀏覽器 Network 面板可見 `GET /assets` 發送兩次、正式打包（build）後僅發送一次？而 `PUT` 僅發送一次？

  答：因 `main.tsx` 包裝了 `<StrictMode>`。

  StrictMode 於開發模式會刻意將每個 effect 執行為「掛載 → 清除 → 再掛載」一輪，用以提早發現未妥善撰寫清除邏輯的程式；負責載入資料的 effect 因此被觸發兩次，`GET` 亦隨之發送兩次。

  此為開發模式特有行為，正式打包不致如此，故 production 僅發送一次。

  `PUT` 僅發送一次，因其掛載於「使用者按下儲存」的事件、而非 effect，StrictMode 不會重跑事件處理，自然僅發送一次。

### 光源標籤改用 3D 文字

- 問題：為何 React 專案載入時，瀏覽器開發者工具的 Console 會出現「Attempted to synchronously unmount a root while React was already rendering」警告？

  答：此為 React 19 於開發模式的提醒。當某段程式於 React「正在渲染／提交」過程中卸載另一 React root 時即會出現。

  本專案的觸發點為 drei 的 `<Html>`：其為顯示 HTML 內容，會於同一頁另建獨立的 React root，而移除時採「同步」卸載，為 React 所偵測。改用繪於場景內的 3D 文字 `<Text>`（不另開 root）後，警告即消失。
- 問題：為何畫面明明為初次載入，開發模式卻似在「卸載」物件，進而觸發此警告？

  答：因 `main.tsx` 採用了 `<StrictMode>`。StrictMode 於開發模式會刻意將每個 effect 執行為「先掛載、再清除、再掛載一次」，用以提早發現未妥善撰寫清除邏輯的程式。

  該「清除」正好使 drei `<Html>` 觸發一次同步卸載，故初次開啟頁面亦可見警告。

## 2026-10-03 — 前端資料層接縫（Backend Seam）

- `structuredClone` 為瀏覽器與 Node 內建的深拷貝做法；以往多以 lodash 的 `_.cloneDeep` 處理，資料單純時以內建 API 已足夠。
- `request` 的 `<T>` 為泛型佔位符：使用時填入 `Asset` / `Asset[]` / `void` 即得對應型別。
- C# 亦有泛型（`List<T>` / `Dictionary<TKey, TValue>`），概念與 TS 的 `<T>` 相同；C# 的 `dynamic` 類似 TS 的 `any`（皆關閉編譯期型別檢查），現代 C# 僅於 COM 互操作、舊式動態 JSON、`ViewBag` 等情境可見，新程式應避免使用。
- TS 的 `any`、C# 的 `dynamic`、Java 的 `Object` 轉型，皆為繞過型別檢查的寫法：知悉即可，平時少用；本專案一律不使用 `any`。
