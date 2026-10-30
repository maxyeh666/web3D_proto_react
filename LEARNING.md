# 學習筆記（前端）

> 這裡記錄實作過程中搞懂的概念，一問一答：問題寫成脫離對話也看得懂的完整句子。
> 對應的程式變更與設計理由見 [CHANGELOG.md](./CHANGELOG.md)。

## 主題索引

- **React** — 10-03、10-07、10-24、10-26、10-30
- **React Three Fiber / three.js** — 10-07、10-25、10-29、10-30
- **瀏覽器 API 與網路請求** — 10-22
- **TypeScript** — 10-24、10-25、10-30
- **無障礙（ARIA 與鍵盤操作）** — 10-30

---

## 2026-10-30 — 材質覆寫持久化、快取清除、錯誤邊界、`const` 與渲染、hook 三兄弟、無障礙說明

- 問：`useAssetConfig` 中的 `currentAssetId` 以 `const` 宣告（`const currentAssetId = asset?.id ?? ""`），為何資產切換後它的值仍會改變？

  答：`const` 限制的是「同一次函式執行期間，這個名稱不可重新指向別的值」，並不表示值永遠不變。`useAssetConfig` 是一個函式（hook 本質上就是函式），元件每次重新渲染，React 都會把整個函式從第一行重新執行一次；每次執行都建立一批全新的區域變數，其中包含這個 `const`。實際情況是「名稱相同、執行個體不同」——上一輪渲染的 `currentAssetId` 與這一輪的是兩個互不相干的常數。

  以本專案的實際執行順序來看：第一次渲染時 `useState` 的初始值生效，`asset` 為 `null`，算出 `currentAssetId` 為空字串、`config` 為前端預設設定，畫面顯示 cube 模式；渲染提交後，`useEffect(() => { loadAsset() }, [loadAsset])` 才執行（effect 一定晚於渲染），發出請求；請求回來後 `.then` 呼叫 `setAsset(...)`，`setAsset` 不會立刻改值，而是要求 React 再渲染一次；第二次渲染又從第一行跑到最後一行，這次 `asset` 已是有內容的物件，`currentAssetId` 重新計算得到資產 id，`config` 換成後端回來的設定。

  對照表：

  | 時點 | `asset` | `currentAssetId` | `config` |
  | --- | --- | --- | --- |
  | 第一次渲染 | `null` | `""` | `defaultConfig` |
  | 初始載入成功後 | `Asset(id="2")` | `"2"` | 後端設定（已正規化） |
  | 切換到另一筆完成後 | `Asset(id="3")` | `"3"` | 該筆設定 |
  | Save 成功後 | 同 id 的新物件 | `"3"`（重新計算，值相同） | 後端回傳版本 |
  | 載入失敗 | 維持上一筆成功值（只在成功時 `setAsset`） | 維持上一筆 | 維持上一筆；錯誤另由 `loadError` 顯示 |

  因此 `currentAssetId` 不是「被修改的變數」，而是每一輪渲染依當下的 `asset` 重新計算出的衍生值。跨渲染真正被保留的是 `useState` 的 `asset`（React 把它存在元件之外）；`const` / `let` 這種區域變數每輪都會重設，無法記憶任何東西。要跨渲染保存只有兩條路：`useState`（變動會觸發重新渲染）與 `useRef`（變動不觸發重新渲染）。`useCallback` 能讓函式保持同一身分，原理相同——不是變數宣告方式造成，而是 React 在元件外部保存了它。

  附帶的實務取捨：`currentAssetId` 也可以不宣告、直接在使用處寫 `asset?.id ?? ""`，但它在三處被使用（判斷是否 fallback、比對模型錯誤、選擇器按鈕的鎖定條件），抽成具名常數可避免三處各寫一次而口徑不一，故保留現行寫法。

