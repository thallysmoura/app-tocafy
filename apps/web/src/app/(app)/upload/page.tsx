'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Music, UploadCloud } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import BackButton from '@/components/BackButton';
import StorageUsageCard from '@/components/StorageUsageCard';
import ImportSuccessModal from '@/components/ImportSuccessModal';
import type { Track } from '@/lib/types';

type StorageUsage = { bytes: number; objectCount: number; limitBytes: number; percentUsed: number };

export default function UploadPage() {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successTrack, setSuccessTrack] = useState<Track | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: usage } = useQuery({
    queryKey: ['storage-usage'],
    queryFn: () => api.get<StorageUsage>('/storage/usage'),
  });

  const onImported = (track: Track) => {
    setUploadError(null);
    setSuccessTrack(track);
    queryClient.invalidateQueries({ queryKey: ['search'] });
    queryClient.invalidateQueries({ queryKey: ['tracks'] });
    queryClient.invalidateQueries({ queryKey: ['storage-usage'] });
  };
  const onImportError = (err: unknown) => {
    setUploadError(err instanceof ApiError ? err.message : 'Falha ao enviar a música.');
  };

  const uploadTrack = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.upload<Track>('/tracks/upload', formData);
    },
    onSuccess: onImported,
    onError: onImportError,
  });

  const [ytBusy, setYtBusy] = useState(false);
  const [ytProgress, setYtProgress] = useState(0); // valor real, vindo da API
  const [ytDisplay, setYtDisplay] = useState(0); // valor animado mostrado na barra
  const [ytError, setYtError] = useState<string | null>(null);

  // Simula avanço contínuo entre um poll e outro (a cada 350ms) — sem isso a
  // barra só pulava de valor em valor e parecia travada no meio do caminho.
  // Nunca ultrapassa muito o último valor real conhecido, e sempre alcança
  // instantaneamente se o valor real já foi além do simulado.
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

  type YoutubeJobStatus =
    | { status: 'downloading'; percent: number }
    | { status: 'error'; error: string }
    | { status: 'done'; track: Track };

  async function handleYoutubeSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = youtubeUrl.trim();
    if (!url || ytBusy) return;

    setYtError(null);
    setYtBusy(true);
    setYtProgress(0);
    setYtDisplay(0);

    try {
      const { jobId } = await api.post<{ jobId: string }>('/tracks/youtube', { url });
      // eslint-disable-next-line no-constant-condition
      while (true) {
        // Checa na hora (sem esperar) — downloads curtos podem terminar em
        // menos de 1s, e um intervalo grande antes do primeiro check fazia a
        // barra parecer travada em 0% até o job já ter acabado.
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
          setYoutubeUrl('');
        }
        break;
      }
    } catch (err) {
      setYtError(err instanceof ApiError ? err.message : 'Falha ao baixar do YouTube.');
    } finally {
      setYtBusy(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError(null);
    uploadTrack.mutate(file);
  }

  return (
    <div className="px-8 py-6">
      <div className="mb-6 flex items-center gap-3">
        <BackButton />
        <h1 className="text-3xl font-bold text-white">Upload de música</h1>
      </div>

      {usage && <StorageUsageCard usage={usage} />}

      <p className="mb-6 max-w-md text-sm text-muted">
        Envie um arquivo .mp3 do seu computador. Ele é salvo automaticamente e já aparece na
        busca e na biblioteca em seguida.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mpeg,.mp3"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploadTrack.isPending}
        className="flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white hover:bg-accenthover disabled:opacity-50"
      >
        <UploadCloud size={18} />
        {uploadTrack.isPending ? 'Enviando...' : 'Escolher arquivo .mp3'}
      </button>
      {uploadError && <p className="mt-3 text-sm text-red-400">{uploadError}</p>}

      <div className="mt-10 max-w-md border-t border-elevatedhover pt-6">
        <h2 className="mb-2 text-lg font-semibold text-white">Ou cole um link do YouTube</h2>
        <p className="mb-4 text-sm text-muted">
          Baixa o áudio do vídeo e importa como uma faixa nova, do mesmo jeito que o upload manual.
        </p>
        <form onSubmit={handleYoutubeSubmit} className="flex gap-2">
          <input
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            disabled={ytBusy}
            className="flex-1 rounded bg-elevated px-4 py-2 text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!youtubeUrl.trim() || ytBusy}
            className="flex items-center gap-2 rounded-full bg-elevated px-4 py-2 text-sm font-semibold text-white hover:bg-elevatedhover disabled:opacity-50"
          >
            <Music size={16} />
            {ytBusy ? (ytDisplay > 0 ? `Baixando... ${Math.round(ytDisplay)}%` : 'Preparando...') : 'Baixar'}
          </button>
        </form>
        {ytBusy && (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-elevated">
            {ytDisplay > 0 ? (
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${ytDisplay}%`, transition: 'width 150ms linear' }}
              />
            ) : (
              <div className="h-full w-1/3 animate-pulse rounded-full bg-accent/60" />
            )}
          </div>
        )}
        {ytError && <p className="mt-3 text-sm text-red-400">{ytError}</p>}
      </div>

      {successTrack && (
        <ImportSuccessModal
          trackTitle={successTrack.title}
          onClose={() => setSuccessTrack(null)}
        />
      )}
    </div>
  );
}
