'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import BackButton from '@/components/BackButton';
import TrackList from '@/components/TrackList';
import TrackFilterInput from '@/components/TrackFilterInput';
import SkeletonRows from '@/components/SkeletonRows';
import { filterTracks } from '@/lib/filterTracks';
import type { Track } from '@/lib/types';

type LikeEntry = { track: Track };

export default function RecentlyAddedPage() {
  const [query, setQuery] = useState('');
  // GET /tracks já vem ordenado por addedAt desc — as 30 primeiras são
  // exatamente as últimas que você baixou/subiu.
  const { data: allTracksData, isLoading } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => api.get<Track[]>('/tracks'),
  });
  const { data: likes } = useQuery({
    queryKey: ['likes'],
    queryFn: () => api.get<LikeEntry[]>('/me/likes'),
  });
  const likedIds = new Set((likes ?? []).map((l) => l.track.id));

  const allTracks = (allTracksData ?? []).slice(0, 30);
  const tracks = filterTracks(allTracks, query);

  return (
    <div className="px-8 py-6">
      <div className="mb-6 flex items-center gap-3">
        <BackButton />
        <h1 className="text-3xl font-bold text-white">Adicionadas recentemente</h1>
      </div>

      {!isLoading && allTracks.length > 0 && <TrackFilterInput value={query} onChange={setQuery} />}
      {isLoading && <SkeletonRows rows={6} />}
      {!isLoading && allTracks.length === 0 && (
        <p className="text-muted">Nenhuma faixa na biblioteca ainda.</p>
      )}
      {!isLoading && allTracks.length > 0 && tracks.length === 0 && (
        <p className="text-muted">Nenhuma faixa encontrada pra &quot;{query}&quot;.</p>
      )}
      {!isLoading && tracks.length > 0 && <TrackList tracks={tracks} likedIds={likedIds} />}
    </div>
  );
}
