import { authFetch } from "./auth-client";

type ApiProblem = { detail?: string };

export async function fetchAuthedJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await authFetch(path, init as any);
  if (!res.ok) {
    const msg = ((await res.json().catch(() => null)) as ApiProblem | null)?.detail ?? `Error ${res.status}`;
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

