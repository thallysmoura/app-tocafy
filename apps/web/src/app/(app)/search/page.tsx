'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, audiusTrackToTrack } from '@/lib/api';
import TrackList from '@/components/TrackList';
import SearchBox from '@/components/SearchBox';
import SkeletonRows from '@/components/SkeletonRows';
import BackButton from '@/components/BackButton';
import type { AudiusTrack, Track } from '@/lib/types';

type LikeEntry = { track: Track };

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const hasQuery = query.trim().length > 0;

  // Biblioteca local + provedores externos (hoje: Audius) — mesclados numa lista
  // só, sem expor de onde cada faixa veio. Dá pra somar mais provedores aqui
  // depois sem mudar a experiência do usuário.
  const { data: localTracks, isLoading: loadingLocal } = useQuery({
    queryKey: ['search', query],
    queryFn: () => api.get<Track[]>(`/tracks/search?q=${encodeURIComponent(query)}`),
  });

  const { data: audiusResults, isLoading: loadingAudius } = useQuery({
    queryKey: ['audius-search', query],
    queryFn: () => api.get<AudiusTrack[]>(`/audius/search?q=${encodeURIComponent(query)}`),
    enabled: hasQuery,
  });

  const { data: likes } = useQuery({
    queryKey: ['likes'],
    queryFn: () => api.get<LikeEntry[]>('/me/likes'),
  });
  const likedIds = new Set((likes ?? []).map((l) => l.track.id));

  const isLoading = loadingLocal || (hasQuery && loadingAudius);
  const tracks: Track[] = [
    ...(localTracks ?? []),
    ...(hasQuery ? (audiusResults ?? []).map(audiusTrackToTrack) : []),
  ];

  return (
    <div className="px-8 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-3xl font-bold text-white">Buscar</h1>
        </div>
        <SearchBox value={query} onChange={setQuery} />
      </div>

      {isLoading && <SkeletonRows rows={6} />}
      {!isLoading && tracks.length === 0 && (
        <p className="text-muted">
          {query ? 'Nenhum resultado.' : 'Digite para buscar por título, artista ou álbum.'}
        </p>
      )}
      {!isLoading && tracks.length > 0 && <TrackList tracks={tracks} likedIds={likedIds} />}
    </div>
  );
}
