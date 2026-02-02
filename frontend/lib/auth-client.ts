function normalizeBaseUrl(raw: string) {
  const v = raw.trim();
  if (!v) return "";
  if (v.startsWith("/")) return v.replace(/\/$/, "");
  return v.replace(/\/$/, "");
}

const API_BASE = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL || "/api");

const ACCESS_TOKEN_KEY = "ft_access_token";
const USER_KEY = "ft_auth_user";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  permissions: string[];
};

export function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()!.split(";").shift() ?? null;
  return null;
}

export function getStoredAuth(): { accessToken: string | null; user: AuthUser | null } {
  if (typeof localStorage === "undefined") return { accessToken: null, user: null };
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const rawUser = localStorage.getItem(USER_KEY);
  let user: AuthUser | null = null;
  if (rawUser) {
    try {
      user = JSON.parse(rawUser);
    } catch {
      user = null;
    }
  }
  return { accessToken: token, user };
}

export function clearStoredAuth() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function login(email: string, password: string) {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
  } catch {
    const base = API_BASE || "(vacío)";
    throw new Error(`No se puede conectar con el servidor (API). Verifica que el backend esté encendido. API: ${base}`);
  }

  if (!res.ok) {
    const msg = (await res.json().catch(() => null))?.detail ?? "Credenciales inválidas";
    throw new Error(msg);
  }

  const data = (await res.json()) as { accessToken: string; user: AuthUser };
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }
  return data;
}

export async function logout() {
  clearStoredAuth();
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
  } catch {
    // ignore
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const csrf = getCookie("csrf_token");
  if (!csrf) return null;

  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "x-csrf-token": csrf },
    credentials: "include",
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { accessToken: string };
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
  }
  return data.accessToken;
}

export async function getValidAccessToken(): Promise<string | null> {
  const { accessToken } = getStoredAuth();
  if (accessToken) return accessToken;
  return await refreshAccessToken();
}

export async function authFetch(
  path: string,
  init: RequestInit & { retry?: boolean } = {}
): Promise<Response> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("No autenticado");

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
  } catch {
    const base = API_BASE || "(vacío)";
    throw new Error(`No se puede conectar con el servidor (API). API: ${base}`);
  }

  if (res.status === 401 && !init.retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return authFetch(path, { ...init, retry: true });
    }
  }

  return res;
}

export function getApiBaseUrl() {
  return API_BASE;
}
