'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Mic, Music, Search, X } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useDownload } from '@/context/DownloadContext';
import BackButton from '@/components/BackButton';
import Logo from '@/components/Logo';

const LISTEN_MS = 8000;
const LISTEN_SECONDS = LISTEN_MS / 1000;

type Result = { found: true; title: string; artist: string; coverUrl: string | null } | { found: false };

type YoutubeOption = {
  url: string;
  title: string;
  channel: string;
  durationSec: number | null;
  thumbnail: string | null;
};

function formatYtDuration(sec: number | null) {
  if (sec == null) return '';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function IdentifyPage() {
  const [status, setStatus] = useState<'idle' | 'listening' | 'analyzing'>('idle');
  const [pressed, setPressed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(LISTEN_SECONDS);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ytOptions, setYtOptions] = useState<YoutubeOption[] | null>(null);
  const [ytSearching, setYtSearching] = useState(false);
  const { startYoutubeDownload } = useDownload();
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
    navigator.vibrate?.(30);
    cancelledRef.current = true;
    window.clearInterval(countdownRef.current);
    recorderRef.current?.stop();
    stopStream();
    setStatus('idle');
  }

  function closeResultModal() {
    setResult(null);
    setYtOptions(null);
  }

  async function handleFindOnYoutube() {
    if (!result?.found) return;
    setYtSearching(true);
    setYtOptions([]);
    try {
      const list = await api.get<YoutubeOption[]>(
        `/tracks/youtube/search?q=${encodeURIComponent(`${result.title} ${result.artist}`)}`,
      );
      setYtOptions(list);
    } catch {
      setYtOptions([]);
    } finally {
      setYtSearching(false);
    }
  }

  function pickYoutubeResult(url: string) {
    startYoutubeDownload(url);
    closeResultModal();
  }

  function handleButtonClick() {
    setPressed(true);
    window.setTimeout(() => setPressed(false), 400);
    startListening();
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

  // A barra do player fica por cima do botão Cancelar do overlay — esconde
  // ela enquanto estiver ouvindo/identificando.
  useEffect(() => {
    document.body.classList.toggle('hide-player-bar', isBusy || result !== null);
    return () => document.body.classList.remove('hide-player-bar');
  }, [isBusy, result]);

  return (
    <div className="px-8 py-6">
      <div className="relative z-10 mb-6 flex w-full items-center gap-3">
        <BackButton />
        <h1 className="text-3xl font-bold text-white">Identificar música</h1>
      </div>

      <div
        className={`fixed inset-0 z-0 px-8 text-center ${
          isBusy ? 'bg-gradient-to-b from-[#12d374] via-accent to-[#04170c]' : ''
        }`}
      >
        {/* Âncora do círculo: posição absoluta idêntica em todos os estados
            (idle/ouvindo/identificando), então ele nunca pula de lugar. */}
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2">
          {!isBusy ? (
            <div className="flex h-full w-full items-center justify-center">
              <button
                onClick={handleButtonClick}
                disabled={status !== 'idle'}
                className={`flex h-36 w-36 items-center justify-center rounded-full bg-white shadow-xl transition hover:scale-105 disabled:cursor-default disabled:hover:scale-100 sm:h-44 sm:w-44 ${
                  pressed ? 'button-press-pop' : ''
                }`}
              >
                <Logo size={84} />
              </button>
            </div>
          ) : (
            <div className="relative flex h-full w-full items-center justify-center">
              <span className="pulse-ring-slow absolute h-full w-full rounded-full bg-white/10" />
              <span
                className="pulse-ring-slow absolute h-[78%] w-[78%] rounded-full bg-white/10"
                style={{ animationDelay: '650ms' }}
              />
              <span
                className="pulse-ring-slow absolute h-[55%] w-[55%] rounded-full bg-white/15"
                style={{ animationDelay: '1300ms' }}
              />
              <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-white shadow-xl">
                <Logo size={72} />
              </div>
            </div>
          )}
        </div>

        {/* Âncora do texto/resultado: mesmo deslocamento a partir do centro
            em todos os estados. */}
        <div className="absolute left-1/2 top-[calc(50%+9rem)] w-full max-w-sm -translate-x-1/2 px-8">
          {!isBusy ? (
            <>
              <p className="text-base font-bold text-white">Toque para começar</p>

              {error && <p className="mt-6 text-sm text-red-400">{error}</p>}
            </>
          ) : (
            <>
              <span className="mx-auto mb-4 inline-flex items-end gap-[3px]" style={{ height: 18 }} aria-hidden>
                <span className="now-playing-bar w-[4px] rounded-full bg-white" style={{ animationDelay: '0ms' }} />
                <span className="now-playing-bar w-[4px] rounded-full bg-white" style={{ animationDelay: '200ms' }} />
                <span className="now-playing-bar w-[4px] rounded-full bg-white" style={{ animationDelay: '400ms' }} />
              </span>

              <p className="text-lg font-bold text-white">
                {status === 'listening' ? `Ouvindo música... ${secondsLeft}s` : 'Identificando...'}
              </p>
              <p className="mt-1 text-sm text-white/70">
                {status === 'listening'
                  ? 'Deixe o som tocar bem perto do microfone'
                  : 'Consultando o banco de músicas'}
              </p>

              <button
                onClick={cancelListening}
                className="mx-auto mt-6 flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur"
              >
                <X size={14} />
                CANCELAR
              </button>
            </>
          )}
        </div>
      </div>

      {result && (
        <div
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/90 px-8 text-center backdrop-blur-sm"
          onClick={closeResultModal}
        >
          {ytOptions !== null && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setYtOptions(null);
              }}
              className="absolute left-5 top-[calc(env(safe-area-inset-top)+1.25rem)] flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label="Voltar"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeResultModal();
            }}
            className="absolute right-5 top-[calc(env(safe-area-inset-top)+1.25rem)] flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>

          {ytOptions !== null ? (
            <div onClick={(e) => e.stopPropagation()} className="flex w-full max-w-sm flex-col items-center">
              <h2 className="mb-1 text-lg font-bold text-white">Escolha o vídeo</h2>
              <p className="mb-6 text-sm text-white/60">Qual desses é a música certa?</p>

              {ytSearching && <p className="text-sm text-white/60">Buscando no YouTube...</p>}
              {!ytSearching && ytOptions.length === 0 && (
                <p className="text-sm text-white/60">Nenhum resultado encontrado no YouTube.</p>
              )}

              <div className="flex w-full flex-col gap-2 overflow-y-auto">
                {ytOptions.map((opt) => (
                  <button
                    key={opt.url}
                    onClick={() => pickYoutubeResult(opt.url)}
                    className="flex items-center gap-3 rounded-lg bg-white/5 p-2 text-left hover:bg-white/10"
                  >
                    {opt.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={opt.thumbnail} alt="" className="h-12 w-16 flex-shrink-0 rounded object-cover" />
                    ) : (
                      <div className="flex h-12 w-16 flex-shrink-0 items-center justify-center rounded bg-elevatedhover text-muted">
                        <Music size={18} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-white">{opt.title}</div>
                      <div className="truncate text-xs text-white/50">
                        {[opt.channel, formatYtDuration(opt.durationSec)].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div onClick={(e) => e.stopPropagation()} className="flex w-full max-w-xs flex-col items-center">
              {result.found ? (
                <>
                  {result.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={result.coverUrl}
                      alt=""
                      className="h-52 w-52 rounded-xl object-cover shadow-2xl"
                    />
                  ) : (
                    <div className="flex h-52 w-52 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-emerald-800 shadow-2xl">
                      <Logo size={72} />
                    </div>
                  )}
                  <h2 className="mt-6 truncate text-xl font-bold text-white">{result.title}</h2>
                  <p className="mt-1 truncate text-sm text-white/60">{result.artist}</p>

                  <button
                    onClick={handleFindOnYoutube}
                    className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 text-sm font-bold text-white hover:bg-accenthover"
                  >
                    <Download size={16} />
                    Baixar do YouTube
                  </button>
                  <Link
                    href={`/search?q=${encodeURIComponent(`${result.title} ${result.artist}`)}`}
                    onClick={closeResultModal}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-white/10 py-3 text-sm font-bold text-white hover:bg-white/20"
                  >
                    <Search size={16} />
                    Buscar no Tocafy
                  </Link>
                  <button
                    onClick={closeResultModal}
                    className="mt-3 w-full rounded-full py-3 text-sm font-bold text-white/70 hover:text-white"
                  >
                    Fechar
                  </button>
                </>
              ) : (
                <>
                  <div className="flex h-52 w-52 items-center justify-center rounded-xl bg-elevated shadow-2xl">
                    <Mic size={56} className="text-muted" />
                  </div>
                  <h2 className="mt-6 text-lg font-bold text-white">Não identificamos essa música</h2>
                  <p className="mt-1 text-sm text-white/60">
                    Tente de novo mais perto do som e num ambiente mais silencioso.
                  </p>
                  <button
                    onClick={closeResultModal}
                    className="mt-8 w-full rounded-full bg-accent py-3 text-sm font-bold text-white hover:bg-accenthover"
                  >
                    Fechar
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
