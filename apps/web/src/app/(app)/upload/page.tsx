'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clipboard, Music, UploadCloud } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import BackButton from '@/components/BackButton';
import StorageUsageCard from '@/components/StorageUsageCard';
import { useDownload } from '@/context/DownloadContext';
import type { Track } from '@/lib/types';

type StorageUsage = { bytes: number; objectCount: number; limitBytes: number; percentUsed: number };

export default function UploadPage() {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { ytBusy, ytDisplay, ytError, startYoutubeDownload, clearYtError, reportUploadSuccess } =
    useDownload();

  const { data: usage } = useQuery({
    queryKey: ['storage-usage'],
    queryFn: () => api.get<StorageUsage>('/storage/usage'),
  });

  const uploadTrack = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.upload<Track>('/tracks/upload', formData);
    },
    onSuccess: (track) => {
      setUploadError(null);
      reportUploadSuccess(track);
    },
    onError: (err) => {
      setUploadError(err instanceof ApiError ? err.message : 'Falha ao enviar a música.');
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError(null);
    uploadTrack.mutate(file);
  }

  function submitYoutubeUrl(url: string) {
    const trimmed = url.trim();
    if (!trimmed || ytBusy) return;
    startYoutubeDownload(trimmed);
    setYoutubeUrl('');
  }

  function handleYoutubeSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitYoutubeUrl(youtubeUrl);
  }

  async function handlePasteClick() {
    setPasteError(null);
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) return;
      // Já dispara o download direto — no touch evita ter que abrir o
      // teclado, colar e ainda clicar em "Baixar" separado.
      setYoutubeUrl(text.trim());
      if (ytError) clearYtError();
      submitYoutubeUrl(text);
    } catch {
      setPasteError('Não foi possível acessar a área de transferência — cole manualmente no campo.');
    }
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
          Baixa o áudio do vídeo e importa como uma faixa nova. Pode trocar de aba/página que o
          download continua — quando terminar, o aviso aparece na hora.
        </p>
        <form onSubmit={handleYoutubeSubmit} className="flex flex-col gap-2 sm:flex-row">
          <input
            value={youtubeUrl}
            onChange={(e) => {
              setYoutubeUrl(e.target.value);
              if (ytError) clearYtError();
            }}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full rounded bg-elevated px-4 py-2 text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent sm:flex-1"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePasteClick}
              disabled={ytBusy}
              className="flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-elevated px-4 py-2 text-sm font-semibold text-white hover:bg-elevatedhover disabled:opacity-50 sm:flex-none"
              title="Colar da área de transferência e baixar"
            >
              <Clipboard size={16} />
              Colar
            </button>
            <button
              type="submit"
              disabled={!youtubeUrl.trim() || ytBusy}
              className="flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-elevated px-4 py-2 text-sm font-semibold text-white hover:bg-elevatedhover disabled:opacity-50 sm:flex-none"
            >
              <Music size={16} />
              {ytBusy ? (ytDisplay > 0 ? `Baixando... ${Math.round(ytDisplay)}%` : 'Preparando...') : 'Baixar'}
            </button>
          </div>
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
        {pasteError && <p className="mt-3 text-sm text-red-400">{pasteError}</p>}
      </div>
    </div>
  );
}
