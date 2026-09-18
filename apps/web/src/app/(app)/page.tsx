'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Clock, Heart, ListOrdered, Play, Shuffle, Sparkles, TrendingUp } from 'lucide-react';
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
  const { play, shuffle, toggleShuffle } = usePlayer();
  const [query, setQuery] = useState('');
  const { data: likes, isLoading } = useQuery({
    queryKey: ['likes'],
    queryFn: () => api.get<LikeEntry[]>('/me/likes'),
  });

  const allTracks = likes?.map((l) => l.track) ?? [];
  const tracks = filterTracks(allTracks, query);
  const likedIds = new Set(allTracks.map((t) => t.id));

  // Respeita o modo de ordem já ativo (igual ao Spotify: o botão "Tocar"
  // toca em sequência ou aleatório dependendo do que já está selecionado).
  function handlePlay() {
    if (tracks.length === 0) return;
    if (shuffle) {
      const start = tracks[Math.floor(Math.random() * tracks.length)];
      play(start, tracks, true);
    } else {
      play(tracks[0], tracks, false);
    }
  }

  return (
    <div className="px-8 py-6">
      <h1 className="mb-6 hidden text-3xl font-bold text-white sm:block">
        Olá, {user?.displayName}
      </h1>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:max-w-2xl sm:grid-cols-4">
        <Link
          href="/library"
          className="flex min-w-0 items-center gap-2.5 rounded bg-elevated p-2.5 hover:bg-elevatedhover"
        >
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded bg-gradient-to-br from-accent to-emerald-700">
            <Heart size={16} />
          </span>
          <span className="min-w-0 text-sm font-semibold leading-tight text-white">Músicas Curtidas</span>
        </Link>
        <Link
          href="/top"
          className="flex min-w-0 items-center gap-2.5 rounded bg-elevated p-2.5 hover:bg-elevatedhover"
        >
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded bg-gradient-to-br from-orange-500 to-red-600">
            <TrendingUp size={16} />
          </span>
          <span className="min-w-0 text-sm font-semibold leading-tight text-white">Mais Tocadas</span>
        </Link>
        <Link
          href="/recent"
          className="flex min-w-0 items-center gap-2.5 rounded bg-elevated p-2.5 hover:bg-elevatedhover"
        >
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded bg-gradient-to-br from-indigo-500 to-indigo-800">
            <Clock size={16} />
          </span>
          <span className="min-w-0 text-sm font-semibold leading-tight text-white">Recentes</span>
        </Link>
        <Link
          href="/recently-added"
          className="flex min-w-0 items-center gap-2.5 rounded bg-elevated p-2.5 hover:bg-elevatedhover"
        >
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded bg-gradient-to-br from-sky-500 to-cyan-700">
            <Sparkles size={16} />
          </span>
          <span className="min-w-0 text-sm font-semibold leading-tight text-white">Recém-adicionadas</span>
        </Link>
      </div>

      <div className="mb-3 flex items-center gap-4">
        <h2 className="text-xl font-bold text-white">Músicas Curtidas</h2>
        {!isLoading && allTracks.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handlePlay}
              className="flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-white hover:bg-accenthover"
              title="Tocar"
            >
              <Play size={14} /> Tocar
            </button>
            <button
              onClick={toggleShuffle}
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold text-white ${
                shuffle ? 'bg-accent hover:bg-accenthover' : 'bg-elevated hover:bg-elevatedhover'
              }`}
              title="Define a ordem da próxima faixa"
            >
              {shuffle ? <ListOrdered size={14} /> : <Shuffle size={14} />}
              {shuffle ? 'Em Ordem' : 'Aleatório'}
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
