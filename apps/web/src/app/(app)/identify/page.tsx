'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Mic, Search, X } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import BackButton from '@/components/BackButton';
import Logo from '@/components/Logo';

const LISTEN_MS = 8000;
const LISTEN_SECONDS = LISTEN_MS / 1000;

type Result = { found: true; title: string; artist: string; coverUrl: string | null } | { found: false };

export default function IdentifyPage() {
  const [status, setStatus] = useState<'idle' | 'listening' | 'analyzing'>('idle');
  const [secondsLeft, setSecondsLeft] = useState(LISTEN_SECONDS);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownRef = useRef<number | undefined>(undefined);
  const cancelledRef = useRef(false);

  // Se o usuário sair da página no meio da escuta, garante que o microfone
  // não fica aberto em segundo plano.
  useEffect(() => {
    return () => {
      window.clearInterval(countdownRef.current);
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function cancelListening() {
    cancelledRef.current = true;
    window.clearInterval(countdownRef.current);
    recorderRef.current?.stop();
    stopStream();
    setStatus('idle');
  }

  async function startListening() {
    setError(null);
    setResult(null);
    cancelledRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined;
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onerror = () => {
        window.clearInterval(countdownRef.current);
        stopStream();
        setStatus('idle');
        setError('O microfone parou de responder no meio da gravação. Tente de novo.');
      };

      recorder.onstop = async () => {
        window.clearInterval(countdownRef.current);
        stopStream();
        if (cancelledRef.current) return;
        setStatus('analyzing');
        try {
          if (chunks.length === 0) throw new Error('Nenhum áudio foi capturado — tente de novo.');
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          const formData = new FormData();
          formData.append('file', blob, 'sample.webm');
          const data = await api.upload<Result>('/recognize', formData);
          setResult(data);
        } catch (err) {
          setError(err instanceof ApiError ? err.message : 'Falha ao identificar a música. Tente de novo.');
        } finally {
          setStatus('idle');
        }
      };

      recorder.start();
      setStatus('listening');
      setSecondsLeft(LISTEN_SECONDS);
      countdownRef.current = window.setInterval(() => {
        setSecondsLeft((s) => Math.max(0, s - 1));
      }, 1000);
      window.setTimeout(() => {
        if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      }, LISTEN_MS);
    } catch {
      setError('Precisamos da permissão do microfone pra identificar a música.');
    }
  }

  const isBusy = status === 'listening' || status === 'analyzing';

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-8 py-6 text-center">
      <div className="mb-6 flex w-full items-center gap-3">
        <BackButton />
        <h1 className="text-3xl font-bold text-white">Identificar música</h1>
      </div>

      <p className="mb-10 text-sm text-muted">
        Toque no botão, deixe o som tocar por perto e aguarde — a gente escuta por{' '}
        {LISTEN_MS / 1000}s e tenta identificar o nome e o artista.
      </p>

      <button
        onClick={startListening}
        disabled={status !== 'idle'}
        className="flex h-40 w-40 items-center justify-center rounded-full bg-accent transition hover:bg-accenthover disabled:cursor-default"
      >
        <Mic size={56} className="text-white" />
      </button>

      <p className="mt-6 text-base font-bold text-white">Toque para começar</p>
      <p className="mt-1 text-xs text-muted">O microfone só liga quando você tocar.</p>

      {error && <p className="mt-6 text-sm text-red-400">{error}</p>}

      {isBusy && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#12d374] via-accent to-[#04170c] px-8 text-center">
          <button
            onClick={cancelListening}
            className="absolute right-5 top-[calc(env(safe-area-inset-top)+1.25rem)] flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur"
          >
            <X size={14} />
            CANCELAR
          </button>

          <div className="relative flex h-64 w-64 items-center justify-center">
            <span className="absolute h-full w-full animate-ping rounded-full bg-white/10" />
            <span
              className="absolute h-[78%] w-[78%] animate-ping rounded-full bg-white/10"
              style={{ animationDelay: '300ms' }}
            />
            <span
              className="absolute h-[55%] w-[55%] animate-ping rounded-full bg-white/15"
              style={{ animationDelay: '600ms' }}
            />
            <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-white shadow-xl">
              <Logo size={72} />
            </div>
          </div>

          <span
            className="mt-10 inline-flex items-end gap-[3px]"
            style={{ height: 18 }}
            aria-hidden
          >
            <span className="now-playing-bar w-[4px] rounded-full bg-white" style={{ animationDelay: '0ms' }} />
            <span className="now-playing-bar w-[4px] rounded-full bg-white" style={{ animationDelay: '200ms' }} />
            <span className="now-playing-bar w-[4px] rounded-full bg-white" style={{ animationDelay: '400ms' }} />
          </span>

          <p className="mt-4 text-lg font-bold text-white">
            {status === 'listening' ? `Ouvindo música... ${secondsLeft}s` : 'Identificando...'}
          </p>
          <p className="mt-1 text-sm text-white/70">
            {status === 'listening'
              ? 'Deixe o som tocar bem perto do microfone'
              : 'Consultando o banco de músicas'}
          </p>
        </div>
      )}

      {result && (
        <div className="mt-8 w-full rounded-2xl bg-elevated p-5">
          {result.found ? (
            <>
              <div className="flex items-center gap-4">
                {result.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={result.coverUrl} alt="" className="h-16 w-16 rounded object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded bg-elevatedhover text-muted">
                    <Mic size={24} />
                  </div>
                )}
                <div className="min-w-0 text-left">
                  <div className="truncate font-bold text-white">{result.title}</div>
                  <div className="truncate text-sm text-muted">{result.artist}</div>
                </div>
              </div>
              <Link
                href={`/search?q=${encodeURIComponent(`${result.title} ${result.artist}`)}`}
                className="mt-4 flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accenthover"
              >
                <Search size={16} />
                Buscar no Tocafy
              </Link>
            </>
          ) : (
            <p className="text-sm text-muted">
              Não conseguimos identificar essa música. Tente de novo mais perto do som e num
              ambiente mais silencioso.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
