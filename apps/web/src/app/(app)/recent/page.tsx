'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import BackButton from '@/components/BackButton';
import TrackList from '@/components/TrackList';
import SkeletonRows from '@/components/SkeletonRows';
import type { Track } from '@/lib/types';

type HistoryEntry = { id: string; track: Track; playedAt: string };
type LikeEntry = { track: Track };

export default function RecentPage() {
  const { data: history, isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: () => api.get<HistoryEntry[]>('/me/history'),
  });
  const { data: likes } = useQuery({
    queryKey: ['likes'],
    queryFn: () => api.get<LikeEntry[]>('/me/likes'),
  });
  const likedIds = new Set((likes ?? []).map((l) => l.track.id));

  const seen = new Set<string>();
  const tracks: Track[] = [];
  for (const entry of history ?? []) {
    if (seen.has(entry.track.id)) continue;
    seen.add(entry.track.id);
    tracks.push(entry.track);
  }

  return (
    <div className="px-8 py-6">
      <div className="mb-6 flex items-center gap-3">
        <BackButton />
        <h1 className="text-3xl font-bold text-white">Recentes</h1>
      </div>

      {isLoading && <SkeletonRows rows={6} />}
      {!isLoading && tracks.length === 0 && (
        <p className="text-muted">Nenhuma faixa tocada ainda.</p>
      )}
      {!isLoading && tracks.length > 0 && <TrackList tracks={tracks} likedIds={likedIds} />}
    </div>
  );
}
