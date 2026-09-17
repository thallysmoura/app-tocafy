'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Music2 } from 'lucide-react';
import BackButton from '@/components/BackButton';
import TrackList from '@/components/TrackList';
import TrackListSkeleton from '@/components/TrackListSkeleton';
import { trackCoverUrl } from '@/lib/api';
import type { Album, Track } from '@/lib/types';

type ArtistDetail = { id: string; name: string; albums: Album[]; tracks: Track[] };

export default function ArtistPage({ params }: { params: { id: string } }) {
  const { data: artist, isLoading } = useQuery({
    queryKey: ['artist', params.id],
    queryFn: () => api.get<ArtistDetail>(`/artists/${params.id}`),
  });

  if (isLoading) return <TrackListSkeleton />;
  if (!artist) return <div className="px-8 py-6 text-muted">Artista não encontrado.</div>;

  return (
    <div className="px-8 py-6">
      <div className="mb-6 flex items-center gap-3">
        <BackButton />
        <h1 className="text-3xl font-bold text-white">{artist.name}</h1>
      </div>

      {artist.albums.length > 0 && (
        <>
          <h2 className="mb-3 text-lg font-semibold text-white">Álbuns</h2>
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {artist.albums.map((album) => (
              <Link
                key={album.id}
                href={`/album/${album.id}`}
                className="rounded bg-elevated p-4 hover:bg-elevatedhover"
              >
                {trackCoverUrl(album) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={trackCoverUrl(album)!}
                    alt=""
                    className="mb-3 h-24 w-full rounded object-cover"
                  />
                ) : (
                  <div className="mb-3 flex h-24 w-full items-center justify-center rounded bg-elevatedhover text-muted">
                    <Music2 size={32} />
                  </div>
                )}
                <div className="truncate font-medium text-white">{album.title}</div>
              </Link>
            ))}
          </div>
        </>
      )}

      <h2 className="mb-3 text-lg font-semibold text-white">Todas as faixas</h2>
      <TrackList tracks={artist.tracks} />
    </div>
  );
}