- 問：`useCallback`、`useMemo`、`useRef` 三者的作用與適用時機分別是什麼？本專案各用在哪裡、為什麼該處非用不可？

  答：三者共同的背景是「元件每次渲染都會重新執行整個函式」，因此需要機制讓某些東西跨渲染保持不變；差別在於各自保留的對象。

  `useCallback(fn, deps)` 保留函式本身的身分（同一份參考）。適用時機有二：一是該函式要放進 `useEffect` 的依賴陣列，否則每次渲染都是新函式，effect 會被判定為依賴變更而反覆執行；二是該函式要當 prop 傳給已 memo 化的子元件，身分改變會讓子元件重新渲染。

  `useMemo(fn, deps)` 保留計算結果（含物件與陣列的參考）。適用時機有二：一是計算成本高；二是結果本身要當依賴往下傳，參考不穩定會使下游 effect 反覆重跑。

  `useRef(initialValue)` 保留一個可讀寫的容器（`{ current }`），其變動不觸發重新渲染。適用時機：保存不屬於畫面資料的東西（three.js 物件實例、DOM 節點）、計時器 id，或記錄前一次的值。

  一句話區分：state 變了要重畫畫面；ref 變了不想重畫；`useCallback` 與 `useMemo` 只是「沿用上一次的函式或計算結果」，本身不保存狀態。

  本專案的實際分布：`useAssetConfig` 的 `loadAsset`（依賴 `[]`）因被 `useEffect(() => { loadAsset() }, [loadAsset])` 呼叫，若不固定身分，effect 每次渲染都會重跑並重複發出請求；`retry`（依賴 `[loadAsset]`）內部呼叫 `loadAsset`，故須把它列入依賴，身分穩定與否會直接傳導；`loadSelectedAsset`（依賴 `[pendingAssetId, asset?.id]`）的函式本體讀取這兩個值，依賴未列齊會取到舊值（閉包捕獲的是該次渲染的版本）。

  `Viewer` 的 `handleError`（依賴 `[currentAssetId, modelKey]`）需要記住「錯誤發生在哪一筆資產、哪一個模型」；同時它作為 prop 傳給 `Scene`，身分穩定可避免 `Scene` 內部的 effect 因新函式而重跑。`Scene` 的 `model`（依賴 `[scene]`）包含場景複製、材質複製與 bounding box 量測，成本高且結果供後續計算使用；`materialSlots`（依賴 `[model]`）需 traverse 整棵場景，且它是兩個 `useEffect` 的依賴，若不快取，每次渲染都產生新陣列，會讓上報與套色兩支 effect 反覆執行。`Viewer` 的 `controlRef` 保存 `<OrbitControls>` 的實例（three.js 物件，非畫面資料），Reset Camera 需呼叫其 `.reset()`；改用 state 會造成多餘渲染，改用一般變數則每次渲染都被重設而拿不到實例。

  最後的判準：三者本身都有成本，也會增加閱讀負擔，不應無條件套用。「需要跨渲染保持身分」或「計算確實昂貴」成立時才使用，其餘情況直接寫普通函式或就地計算更清楚。`useCallback` 的單一情境（`loadAsset` 與 effect 依賴的關係）已於 2026-10-07 記錄；本則補齊三者判準與本專案的實際分布。


**學習筆記**
- 問：材質顏色的覆寫為何存成「材質槽 id → 顏色」的稀疏表，只記錄使用者改過的項目，而不是把每個材質目前的顏色整份寫回 config？

  答：原色屬於模型檔而非設定；整份存會把「使用者改過的」與「模型原本的」混在同一個物件裡，且模型換版本後，整份舊顏色會直接蓋掉新的原色，無法分辨哪些該保留。稀疏表缺 key 即代表用原色，Reset 只需刪掉該 key，不必先知道原色是什麼；若存整份，Reset 必須額外記住每個槽的原色才能還原。

- 問：`resetMaterialColor` 為何可以先展開複製覆寫表、再以 `delete` 刪除屬性？這樣不會破壞不可變原則（不直接修改舊資料）嗎？

  答：`delete` 的風險在刪除「共用物件」（其他程式仍在引用的那份）上的屬性，會讓其他人拿到缺欄位的物件；此處刪除的是剛以展開運算子複製出的新物件，原本的 state 物件未被改動，因此不違反不可變原則。舊寫法以物件解構的剩餘屬性（rest）把「複製」與「排除」合在同一行，效果相同，但需引入一個僅為滿足語法而存在、之後完全不用的變數，可讀性較低，故改用先複製再刪除的寫法。

- 問：`useGLTF.clear()` 為何必須傳入與載入時完全相同的 URL 字串，否則 Retry 會無效？

  答：`useGLTF` 的快取 key 是「載入器 + url」的參數陣列（`useGLTF` 的 cache key 含傳入的參數），載入失敗時擲出的錯誤也會一併快取。若清除時傳入不同字串（例如兩處各自拼接、尾斜線不一致），清除的與快取的是兩個不同的 key，舊錯誤仍在快取中，下一次渲染取到它並重新拋出，錯誤邊界再次接住，Retry 看起來像沒作用。故 URL 只由 `getModelUrl` 產生，載入與清除共用同一份輸出。

