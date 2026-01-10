export const AUTH_TOKEN_KEY = 'laz_auth_token';
export const AUTH_LAZ_ID_KEY = 'laz_auth_id'; // Optional, for cache
export const AUTH_LAZ_NAME_KEY = 'laz_auth_name'; // Optional, for display

export const getAuthToken = () => localStorage.getItem(AUTH_TOKEN_KEY);
export const setAuthToken = (token: string) => localStorage.setItem(AUTH_TOKEN_KEY, token);
export const clearAuthToken = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_LAZ_ID_KEY);
    localStorage.removeItem(AUTH_LAZ_NAME_KEY);
};

export const getAuthHeaders = () => {
    const token = getAuthToken();
    return token ? { 'X-LAZ-Token': token } : {};
};

// Helper to make authenticated requests easier
export async function authFetch(url: string, options: RequestInit = {}) {
    const headers = {
        ...options.headers,
        ...getAuthHeaders(),
    };
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
        // Handle token expiry if needed, or let app handle it
        clearAuthToken();
        window.location.reload(); // Simple force login
    }
    return response;
}
