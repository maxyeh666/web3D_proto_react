let adminToken: string | null = null;
// 訂閱者：token 被清除時通知（例如收到 401），讓 UI 同步回未登入狀態
const listeners = new Set<() => void>();

export function setAdminToken (token: string) {
    adminToken = token;
};

export function getAdminToken () {
    return adminToken;
};

export function clearAdminToken () {
    adminToken = null;
    listeners.forEach((listener) => listener());
};

export function subscribeAdminToken (listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};
