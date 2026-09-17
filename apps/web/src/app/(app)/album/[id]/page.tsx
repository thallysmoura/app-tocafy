'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import BackButton from '@/components/BackButton';
import TrackList from '@/components/TrackList';
import TrackListSkeleton from '@/components/TrackListSkeleton';
import type { Artist, Track } from '@/lib/types';

type AlbumDetail = { id: string; title: string; artist: Artist; tracks: Track[] };

export default function AlbumPage({ params }: { params: { id: string } }) {
  const { data: album, isLoading } = useQuery({
    queryKey: ['album', params.id],
    queryFn: () => api.get<AlbumDetail>(`/albums/${params.id}`),
  });

  if (isLoading) return <TrackListSkeleton />;
  if (!album) return <div className="px-8 py-6 text-muted">Álbum não encontrado.</div>;

  return (
    <div className="px-8 py-6">
      <div className="mb-1 flex items-center gap-3">
        <BackButton />
        <h1 className="text-3xl font-bold text-white">{album.title}</h1>
      </div>
      <Link href={`/artist/${album.artist.id}`} className="mb-6 inline-block text-muted hover:underline">
        {album.artist.name}
      </Link>
      <TrackList
        tracks={album.tracks.map((t) => ({
          ...t,
          album: { id: album.id, title: album.title, artistId: album.artist.id, coverPath: null },
          artist: album.artist,
        }))}
      />
    </div>
  );
}
