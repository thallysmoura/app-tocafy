import type { Track } from './types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  return res.ok;
}

// Renova o access token (cookie httpOnly) fora do wrapper `request()` — usado
// pelo <audio>, que faz a requisição de stream direto pelo browser e nunca
// passa pelo retry-on-401 automático do `request()` abaixo.
export function refreshSession(): Promise<boolean> {
  refreshPromise ??= doRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function request<T>(path: string, init?: RequestInit, retried = false): Promise<T> {
  // FormData (upload de arquivo) precisa que o browser defina o Content-Type
  // sozinho (com o boundary do multipart) — não fixamos application/json nesse caso.
  const isFormData = init?.body instanceof FormData;
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: isFormData ? init?.headers : { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });

  if (res.status === 401 && !retried && path !== '/auth/refresh' && path !== '/auth/login') {
    refreshPromise ??= doRefresh().finally(() => {
      refreshPromise = null;
    });
    const refreshed = await refreshPromise;
    if (refreshed) return request<T>(path, init, true);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, body.message ?? 'Erro na requisição');
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: 'POST', body: formData }),
};

export function trackStreamUrl(track: { id: string; source?: string }) {
  if (track.source === 'audius') return `${API_URL}/audius/tracks/${track.id}/stream`;
  return `${API_URL}/tracks/${track.id}/stream`;
}

export function trackCoverUrl(track: {
  id: string;
  coverPath: string | null;
  externalCoverUrl?: string | null;
}) {
  if (track.externalCoverUrl) return track.externalCoverUrl;
  return track.coverPath ? `${API_URL}/tracks/${track.id}/cover` : null;
}

/** Converte um resultado de busca do Audius pro mesmo formato de Track usado no resto do app. */
export function audiusTrackToTrack(t: {
  id: string;
  title: string;
  artistName: string;
  artworkUrl: string | null;
  durationSec: number | null;
}): Track {
  return {
    id: t.id,
    title: t.title,
    filePath: '',
    artistId: null,
    artist: { id: `audius:${t.id}`, name: t.artistName },
    albumId: null,
    album: null,
    durationSec: t.durationSec,
    coverPath: null,
    addedAt: new Date().toISOString(),
    source: 'audius',
    externalCoverUrl: t.artworkUrl,
  };
}

export function formatDuration(seconds: number | null | undefined) {
  if (!seconds) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
