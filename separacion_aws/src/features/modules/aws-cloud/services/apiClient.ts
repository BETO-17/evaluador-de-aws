import { fetchWithSubscriptionGuard } from './subscriptionInterceptor';

const API_BASE_URL_OVERRIDE = import.meta.env.VITE_API_BASE_URL || '';
const CANDIDATE_PORTS = ['8080', '8000'];
let cachedBaseUrl = API_BASE_URL_OVERRIDE;
let baseUrlDiscovery: Promise<string> | null = null;

export async function getApiBaseUrl(): Promise<string> {
  if (API_BASE_URL_OVERRIDE) return API_BASE_URL_OVERRIDE;
  if (cachedBaseUrl) return cachedBaseUrl;
  if (baseUrlDiscovery) return baseUrlDiscovery;

  baseUrlDiscovery = (async () => {
    for (const port of CANDIDATE_PORTS) {
      const url = `http://localhost:${port}/api/v1`;
      try {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 1200);
        const response = await fetch(`${url}/migration-evaluator/status`, { signal: controller.signal });
        window.clearTimeout(timer);
        if (response.ok) {
          cachedBaseUrl = url;
          return url;
        }
      } catch {
        // Probar el siguiente puerto configurado.
      }
    }

    cachedBaseUrl = 'http://localhost:8080/api/v1';
    return cachedBaseUrl;
  })();

  return baseUrlDiscovery;
}

function readStoredUser(): { email?: string } | null {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const baseUrl = await getApiBaseUrl();
  const token = localStorage.getItem('token');
  const user = readStoredUser();
  const headers = new Headers(init.headers);

  headers.set('Accept', 'application/json');
  if (init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (user?.email && !headers.has('X-User-Email')) {
    headers.set('X-User-Email', user.email);
  }

  const response = await fetchWithSubscriptionGuard(`${baseUrl}${path}`, { ...init, headers });
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const detail = typeof body?.detail === 'object' ? body.detail : body?.detail;
    const message = detail?.message || detail || body?.message || `Error de API (${response.status})`;
    const error = new Error(String(message)) as Error & { status?: number; payload?: unknown };
    error.status = response.status;
    error.payload = body;
    throw error;
  }

  return body as T;
}

export async function apiDownload(path: string): Promise<Blob> {
  const baseUrl = await getApiBaseUrl();
  const headers = new Headers();
  const token = localStorage.getItem('token');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${baseUrl}${path}`, { headers });
  if (!response.ok) throw new Error(`No se pudo descargar el archivo (${response.status}).`);
  return response.blob();
}
