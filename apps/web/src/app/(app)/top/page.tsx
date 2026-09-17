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

type TopEntry = { track: Track; playCount: number };
type LikeEntry = { track: Track };

export default function TopPlayedPage() {
  const [query, setQuery] = useState('');
  const { data: top, isLoading } = useQuery({
    queryKey: ['top-played'],
    queryFn: () => api.get<TopEntry[]>('/me/top'),
  });
  const { data: likes } = useQuery({
    queryKey: ['likes'],
    queryFn: () => api.get<LikeEntry[]>('/me/likes'),
  });
  const likedIds = new Set((likes ?? []).map((l) => l.track.id));
  const allTracks = (top ?? []).map((entry) => entry.track);
  const tracks = filterTracks(allTracks, query);

  return (
    <div className="px-8 py-6">
      <div className="mb-6 flex items-center gap-3">
        <BackButton />
        <h1 className="text-3xl font-bold text-white">Mais tocadas</h1>
      </div>

      {!isLoading && allTracks.length > 0 && <TrackFilterInput value={query} onChange={setQuery} />}
      {isLoading && <SkeletonRows rows={6} />}
      {!isLoading && allTracks.length === 0 && (
        <p className="text-muted">Nenhuma faixa tocada ainda — o ranking aparece conforme você ouve.</p>
      )}
      {!isLoading && allTracks.length > 0 && tracks.length === 0 && (
        <p className="text-muted">Nenhuma faixa encontrada pra &quot;{query}&quot;.</p>
      )}
      {!isLoading && tracks.length > 0 && <TrackList tracks={tracks} likedIds={likedIds} />}
    </div>
  );
}
