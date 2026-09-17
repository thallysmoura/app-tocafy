'use client';

import Link from 'next/link';
import { Heart, Play } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { formatDuration, trackCoverUrl, api } from '@/lib/api';
import { usePlayer } from '@/context/PlayerContext';
import CoverArt from './CoverArt';
import type { Track } from '@/lib/types';

export default function TrackRow({
  track,
  index,
  queue,
  liked,
}: {
  track: Track;
  index: number;
  queue: Track[];
  liked?: boolean;
}) {
  const { play, current } = usePlayer();
  const queryClient = useQueryClient();
  const isActive = current?.id === track.id;
  const cover = trackCoverUrl(track);

  async function toggleLike(e: React.MouseEvent) {
    e.stopPropagation();
    if (liked) {
      await api.delete(`/me/likes/${track.id}`);
    } else {
      await api.post(`/me/likes/${track.id}`);
    }
    queryClient.invalidateQueries({ queryKey: ['likes'] });
  }

  return (
    <div
      onClick={() => play(track, queue)}
      className={`group grid cursor-pointer grid-cols-[24px_1fr_32px_56px] items-center gap-2 rounded px-2 py-2 hover:bg-elevatedhover sm:grid-cols-[24px_1fr_1fr_40px_80px] sm:gap-4 sm:px-4 ${
        isActive ? 'text-accent' : 'text-white'
      }`}
    >
      <span className="text-sm text-muted sm:group-hover:hidden">{index + 1}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          play(track, queue);
        }}
        className="hidden text-sm sm:group-hover:block"
      >
        <Play size={14} />
      </button>
      <div className="flex items-center gap-3 overflow-hidden">
        <CoverArt src={cover} size={40} />
        <div className="overflow-hidden">
          <div className="truncate font-medium">{track.title}</div>
          {track.artist && track.source !== 'audius' ? (
            <Link
              href={`/artist/${track.artist.id}`}
              onClick={(e) => e.stopPropagation()}
              className="truncate text-sm text-muted hover:underline"
            >
              {track.artist.name}
            </Link>
          ) : (
            <div className="truncate text-sm text-muted">
              {track.artist?.name ?? 'Artista desconhecido'}
            </div>
          )}
        </div>
      </div>
      {track.album ? (
        <Link
          href={`/album/${track.album.id}`}
          onClick={(e) => e.stopPropagation()}
          className="hidden truncate text-sm text-muted hover:underline sm:block"
        >
          {track.album.title}
        </Link>
      ) : (
        <span className="hidden truncate text-sm text-muted sm:block">—</span>
      )}
      {track.source === 'audius' ? (
        <span />
      ) : (
        <button onClick={toggleLike} className={liked ? 'text-accent' : 'text-muted hover:text-white'}>
          <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
        </button>
      )}
      <div className="text-right text-sm text-muted">{formatDuration(track.durationSec)}</div>
    </div>
  );
}