- 問：React 的 Error Boundary（錯誤邊界：捕捉子元件渲染期間錯誤並顯示替代畫面的機制）為何只能寫成 class component？`getDerivedStateFromError` 與 `componentDidCatch` 分別負責什麼？

  答：錯誤邊界依賴的是 class 專屬的生命週期方法，函式元件沒有對應機制（目前沒有等價的 hook）。`getDerivedStateFromError` 於渲染階段被呼叫，負責把錯誤寫進 state、讓下一次渲染顯示替代內容，因此必須是無副作用的純函式；`componentDidCatch` 於提交階段被呼叫，適合做副作用，例如記錄日誌。兩者分工是「先決定顯示什麼、再處理要做什麼」。

- 問：`ModelErrorBoundary` 的 `key` 為何要綁定模型 key 與重試次數？

  答：錯誤邊界一旦進入錯誤狀態，只能靠重新建立實例來復原；只更換 props 不會清除 state，畫面會永遠停在 fallback。把 `key` 設為 `${modelKey}:${modelRetryKey}`（模型 key 與重試次數的組合）後，換模型或按下 Retry 都會讓 React 建立新的邊界實例，舊的錯誤狀態隨之丟棄，新的載入流程重新開始。

- 問：錯誤狀態為何要同時記錄資產 id 與模型 key，而不是只存一則訊息？

  答：訊息本身無法判斷「它屬於哪一次載入」。元件內只有一組錯誤 state，切換資產或模型後，若只比對訊息，舊錯誤會被當成當前狀態，畫面顯示的錯誤並不存在於當前資產。記錄 `assetId` 與 `modelKey` 兩把識別鑰匙後，顯示條件要求兩者都等於當前值才成立，切換後舊錯誤自動失效，不需額外清除。

- 問：為什麼載入中、載入失敗與 GLB 載入失敗的狀態訊息，要標上 `role="status"` 與 `aria-live="polite"`？這兩個屬性是什麼意思？

  答：輔助技術（螢幕報讀器，例如 NVDA、VoiceOver：替視障使用者朗讀畫面的軟體）預設只讀取「有焦點的元素」或「使用者正在操作的位置」。狀態訊息是後來才出現的 `div`，若不特別標示，視障使用者不會知道載入成功了、失敗了，或需要按 Retry。

  `role="status"` 表示「這是一塊狀態訊息區」；`aria-live="polite"`（禮貌模式的即時區域：一種等使用者手邊動作停下才朗讀的通知方式）表示「內容變化時請朗讀，但不必打斷正在朗讀的內容」。兩者合起來，螢幕報讀器會在狀態文字出現或改變時自動朗讀一次，而操作到一半的使用者不會被插話。

  對照：登入錯誤用的是 `role="alert"`（`App.tsx:81`），它是侵入式通知，會立刻打斷當前朗讀。登入是使用者剛按下按鈕、正在等結果的時刻，打斷是合理的；載入與模型錯誤多半發生在使用者的等待期間，用 `polite` 等手邊段落讀完再通知即可。選哪一個的判準是「使用者現在是否在等這個結果」。

  附帶說明：`div` 本身不是可聚焦元素，`disabled` 的 `<button>` 也無法取得焦點；因此狀態區的朗讀不能依賴鍵盤游標，只能靠 `aria-live`。而「誰朗讀了、朗讀了幾次」只能以實際的螢幕報讀器驗證，瀏覽器開發者工具看不出來，結案前應至少用一種報讀器走一次流程。

- 問：為什麼材質槽清單用 `<button>` 而不是可點的 `div`？`aria-pressed` 又是在表達什麼？

  答：鍵盤使用者以 Tab 鍵在「可聚焦元素」之間移動，只有表單控制項與連結等少數元素天生可聚焦；`div` 與 `span` 預設按 Tab 會被直接跳過。若把材質槽做成可點的 `div`，滑鼠使用者點得到，鍵盤使用者卻永遠到不了，等於同一功能有兩種可用性。用原生 `<button>`，聚焦、Enter / Space 觸發、鎖定（`disabled` 時自動跳過且點不下去）全部由瀏覽器處理，不需自行補鍵盤事件。

  `aria-pressed`（開關狀態：向輔助技術宣告某個按鈕處於「已選中」或「未選中」）用在開關型的按鈕上，讓報讀器讀出「XXX，按鈕，已選中」而非只有名稱。本專案有兩處：切換輔助顯示的 `Show helper`（`Viewer.tsx:303`），與材質槽清單（`Viewer.tsx:208`）。後者是一組「單選」行為——同一時間只有一筆有效選取（`effectiveSelectedId`，失效時退回第一筆）。但要注意：`aria-pressed` 宣告的是每個按鈕各自的狀態，報讀器不會自動說明「這是一組單選」；嚴格做法是用 `role="radiogroup"` 包住整組、每個項目用 `role="radio"` 並以方向鍵切換。目前用 `aria-pressed` 已能傳達選中狀態，屬於夠用但不滿分的折衷（見下方已知限制）。

  同一思路套用到其他控制項：資產 `<select>` 與顏色 `<input type="color">` 都是原生控制項，天生支援鍵盤（方向鍵改選項、Enter 開啟選單）；`<label htmlFor="...">` 把文字與控制項綁定（`Viewer.tsx:156/191/224`），點擊文字等同聚焦控制項，報讀器也會一併讀出標籤。目前的無障礙程度是「操作都到得了、狀態都讀得到」，尚未做到的是：3D 畫布本身的鍵盤操作（OrbitControls 只吃滑鼠，鍵盤無法旋轉視角）、以及按下 Retry 後焦點留在原地而非移往新的狀態（操作後不知結果在哪）。

