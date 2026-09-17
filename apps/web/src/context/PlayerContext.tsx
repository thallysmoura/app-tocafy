'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { trackCoverUrl, trackStreamUrl } from '@/lib/api';
import { canonicalOrder, computeNextIndex, computePrevIndex, shuffleKeepingCurrent } from '@/lib/queue';
import type { RepeatMode, Track } from '@/lib/types';

type PlayerState = {
  current: Track | null;
  queue: Track[];
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  error: string | null;
  play: (track: Track, queue: Track[], shuffleOverride?: boolean) => void;
  toggle: () => void;
  seek: (time: number) => void;
  setVolume: (v: number) => void;
  next: () => void;
  prev: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  audioRef: React.RefObject<HTMLAudioElement>;
};

const PlayerContext = createContext<PlayerState | null>(null);
const CHANNEL_NAME = 'tocafy-player';
const STORAGE_KEY = 'tocafy:player-state';

type PersistedState = {
  current: Track | null;
  queue: Track[];
  canonicalIds: string[];
  shuffle: boolean;
  repeat: RepeatMode;
  volume: number;
  progress: number;
};

function loadPersistedState(): PersistedState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function savePersistedState(state: PersistedState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage indisponível (modo privado etc.) — degrada sem quebrar o player.
  }
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const instanceId = useRef(Math.random().toString(36).slice(2));
  const restoredProgressRef = useRef<number>(0);
  const hasRestoredRef = useRef(false);
  const pendingRestoreListenerRef = useRef<(() => void) | null>(null);
  const retriedTrackIdRef = useRef<string | null>(null);
  const playRequestIdRef = useRef(0);

  const initialState = useRef(loadPersistedState()).current;

  const [current, setCurrent] = useState<Track | null>(initialState?.current ?? null);
  const [queue, setQueue] = useState<Track[]>(initialState?.queue ?? []);
  const [canonicalIds, setCanonicalIds] = useState<string[]>(initialState?.canonicalIds ?? []);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(initialState?.progress ?? 0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(initialState?.volume ?? 1);
  const [shuffle, setShuffle] = useState(initialState?.shuffle ?? false);
  const [repeat, setRepeat] = useState<RepeatMode>(initialState?.repeat ?? 'off');
  const [error, setError] = useState<string | null>(null);

  // Retoma a faixa e a posição salvas ao carregar a página, tentando autoplay
  // de verdade (sem precisar clicar em play de novo depois de um F5).
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;
    const audio = audioRef.current;
    if (!audio || !initialState?.current) return;

    restoredProgressRef.current = initialState.progress ?? 0;
    audio.src = trackStreamUrl(initialState.current);
    audio.volume = initialState.volume ?? 1;
    audio.load();

    const onLoadedMetadata = () => {
      pendingRestoreListenerRef.current = null;
      audio.currentTime = restoredProgressRef.current;
      setProgress(restoredProgressRef.current);

      const resumeOnGesture = () => {
        audio.muted = false;
        audio.play().then(() => setIsPlaying(true)).catch(() => undefined);
      };

      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          // Autoplay com som bloqueado pelo navegador. Autoplay mudo é sempre
          // permitido — toca mudo e desmuta logo em seguida (isso não conta
          // como um novo play() bloqueável, o áudio já está rodando). Só se
          // isso também falhar (raro) espera o primeiro clique/tecla na
          // página pra retomar.
          audio.muted = true;
          audio
            .play()
            .then(() => {
              setIsPlaying(true);
              audio.muted = false;
            })
            .catch(() => {
              setIsPlaying(false);
              window.addEventListener('pointerdown', resumeOnGesture, { once: true });
              window.addEventListener('keydown', resumeOnGesture, { once: true });
            });
        });
    };
    // Guardado numa ref pra poder cancelar: se o usuário tocar outra faixa
    // antes desse "loadedmetadata" disparar, esse listener (once:true) ficaria
    // pendurado e dispararia pro carregamento da faixa NOVA em vez da restaurada,
    // corrompendo a posição/reprodução dela.
    pendingRestoreListenerRef.current = onLoadedMetadata;
    audio.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
    return () => audio.removeEventListener('loadedmetadata', onLoadedMetadata);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persiste faixa/fila/preferências a cada mudança (posição é salva à parte, com throttle).
  useEffect(() => {
    savePersistedState({ current, queue, canonicalIds, shuffle, repeat, volume, progress });
  }, [current, queue, canonicalIds, shuffle, repeat, volume]);

  // Posição de reprodução: salva periodicamente enquanto toca, e sempre ao pausar/sair.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const persistProgress = () => {
      const audio = audioRef.current;
      if (!current || !audio) return;
      savePersistedState({
        current,
        queue,
        canonicalIds,
        shuffle,
        repeat,
        volume,
        progress: audio.currentTime,
      });
    };

    window.addEventListener('beforeunload', persistProgress);
    const interval = isPlaying ? window.setInterval(persistProgress, 5000) : undefined;

    return () => {
      window.removeEventListener('beforeunload', persistProgress);
      if (interval) window.clearInterval(interval);
      persistProgress();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, current]);

  // No máximo um player ativo entre abas: quem começar a tocar avisa as outras a pausarem.
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;
    channel.onmessage = (event) => {
      if (event.data?.type === 'playing' && event.data.from !== instanceId.current) {
        audioRef.current?.pause();
        setIsPlaying(false);
      }
    };
    return () => channel.close();
  }, []);

  function broadcastPlaying() {
    channelRef.current?.postMessage({ type: 'playing', from: instanceId.current });
  }

  function playIndex(list: Track[], index: number) {
    const track = list[index];
    if (!track) return;
    retriedTrackIdRef.current = null;
    setCurrent(track);
    setQueue(list);
    setError(null);
    // Clicar em várias faixas rápido dispara vários play() em sequência: o
    // load() da faixa seguinte cancela o play() pendente da anterior, que
    // rejeita com AbortError ("interrupted by a new load request") mesmo a
    // faixa nova tocando normalmente. O token garante que só o resultado do
    // clique mais recente atualiza estado/mostra erro.
    const requestId = ++playRequestIdRef.current;
    const audio = audioRef.current;
    if (!audio) return;
    if (pendingRestoreListenerRef.current) {
      audio.removeEventListener('loadedmetadata', pendingRestoreListenerRef.current);
      pendingRestoreListenerRef.current = null;
    }
    audio.src = trackStreamUrl(track);
    audio.load();
    audio
      .play()
      .then(() => {
        if (playRequestIdRef.current !== requestId) return;
        setIsPlaying(true);
        broadcastPlaying();
      })
      .catch((err) => {
        if (playRequestIdRef.current !== requestId || err.name === 'AbortError') return;
        setIsPlaying(false);
        setError(`Não foi possível tocar "${track.title}": ${err.message}`);
      });
  }

  function play(track: Track, list: Track[], shuffleOverride?: boolean) {
    // shuffleOverride existe pra botões tipo "Tocar" / "Aleatório" que precisam
    // decidir o modo no mesmo clique que já inicia a reprodução — sem esperar
    // o próximo render, já que setShuffle só reflete no estado depois.
    const useShuffle = shuffleOverride ?? shuffle;
    if (shuffleOverride !== undefined && shuffleOverride !== shuffle) setShuffle(shuffleOverride);
    setCanonicalIds(list.map((t) => t.id));
    const effectiveList = useShuffle ? shuffleKeepingCurrent(list, track.id) : list;
    const index = effectiveList.findIndex((t) => t.id === track.id);
    playIndex(effectiveList, index === -1 ? 0 : index);
  }

  function toggle() {
    if (!audioRef.current || !current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          broadcastPlaying();
        })
        .catch((err) => {
          if (err.name === 'AbortError') return;
          setError(`Não foi possível tocar: ${err.message}`);
        });
    }
  }

  function seek(time: number) {
    if (audioRef.current) audioRef.current.currentTime = time;
    setProgress(time);
  }

  function setVolume(v: number) {
    setVolumeState(v);
    if (audioRef.current) audioRef.current.volume = v;
  }

  function next() {
    if (!current) return;
    if (queue.length === 0) {
      setIsPlaying(false);
      return;
    }
    const index = queue.findIndex((t) => t.id === current.id);
    const nextIndex = computeNextIndex(index, queue.length, repeat);
    if (nextIndex === null) {
      // Fim da fila sem repeat-all: nunca pausa — continua em ordem (do início)
      // ou, se o shuffle estiver ligado, embaralha de novo e segue tocando.
      if (shuffle) {
        const reshuffled = shuffleKeepingCurrent(queue, null);
        setQueue(reshuffled);
        playIndex(reshuffled, 0);
      } else {
        playIndex(queue, 0);
      }
      return;
    }
    playIndex(queue, nextIndex);
  }

  function prev() {
    if (!current) return;
    const index = queue.findIndex((t) => t.id === current.id);
    if (progress > 3) {
      seek(0);
      return;
    }
    const prevIndex = computePrevIndex(index, repeat);
    if (prevIndex === null) return;
    playIndex(queue, prevIndex);
  }

  function toggleShuffle() {
    setShuffle((prevShuffle) => {
      const willShuffle = !prevShuffle;
      if (!current) return willShuffle;

      if (willShuffle) {
        setQueue((q) => shuffleKeepingCurrent(q, current.id));
      } else {
        setQueue((q) => canonicalOrder(q, canonicalIds.length ? canonicalIds : q.map((t) => t.id)));
      }
      return willShuffle;
    });
  }

  function cycleRepeat() {
    setRepeat((r) => (r === 'off' ? 'repeat-all' : r === 'repeat-all' ? 'repeat-one' : 'off'));
  }

  // Media Session API — controles da tela de bloqueio / hardware.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    if (!current) return;

    const cover = trackCoverUrl(current);
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.artist?.name ?? 'Artista desconhecido',
      album: current.album?.title ?? '',
      artwork: cover ? [{ src: cover, sizes: '512x512', type: 'image/jpeg' }] : [],
    });

    navigator.mediaSession.setActionHandler('play', () => toggle());
    navigator.mediaSession.setActionHandler('pause', () => toggle());
    navigator.mediaSession.setActionHandler('previoustrack', () => prev());
    navigator.mediaSession.setActionHandler('nexttrack', () => next());
    navigator.mediaSession.setActionHandler('seekbackward', () => seek(Math.max(0, progress - 10)));
    navigator.mediaSession.setActionHandler('seekforward', () => seek(Math.min(duration, progress + 10)));
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime != null) seek(details.seekTime);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  // Screen Wake Lock: evita a tela apagar/suspender o app enquanto está tocando
  // em primeiro plano. Não é uma permissão do navegador (não há prompt) e não
  // afeta o áudio em si — é só uma camada extra pra não interromper a sessão.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator) || !isPlaying) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    navigator.wakeLock
      .request('screen')
      .then((s) => {
        if (cancelled) {
          s.release().catch(() => undefined);
        } else {
          sentinel = s;
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      sentinel?.release().catch(() => undefined);
    };
  }, [isPlaying]);

  const value = useMemo(
    () => ({
      current,
      queue,
      isPlaying,
      progress,
      duration,
      volume,
      shuffle,
      repeat,
      error,
      play,
      toggle,
      seek,
      setVolume,
      next,
      prev,
      toggleShuffle,
      cycleRepeat,
      audioRef,
    }),
    [current, queue, isPlaying, progress, duration, volume, shuffle, repeat, error],
  );

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        preload="auto"
        playsInline
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={next}
        onError={(e) => {
          const mediaError = e.currentTarget.error;
          const audio = e.currentTarget;
          // Código 4 (MEDIA_ERR_SRC_NOT_SUPPORTED) pode vir de uma URL presigned do R2
          // expirada (1h) numa sessão longa — busca a faixa de novo (URL fresca) uma
          // única vez antes de desistir e mostrar o erro pro usuário.
          if (mediaError?.code === 4 && current && retriedTrackIdRef.current !== current.id) {
            retriedTrackIdRef.current = current.id;
            audio.src = trackStreamUrl(current);
            audio.load();
            audio
              .play()
              .then(() => setIsPlaying(true))
              .catch(() => setIsPlaying(false));
            return;
          }
          setIsPlaying(false);
          setError(
            mediaError ? `Falha ao carregar áudio (código ${mediaError.code}).` : 'Falha ao carregar áudio.',
          );
        }}
      />
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer precisa estar dentro de PlayerProvider');
  return ctx;
}
