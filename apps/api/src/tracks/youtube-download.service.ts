import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { randomUUID } from 'crypto';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ytdlp = require('yt-dlp-exec');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpegPath = require('ffmpeg-static');

const YOUTUBE_URL_RE = /^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//;
const PROGRESS_RE = /\[download\]\s+([\d.]+)%/;
const TITLE_RE = /^TITLE::(.+)$/m;

type Job =
  | { status: 'downloading'; percent: number }
  | { status: 'done'; percent: 100; buffer: Buffer; title: string }
  | { status: 'error'; error: string };

/**
 * yt-dlp (não youtube-mp3-downloader/ytdl-core) é o motor aqui: o YouTube passou
 * a exigir um "poToken" anti-bot que quebra qualquer lib baseada em ytdl-core
 * (testado, falha universal em qualquer vídeo). yt-dlp é mantido ativamente e
 * lida com isso — é o único caminho que funciona de verdade hoje.
 */
@Injectable()
export class YoutubeDownloadService {
  private readonly logger = new Logger(YoutubeDownloadService.name);
  // Jobs em memória — reinicia zerado a cada deploy da API, ok pra uma feature
  // de admin de uso pontual (não precisa persistir em banco/fila).
  private readonly jobs = new Map<string, Job>();

  private assertValidUrl(url: string) {
    if (!YOUTUBE_URL_RE.test(url)) throw new BadRequestException('Link do YouTube inválido.');
  }

  startDownload(url: string): string {
    this.assertValidUrl(url);
    const jobId = randomUUID();
    this.jobs.set(jobId, { status: 'downloading', percent: 0 });
    this.runDownload(jobId, url).catch(() => undefined); // erros já viram job.status = 'error'
    return jobId;
  }

  /** Lê o status do job; se já terminou (sucesso ou erro), consome e remove — evita acumular buffers na memória. */
  consumeJob(jobId: string): Job | undefined {
    const job = this.jobs.get(jobId);
    if (job && job.status !== 'downloading') this.jobs.delete(jobId);
    return job;
  }

  private async runDownload(jobId: string, url: string) {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tocafy-yt-'));
    const id = randomUUID();
    const outputTemplate = path.join(outputDir, `${id}.%(ext)s`);
    const finalFile = path.join(outputDir, `${id}.mp3`);

    let title: string = id;
    try {
      // Uma chamada só (baixa + extrai + já imprime o título no final) em vez de
      // uma chamada de metadata separada antes — essa segunda chamada prévia
      // deixava a % travada em 0% por vários segundos antes do download real
      // começar, parecendo travado pro usuário.
      const child = ytdlp.exec(url, {
        extractAudio: true,
        audioFormat: 'mp3',
        audioQuality: 0,
        output: outputTemplate,
        ffmpegLocation: ffmpegPath,
        noWarnings: true,
        noPlaylist: true,
        newline: true,
        print: 'after_move:TITLE::%(title)s',
      });

      child.stdout?.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        const progressMatch = PROGRESS_RE.exec(text);
        if (progressMatch) {
          // O download em si conta até 90% — deixa margem visível pra etapa
          // final de extração/conversão pro mp3 (rápida, mas não instantânea).
          const percent = Math.min(90, Math.round(parseFloat(progressMatch[1]) * 0.9));
          this.jobs.set(jobId, { status: 'downloading', percent });
        }
        const titleMatch = TITLE_RE.exec(text);
        if (titleMatch) title = titleMatch[1].trim();
      });

      await child;

      if (!fs.existsSync(finalFile)) throw new Error('Arquivo final não foi gerado pelo yt-dlp.');

      const buffer = fs.readFileSync(finalFile);
      this.jobs.set(jobId, { status: 'done', percent: 100, buffer, title });
    } catch (err) {
      this.logger.warn(`Falha ao baixar do YouTube (${url}): ${(err as Error).message}`);
      this.jobs.set(jobId, { status: 'error', error: 'Não foi possível baixar o áudio desse link.' });
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  }
}
