let adminToken: string | null = null;

export function setAdminToken (token: string) {
    adminToken = token;
};

export function getAdminToken () {
    return adminToken;
};

export function clearAdminToken () {
    adminToken = null;
};