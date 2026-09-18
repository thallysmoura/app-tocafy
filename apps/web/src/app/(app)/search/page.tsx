'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';
import TrackList from '@/components/TrackList';
import SearchBox from '@/components/SearchBox';
import SkeletonRows from '@/components/SkeletonRows';
import BackButton from '@/components/BackButton';
import type { Track } from '@/lib/types';

type LikeEntry = { track: Track };

export default function SearchPage() {
  const searchParams = useSearchParams();
  // Pré-preenche e já busca quando a página é aberta com ?q=... (ex.: link
  // "Buscar no Tocafy" da identificação de música) — sem isso, o parâmetro
  // era ignorado e o usuário tinha que digitar o nome de novo.
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  // Já abre o campo se veio um ?q= (ex.: link "Buscar no Tocafy" da
  // identificação de música) — senão fica escondido até clicar na lupa.
  const [showSearch, setShowSearch] = useState(() => Boolean(searchParams.get('q')));

  // Só a biblioteca local (o que você baixou/subiu) — sem catálogo externo.
  const { data: localTracks, isLoading } = useQuery({
    queryKey: ['search', query],
    queryFn: () => api.get<Track[]>(`/tracks/search?q=${encodeURIComponent(query)}`),
  });

  const { data: likes } = useQuery({
    queryKey: ['likes'],
    queryFn: () => api.get<LikeEntry[]>('/me/likes'),
  });
  const likedIds = new Set((likes ?? []).map((l) => l.track.id));

  const tracks: Track[] = localTracks ?? [];

  return (
    <div className="px-8 py-6">
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BackButton />
            <h1 className="text-3xl font-bold text-white">Buscar</h1>
          </div>
          <button
            onClick={() => setShowSearch((v) => !v)}
            aria-label={showSearch ? 'Fechar busca' : 'Abrir busca'}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-elevatedhover"
          >
            <Search size={22} />
          </button>
        </div>
        {showSearch && (
          <div className="mt-4">
            <SearchBox value={query} onChange={setQuery} autoFocus />
          </div>
        )}
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
