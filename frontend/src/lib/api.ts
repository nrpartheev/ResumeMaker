// Lightweight Flask API client. Configure VITE_API_BASE_URL in .env, defaults to localhost:5000.
export const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:5000";

const TOKEN_KEY = "rl_token";

export const auth = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },
  set(token: string) {
    window.localStorage.setItem(TOKEN_KEY, token);
  },
  clear() {
    window.localStorage.removeItem(TOKEN_KEY);
  },
};

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export async function api<T = unknown>(
  path: string,
  init: RequestInit & { json?: unknown } = {}
): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  const token = auth.get();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let body = init.body;
  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers, body });
  const ct = res.headers.get("content-type") ?? "";
  const payload = ct.includes("application/json")
    ? await res.json().catch(() => null)
    : await res.text().catch(() => null);

  if (!res.ok) {
    const msg =
      payload && typeof payload === "object" && "error" in payload && typeof (payload as Record<string, unknown>).error === "string"
        ? String((payload as Record<string, unknown>).error)
        : `Request failed (${res.status})`;
    throw new ApiError(res.status, msg, payload);
  }
  return payload as T;
}

export const googleLoginUrl = () => `${API_BASE}/auth/google`;

export const templateImageUrl = (name: string) => `${API_BASE}/api/images/${name}`;

export type Template = { name: string; label?: string; description?: string };
export type HistoryItem = { id: string; title?: string; updated_at?: string; template?: string };
export type Profile = {
  [key: string]: unknown;
  name?: string;
  username?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  skills?: unknown;
  experience?: Array<Record<string, unknown>>;
  projects?: Array<Record<string, unknown>>;
  education?: Array<Record<string, unknown>>;
  links?: Record<string, unknown>;
};
