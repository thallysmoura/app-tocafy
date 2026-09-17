'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import type { Track } from '@/lib/types';

type YoutubeJobStatus =
  | { status: 'downloading'; percent: number }
  | { status: 'error'; error: string }
  | { status: 'done'; track: Track };

type DownloadState = {
  ytBusy: boolean;
  ytDisplay: number;
  ytError: string | null;
  successTrack: Track | null;
  startYoutubeDownload: (url: string) => void;
  clearYtError: () => void;
  clearSuccess: () => void;
  reportUploadSuccess: (track: Track) => void;
};

const DownloadContext = createContext<DownloadState | null>(null);

/**
 * Fica no topo da árvore (Providers), não dentro da página /upload — assim o
 * download por link do YouTube continua rodando (e o modal de sucesso
 * aparece) mesmo que o usuário troque de aba/rota antes de terminar.
 */
export function DownloadProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [ytBusy, setYtBusy] = useState(false);
  const [ytProgress, setYtProgress] = useState(0);
  const [ytDisplay, setYtDisplay] = useState(0);
  const [ytError, setYtError] = useState<string | null>(null);
  const [successTrack, setSuccessTrack] = useState<Track | null>(null);

  useEffect(() => {
    if (!ytBusy) return;
    const interval = setInterval(() => {
      setYtDisplay((prev) => {
        if (prev < ytProgress) return ytProgress;
        const ceiling = Math.min(95, ytProgress + 8);
        return prev < ceiling ? Math.min(ceiling, prev + 0.6) : prev;
      });
    }, 150);
    return () => clearInterval(interval);
  }, [ytBusy, ytProgress]);

  const onImported = (track: Track) => {
    setSuccessTrack(track);
    queryClient.invalidateQueries({ queryKey: ['search'] });
    queryClient.invalidateQueries({ queryKey: ['tracks'] });
    queryClient.invalidateQueries({ queryKey: ['storage-usage'] });
  };

  const runIdRef = useRef(0);

  function startYoutubeDownload(url: string) {
    if (ytBusy) return;
    const runId = ++runIdRef.current;
    setYtError(null);
    setYtBusy(true);
    setYtProgress(0);
    setYtDisplay(0);

    (async () => {
      try {
        const { jobId } = await api.post<{ jobId: string }>('/tracks/youtube', { url });
        // eslint-disable-next-line no-constant-condition
        while (true) {
          if (runIdRef.current !== runId) return; // um novo download substituiu este
          const job = await api.get<YoutubeJobStatus>(`/tracks/youtube/${jobId}`);
          if (job.status === 'downloading') {
            setYtProgress(job.percent);
            await new Promise((resolve) => setTimeout(resolve, 350));
            continue;
          }
          if (job.status === 'error') {
            setYtError(job.error);
          } else {
            setYtProgress(100);
            setYtDisplay(100);
            onImported(job.track);
          }
          break;
        }
      } catch (err) {
        if (runIdRef.current !== runId) return;
        setYtError(err instanceof ApiError ? err.message : 'Falha ao baixar do YouTube.');
      } finally {
        if (runIdRef.current === runId) setYtBusy(false);
      }
    })();
  }

  return (
    <DownloadContext.Provider
      value={{
        ytBusy,
        ytDisplay,
        ytError,
        successTrack,
        startYoutubeDownload,
        clearYtError: () => setYtError(null),
        clearSuccess: () => setSuccessTrack(null),
        reportUploadSuccess: onImported,
      }}
    >
      {children}
    </DownloadContext.Provider>
  );
}

export function useDownload() {
  const ctx = useContext(DownloadContext);
  if (!ctx) throw new Error('useDownload precisa estar dentro de DownloadProvider');
  return ctx;
}
