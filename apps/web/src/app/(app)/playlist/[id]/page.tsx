'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Play, Plus, Trash2 } from 'lucide-react';
import { api, formatDuration, trackCoverUrl } from '@/lib/api';
import { usePlayer } from '@/context/PlayerContext';
import BackButton from '@/components/BackButton';
import CoverArt from '@/components/CoverArt';
import TrackListSkeleton from '@/components/TrackListSkeleton';
import type { PlaylistDetail, Track } from '@/lib/types';

const MAX_SUGGESTIONS = 10;

export default function PlaylistPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const queryClient = useQueryClient();
  const { play } = usePlayer();

  const { data: playlist, isLoading } = useQuery({
    queryKey: ['playlist', id],
    queryFn: () => api.get<PlaylistDetail>(`/playlists/${id}`),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['playlist', id] });

  const removeTrack = useMutation({
    mutationFn: (trackId: string) => api.delete(`/playlists/${id}/tracks/${trackId}`),
    onSuccess: invalidate,
  });

  const reorder = useMutation({
    mutationFn: ({ trackId, newIndex }: { trackId: string; newIndex: number }) =>
      api.patch(`/playlists/${id}/tracks/${trackId}/position`, { newIndex }),
    onSuccess: invalidate,
  });

  const addTrack = useMutation({
    mutationFn: (trackId: string) => api.post(`/playlists/${id}/tracks/${trackId}`),
    onSuccess: invalidate,
  });

  const { data: allTracks } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => api.get<Track[]>('/tracks'),
  });

  const tracks = playlist?.tracks ?? [];
  const trackIds = useMemo(() => new Set(tracks.map((t) => t.id)), [tracks]);
  const suggestions = useMemo(
    () => (allTracks ?? []).filter((t) => !trackIds.has(t.id)).slice(0, MAX_SUGGESTIONS),
    [allTracks, trackIds],
  );

  if (isLoading) return <TrackListSkeleton />;
  if (!playlist) return <div className="px-8 py-6 text-muted">Playlist não encontrada.</div>;

  return (
    <div className="px-8 py-6">
      <div className="mb-1 flex items-center gap-3">
        <BackButton />
        <h1 className="text-3xl font-bold text-white">{playlist.name}</h1>
      </div>
      <p className="mb-6 text-sm text-muted">{tracks.length} faixa(s)</p>

      <div className="flex flex-col">
        {tracks.map((track, index) => (
          <div
            key={track.id}
            className="grid grid-cols-[1fr_auto] items-center gap-4 rounded px-4 py-2 hover:bg-elevatedhover"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <CoverArt src={trackCoverUrl(track)} size={40} />
              <div className="overflow-hidden">
                <div className="truncate font-medium text-white">{track.title}</div>
                <div className="truncate text-sm text-muted">
                  {track.artist?.name ?? 'Artista desconhecido'} ·{' '}
                  {formatDuration(track.durationSec)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-muted">
              <button onClick={() => play(track, tracks)} className="hover:text-white">
                <Play size={16} />
              </button>
              <button
                onClick={() => reorder.mutate({ trackId: track.id, newIndex: index - 1 })}
                disabled={index === 0}
                className="hover:text-white disabled:opacity-30"
              >
                <ArrowUp size={16} />
              </button>
              <button
                onClick={() => reorder.mutate({ trackId: track.id, newIndex: index + 1 })}
                disabled={index === tracks.length - 1}
                className="hover:text-white disabled:opacity-30"
              >
                <ArrowDown size={16} />
              </button>
              <button
                onClick={() => removeTrack.mutate(track.id)}
                className="hover:text-red-400"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {tracks.length === 0 && (
          <p className="text-muted">
            Playlist vazia. Adicione faixas a partir da busca, da biblioteca ou das sugestões abaixo.
          </p>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-xl font-bold text-white">Sugestões pra adicionar</h2>
          <div className="flex flex-col">
            {suggestions.map((track) => (
              <div
                key={track.id}
                className="grid grid-cols-[1fr_auto] items-center gap-4 rounded px-4 py-2 hover:bg-elevatedhover"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <CoverArt src={trackCoverUrl(track)} size={40} />
                  <div className="overflow-hidden">
                    <div className="truncate font-medium text-white">{track.title}</div>
                    <div className="truncate text-sm text-muted">
                      {track.artist?.name ?? 'Artista desconhecido'} ·{' '}
                      {formatDuration(track.durationSec)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => addTrack.mutate(track.id)}
                  disabled={addTrack.isPending}
                  className="flex items-center gap-1 rounded-full bg-elevated px-3 py-1 text-sm font-semibold text-white hover:bg-elevatedhover disabled:opacity-50"
                >
                  <Plus size={14} /> Adicionar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
