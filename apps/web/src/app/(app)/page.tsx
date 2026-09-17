'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Clock, Heart, Play, Shuffle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { usePlayer } from '@/context/PlayerContext';
import TrackList from '@/components/TrackList';
import TrackFilterInput from '@/components/TrackFilterInput';
import SkeletonRows from '@/components/SkeletonRows';
import { filterTracks } from '@/lib/filterTracks';
import type { Track } from '@/lib/types';

type LikeEntry = { track: Track; likedAt: string };

export default function HomePage() {
  const { user } = useAuth();
  const { play } = usePlayer();
  const [query, setQuery] = useState('');
  const { data: likes, isLoading } = useQuery({
    queryKey: ['likes'],
    queryFn: () => api.get<LikeEntry[]>('/me/likes'),
  });

  const allTracks = likes?.map((l) => l.track) ?? [];
  const tracks = filterTracks(allTracks, query);
  const likedIds = new Set(allTracks.map((t) => t.id));

  function playSequential() {
    if (tracks.length === 0) return;
    play(tracks[0], tracks, false);
  }

  function playShuffled() {
    if (tracks.length === 0) return;
    const start = tracks[Math.floor(Math.random() * tracks.length)];
    play(start, tracks, true);
  }

  return (
    <div className="px-8 py-6">
      <h1 className="mb-6 hidden text-3xl font-bold text-white sm:block">
        Olá, {user?.displayName}
      </h1>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:max-w-md">
        <Link
          href="/library"
          className="flex items-center gap-3 rounded bg-elevated p-3 hover:bg-elevatedhover"
        >
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded bg-gradient-to-br from-accent to-emerald-700">
            <Heart size={20} />
          </span>
          <span className="font-semibold text-white">Músicas Curtidas</span>
        </Link>
        <Link
          href="/recent"
          className="flex items-center gap-3 rounded bg-elevated p-3 hover:bg-elevatedhover"
        >
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded bg-gradient-to-br from-indigo-500 to-indigo-800">
            <Clock size={20} />
          </span>
          <span className="font-semibold text-white">Recentes</span>
        </Link>
      </div>

      <div className="mb-3 flex items-center gap-4">
        <h2 className="text-xl font-bold text-white">Músicas Curtidas</h2>
        {!isLoading && allTracks.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={playSequential}
              className="flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-white hover:bg-accenthover"
              title="Tocar em ordem"
            >
              <Play size={14} /> Tocar
            </button>
            <button
              onClick={playShuffled}
              className="flex items-center gap-2 rounded-full bg-elevated px-4 py-1.5 text-sm font-semibold text-white hover:bg-elevatedhover"
              title="Tocar em ordem aleatória"
            >
              <Shuffle size={14} /> Aleatório
            </button>
          </div>
        )}
      </div>
      {!isLoading && allTracks.length > 0 && <TrackFilterInput value={query} onChange={setQuery} />}
      {isLoading && <SkeletonRows rows={6} />}
      {!isLoading && allTracks.length === 0 && (
        <p className="text-muted">
          Você ainda não curtiu nenhuma faixa. Vá em <b>Buscar</b>, encontre uma música da sua
          biblioteca e clique no coração.
        </p>
      )}
      {!isLoading && allTracks.length > 0 && tracks.length === 0 && (
        <p className="text-muted">Nenhuma faixa encontrada pra &quot;{query}&quot;.</p>
      )}
      {!isLoading && tracks.length > 0 && <TrackList tracks={tracks} likedIds={likedIds} />}
    </div>
  );
}