---


## 2026-10-29 — 輔助元素開關的閃爍、材質槽 id

**學習筆記**
- 問：為何首次開啟輔助元素（顯示光源標記）時模型隨之短暫消失，再次開關則無此現象？為何瀏覽器開發者工具的 Disable cache 無法重現該現象？

  答：光源標記含 drei 的 `<Text>`（底層為 troika 排版），首次掛載時須載入字型；資源未就緒時它透過 `suspend-react` 拋出 promise（即 suspend：暫停渲染、等候非同步資源），向外尋找最近的 `<Suspense>` 邊界。

  若邊界落到 R3F Canvas 內建的那一層，R3F 會把整個場景設為不可見（含模型與燈光），故模型隨之短暫消失。將邊界下移到標記自身的 `<Suspense fallback={null}>` 後，suspend 期間只有標記缺席，其餘照常顯示。

  首次之後不再出現，是因 `suspend-react` 的快取為記憶體內（key 含字型與文字內容），同一頁面生命週期內第二次開啟已有快取，不再 suspend。開發者工具的 Disable cache 管的是 HTTP 快取，不管記憶體快取，故無法重現；重現方法是重新載入頁面後第一次開啟。

- 問：three.js 物件的 `uuid` 有什麼特性？為何不能拿來當材質槽的穩定 id？

  答：`uuid` 由 three.js 在每次建立物件時生成（`new`、`clone()` 均如此），同一份模型重新載入或複製後整組改變；以它組成的 id 換模型即失效，選取與顏色覆寫無法跨載入沿用。穩定 id 須來自模型本身不變的資訊，本專案採用節點名稱加層級結構（同層同名再補序號）。

## 2026-10-26 — 材質面板整合與 state 推導

**學習筆記**
- 問：當某個 state 只是「另一份資料變動後需要跟著修正」時（例如材質清單更新後，原本選取的材質已不存在，則改選第一筆），為何不宜用 `useEffect` 監看該份資料、再以 `setState` 修正？

  答：這種寫法會觸發 `react-hooks/set-state-in-effect`（ESLint 規則：禁止在 effect 內同步呼叫 setState），本專案採用 `eslint-plugin-react-hooks` 的 recommended 設定，該規則為 error，執行 `npm run lint` 會直接失敗。同一條規則先前已於 2026-10-07 段記錄，該次情境為 effect 開頭重複設定初始值，本次則是兩份 state 之間的同步問題。

  規則的理由是：effect 於畫面渲染完成後才執行，若在其中又同步設定 state，React 必須再排一次渲染，形成「渲染 → effect → 渲染」的連鎖，多出一次不必要的重繪，資料流也被拆成兩段而較難追蹤。

  可行做法是在渲染期間直接推導：不把「修正後的選取值」另存為第二份 state，而是每次渲染都由現有資料算出有效值；原 state 僅保留使用者最後點選的 id，失效時不參與判斷。

  兩者差別在於真相的份數。以 effect 同步的版本把「選取值是否有效」存成第二份真相，須持續維護同步；純推導的版本只有一份真相，沒有同步問題，也不會多出一次不必要的渲染。

  採用推導時有一個必要條件：所有使用該值的地方都須改用推導出的有效 id，否則失效期間的寫入（例如改色）會比對不到任何項目，形成靜默失效——沒有錯誤訊息，畫面就是不變。

  若確實需要把修正後的值寫回 state，合適的位置是觸發變更的事件回呼（event handler，例如「收到新的材質清單」時），而非 effect。

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
