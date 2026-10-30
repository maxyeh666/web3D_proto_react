import { useState, type SubmitEvent as ReactSubmitEvent } from 'react';
import { request } from './api/client';
import { setAdminToken, clearAdminToken } from './api/adminToken';
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
	const [showAdminPanel, setShowAdminPanel] = useState(false);
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
		} catch (error) {
			setLoginError( error instanceof Error ? error.message : String(error))
		} finally {
			setLoggingIn(false)
		}
	}

	function handleLogout () {
		clearAdminToken();
		setIsAdmin(false);
		setLoginError(null);
	}

	return (
		<div className="app-shell">
			{isRemoteDataSource && (
				<div className={`admin-area ${showAdminPanel ? "admin-area--open" : ""}`}>
					<button
						type="button"
						className="admin-toggle"
						aria-expanded={showAdminPanel}
						onClick={() => setShowAdminPanel((open) => !open)}
					>
						{showAdminPanel ? "Close" : isAdmin ? "Admin" : "Login"}
					</button>
					{isAdmin ? (
							<div className="admin-panel">
								<span className="admin-label">Admin MODE</span>
								<button type="button" onClick={handleLogout}>Logout</button>
							</div>
						) : (
							<form className="admin-panel" onSubmit={handleLogin}>
								<input
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
									<span role="alert">{ loginError }</span>
								)}
							</form>
					)}
				</div>
			)}
			<Viewer canSave={!isRemoteDataSource || isAdmin}/>
		</div>
	);
}

export default App;

