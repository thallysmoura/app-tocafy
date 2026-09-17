import type { Track } from './types';

/** Filtra por título ou nome do artista, sem diferenciar maiúsculas/acentos. */
export function filterTracks(tracks: Track[], query: string): Track[] {
  const q = query.trim().toLowerCase();
  if (!q) return tracks;
  const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const nq = normalize(q);
  return tracks.filter(
    (t) => normalize(t.title).includes(nq) || (t.artist?.name && normalize(t.artist.name).includes(nq)),
  );
}
