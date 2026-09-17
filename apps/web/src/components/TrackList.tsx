import type { Track } from '@/lib/types';
import TrackRow from './TrackRow';

export default function TrackList({
  tracks,
  likedIds,
}: {
  tracks: Track[];
  likedIds?: Set<string>;
}) {
  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-[24px_1fr_32px_56px] gap-2 border-b border-elevatedhover px-2 pb-2 text-xs uppercase text-muted sm:grid-cols-[24px_1fr_1fr_40px_80px] sm:gap-4 sm:px-4">
        <span>#</span>
        <span>Título</span>
        <span className="hidden sm:block">Álbum</span>
        <span />
        <span className="text-right">Duração</span>
      </div>
      {tracks.map((track, index) => (
        <TrackRow
          key={track.id}
          track={track}
          index={index}
          queue={tracks}
          liked={likedIds?.has(track.id)}
        />
      ))}
    </div>
  );
}
