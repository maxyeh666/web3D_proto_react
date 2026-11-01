import { useEffect, useRef, useState, type SubmitEvent as ReactSubmitEvent } from 'react';
import { request } from './api/client';
import { setAdminToken, clearAdminToken, subscribeAdminToken } from './api/adminToken';
import { isRemoteDataSource } from './data';
import Viewer from './components/Viewer';

import "./App.css"

type LoginResponse = {
	token: string;
}

function App() {
	const [isAdmin, setIsAdmin] = useState(false);
	const [password, setPassword] = useState("");
	const [loggingIn, setLoggingIn] = useState(false);
	const [loginError, setLoginError] = useState<string | null>(null);
	// 登入面板與外觀面板各自一個開關，互不影響
	const [isLoginOpen, setIsLoginOpen] = useState(false);
	const [isInspectorOpen, setIsInspectorOpen] = useState(false);
	const passwordRef = useRef<HTMLInputElement>(null);
	const loginErrorRef = useRef<HTMLSpanElement>(null);
	// 展開登入面板時把游標放進密碼框
	useEffect(() => {
		if (!isLoginOpen || isAdmin) return;
		passwordRef.current?.focus();
	}, [isLoginOpen, isAdmin]);
	// token 被清除（401 過期或登出）時把 UI 同步回未登入
	useEffect(() => subscribeAdminToken(() => {
		setIsAdmin(false);
		setPassword("");
	}), []);

	// 管理員登入先留在 App，之後有第二個地方要用再抽成 hook
	async function handleLogin(event: ReactSubmitEvent<HTMLFormElement>) {
		event.preventDefault();

		setLoggingIn(true);
		setLoginError(null);

		try {
			const result = await request<LoginResponse>("/auth/login", {
				method: "POST",
				body: JSON.stringify({ password })
			});

			setAdminToken(result.token);
			setIsAdmin(true);
			setPassword("")
			setIsLoginOpen(false);
		} catch (error) {
			setLoginError( error instanceof Error ? error.message : String(error))
		} finally {
			setLoggingIn(false)
		}
	}

	function toggleLoginPanel() {
		setIsLoginOpen((current) => !current);
	}

	function toggleInspectorPanel() {
		setIsInspectorOpen((current) => !current);
	}

	function handleLogout () {
		clearAdminToken();
		setIsAdmin(false);
		setLoginError(null);
		setIsLoginOpen(false);
		setPassword("")
	}

	return (
		<div className="app-shell">
			{/* 外觀面板開關：local 模式也有 cube 顏色可改，因此不依資料來源隱藏 */}
			<div className="mobile-panel-control">
				<button
					type="button"
					aria-expanded={isInspectorOpen}
					onClick={toggleInspectorPanel}
				>
					Appearance
				</button>
			</div>

			{isRemoteDataSource && (
				<div className={`admin-area ${isLoginOpen ? "admin-area--open" : ""}`}>
					<button
						type="button"
						className="admin-toggle"
						aria-expanded={isLoginOpen}
						onClick={toggleLoginPanel}
					>
						{isLoginOpen ? "Close" : isAdmin ? "Admin" : "Login"}
					</button>
					{isAdmin ? (
							<div className="admin-panel">
								<span className="admin-label">Admin MODE</span>
								<button type="button" onClick={handleLogout}>Logout</button>
							</div>
						) : (
							<form className="admin-panel" onSubmit={handleLogin}>
								<input
									ref={passwordRef}
									type="password"
									value={password}
									placeholder='Admin password'
									aria-label='Admin password'
									autoComplete='current-password'
									required
									onChange={(event) => { setPassword(event.target.value) }}
								/>
								<button type="submit" disabled={loggingIn}>
									{ loggingIn ? "Logging in..." : "Login" }
								</button>
	
								{ loginError && (
									<span ref={loginErrorRef} role="alert" tabIndex={-1}>{ loginError }</span>
								)}
							</form>
					)}
				</div>
			)}
			<Viewer
				canSave={!isRemoteDataSource || isAdmin}
				isInspectorOpen={isInspectorOpen}
			/>
		</div>
	);
}

export default App;

