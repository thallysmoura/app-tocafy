'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import BackButton from '@/components/BackButton';
import CoverArt from '@/components/CoverArt';
import Spinner from '@/components/Spinner';
import { trackCoverUrl } from '@/lib/api';
import type { Playlist, Track } from '@/lib/types';

type LikeEntry = { track: Track };

export default function NewPlaylistPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [onlyLiked, setOnlyLiked] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: allTracks, isLoading: loadingAll } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => api.get<Track[]>('/tracks'),
    enabled: !onlyLiked,
  });
  const { data: likes, isLoading: loadingLikes } = useQuery({
    queryKey: ['likes'],
    queryFn: () => api.get<LikeEntry[]>('/me/likes'),
    enabled: onlyLiked,
  });

  const tracks = useMemo(
    () => (onlyLiked ? (likes ?? []).map((l) => l.track) : allTracks ?? []),
    [onlyLiked, likes, allTracks],
  );
  const isLoading = onlyLiked ? loadingLikes : loadingAll;

  function toggleTrack(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreate() {
    if (!name.trim() || selected.size === 0) return;
    setCreating(true);
    setError(null);
    try {
      const playlist = await api.post<Playlist>('/playlists', { name: name.trim() });
      for (const trackId of selected) {
        await api.post(`/playlists/${playlist.id}/tracks/${trackId}`);
      }
      router.push(`/playlist/${playlist.id}`);
    } catch {
      setError('Falha ao criar playlist.');
      setCreating(false);
    }
  }

  return (
    <div className="px-8 py-6">
      <div className="mb-6 flex items-center gap-3">
        <BackButton />
        <h1 className="text-3xl font-bold text-white">Nova playlist</h1>
      </div>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome da playlist"
        className="mb-4 w-full max-w-sm rounded bg-elevated px-4 py-3 text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
      />

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setOnlyLiked(false)}
          className={`rounded-full px-4 py-1 text-sm font-semibold ${!onlyLiked ? 'bg-accent text-white' : 'bg-elevated text-muted'}`}
        >
          Toda a biblioteca
        </button>
        <button
          onClick={() => setOnlyLiked(true)}
          className={`rounded-full px-4 py-1 text-sm font-semibold ${onlyLiked ? 'bg-accent text-white' : 'bg-elevated text-muted'}`}
        >
          Só curtidas
        </button>
      </div>

      <p className="mb-3 text-sm text-muted">{selected.size} faixa(s) selecionada(s)</p>

      {isLoading && (
        <div className="flex justify-center py-4">
          <Spinner size={24} />
        </div>
      )}
      {!isLoading && tracks.length === 0 && <p className="text-muted">Nenhuma faixa disponível.</p>}

      <div className="mb-6 flex flex-col gap-1">
        {tracks.map((track) => (
          <label
            key={track.id}
            className="flex cursor-pointer items-center gap-3 rounded px-2 py-2"
          >
            <input
              type="checkbox"
              checked={selected.has(track.id)}
              onChange={() => toggleTrack(track.id)}
              className="h-4 w-4 accent-accent"
            />
            <CoverArt src={trackCoverUrl(track)} size={36} seed={track.id} />
            <div className="overflow-hidden">
              <div className="truncate text-sm font-medium text-white">{track.title}</div>
              <div className="truncate text-xs text-muted">
                {track.artist?.name ?? 'Artista desconhecido'}
              </div>
            </div>
          </label>
        ))}
      </div>

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      <button
        onClick={handleCreate}
        disabled={creating || !name.trim() || selected.size === 0}
        className="rounded-full bg-accent px-6 py-3 font-semibold text-white hover:bg-accenthover disabled:opacity-50"
      >
        {creating ? 'Criando...' : 'Criar playlist'}
      </button>
    </div>
  );
}
