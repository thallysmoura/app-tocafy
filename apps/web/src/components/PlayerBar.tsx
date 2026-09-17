'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
} from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { formatDuration, trackCoverUrl } from '@/lib/api';
import CoverArt from './CoverArt';

function ProgressBar({
  progress,
  duration,
  onSeek,
  className = '',
}: {
  progress: number;
  duration: number;
  onSeek: (time: number) => void;
  className?: string;
}) {
  const pct = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;
  return (
    <input
      type="range"
      min={0}
      max={duration || 0}
      value={progress}
      onChange={(e) => onSeek(Number(e.target.value))}
      style={{ background: `linear-gradient(to right, #1DB954 ${pct}%, #26262C ${pct}%)` }}
      className={`h-1 cursor-pointer appearance-none rounded-full ${className}`}
    />
  );
}

export default function PlayerBar() {
  const {
    current,
    isPlaying,
    toggle,
    progress,
    duration,
    seek,
    volume,
    setVolume,
    next,
    prev,
    shuffle,
    repeat,
    error,
    toggleShuffle,
    cycleRepeat,
  } = usePlayer();
  const [expanded, setExpanded] = useState(false);

  if (!current) {
    return (
      <footer className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] flex h-20 items-center justify-center border-t border-elevatedhover bg-elevated text-sm text-muted sm:bottom-0">
        Escolha uma música para tocar
      </footer>
    );
  }

  const cover = trackCoverUrl(current);
  const RepeatIcon = repeat === 'repeat-one' ? Repeat1 : Repeat;

  return (
    <footer className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] flex flex-col justify-end border-t border-elevatedhover bg-elevated sm:bottom-0 sm:h-20">
      {error && (
        <div className="absolute -top-8 left-0 right-0 bg-red-500/90 px-4 py-1 text-center text-xs text-white">
          {error}
        </div>
      )}

      {/* Painel expandido (só mobile) */}
      {expanded && (
        <div className="flex flex-col items-center gap-4 px-6 pb-2 pt-6 sm:hidden">
          <CoverArt src={cover} size={220} />
          <div className="text-center">
            <div className="text-lg font-semibold text-white">{current.title}</div>
            <div className="text-sm text-muted">
              {current.artist?.name ?? 'Artista desconhecido'}
            </div>
          </div>
          <div className="flex w-full items-center gap-2 text-xs text-muted">
            <span>{formatDuration(Math.floor(progress))}</span>
            <ProgressBar progress={progress} duration={duration} onSeek={seek} className="flex-1" />
            <span>{formatDuration(Math.floor(duration))}</span>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={toggleShuffle}
              className={shuffle ? 'text-accent' : 'text-muted hover:text-white'}
            >
              <Shuffle size={20} />
            </button>
            <button onClick={prev} className="text-white">
              <SkipBack size={26} />
            </button>
            <button
              onClick={toggle}
              className={`flex h-12 w-12 items-center justify-center rounded-full text-white ${
                isPlaying ? 'bg-red-500' : 'bg-accent'
              }`}
            >
              {isPlaying ? <Pause size={22} /> : <Play size={22} />}
            </button>
            <button onClick={next} className="text-white">
              <SkipForward size={26} />
            </button>
            <button
              onClick={cycleRepeat}
              className={repeat !== 'off' ? 'text-accent' : 'text-muted hover:text-white'}
            >
              <RepeatIcon size={20} />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 px-3 py-2 sm:h-20 sm:px-4 sm:py-0">
        <div className="flex flex-1 items-center gap-2 overflow-hidden sm:w-64 sm:flex-none sm:gap-3">
          <CoverArt src={cover} size={40} className="sm:!h-12 sm:!w-12" />
          <div className="overflow-hidden">
            <div className="truncate text-sm font-medium text-white">{current.title}</div>
            <div className="hidden truncate text-xs text-muted sm:block">
              {current.artist?.name ?? 'Artista desconhecido'}
            </div>
          </div>
        </div>

        {/* Mobile: expandir + anterior/play-pause/próxima à direita */}
        <div className="flex items-center gap-2 sm:hidden">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-muted hover:text-white"
            aria-label={expanded ? 'Diminuir' : 'Expandir'}
          >
            {expanded ? <ChevronDown size={22} /> : <ChevronUp size={22} />}
          </button>
          <button onClick={prev} className="text-muted hover:text-white" aria-label="Anterior">
            <SkipBack size={20} />
          </button>
          <button
            onClick={toggle}
            className={`flex h-9 w-9 items-center justify-center rounded-full text-white ${
              isPlaying ? 'bg-red-500' : 'bg-accent'
            }`}
            aria-label={isPlaying ? 'Pausar' : 'Tocar'}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button onClick={next} className="text-muted hover:text-white" aria-label="Próxima">
            <SkipForward size={20} />
          </button>
        </div>

        {/* Desktop: controles centrais */}
        <div className="hidden flex-1 flex-col items-center gap-1 sm:flex">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleShuffle}
              className={shuffle ? 'text-accent' : 'text-muted hover:text-white'}
              title="Aleatório"
            >
              <Shuffle size={18} />
            </button>
            <button onClick={prev} className="text-muted hover:text-white" title="Anterior">
              <SkipBack size={20} />
            </button>
            <button
              onClick={toggle}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-white ${
                isPlaying ? 'bg-red-500' : 'bg-accent'
              }`}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button onClick={next} className="text-muted hover:text-white" title="Próxima">
              <SkipForward size={20} />
            </button>
            <button
              onClick={cycleRepeat}
              className={repeat !== 'off' ? 'text-accent' : 'text-muted hover:text-white'}
              title={`Repetir: ${repeat}`}
            >
              <RepeatIcon size={18} />
            </button>
          </div>
          <div className="flex w-full max-w-md items-center gap-2 text-xs text-muted">
            <span>{formatDuration(Math.floor(progress))}</span>
            <ProgressBar progress={progress} duration={duration} onSeek={seek} className="flex-1" />
            <span>{formatDuration(Math.floor(duration))}</span>
          </div>
        </div>

        <div className="hidden w-64 items-center justify-end gap-2 sm:flex">
          <Volume2 size={18} className="text-muted" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-elevatedhover"
          />
        </div>
      </div>

      {!expanded && (
        <div className="px-3 pb-2 sm:hidden">
          <ProgressBar progress={progress} duration={duration} onSeek={seek} className="w-full" />
        </div>
      )}
    </footer>
  );
}
