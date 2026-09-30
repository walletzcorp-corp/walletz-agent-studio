const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3011';

async function apiFetch<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Erro desconhecido' }));
    throw new Error(error.message ?? `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string, token?: string) => apiFetch<T>(path, { method: 'GET' }, token),
  post: <T>(path: string, body: unknown, token?: string) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }, token),
  put: <T>(path: string, body: unknown, token?: string) =>
    apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) }, token),
  patch: <T>(path: string, body: unknown, token?: string) =>
    apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }, token),
};
