import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import * as crypto from 'crypto';
import { recognizeBytes } from 'shazamio-core';

const ffmpegPath = require('ffmpeg-static');

// Endpoint de descoberta do Shazam (não-oficial, mesmo usado pelo app mobile) —
// só recebe a assinatura acústica (fingerprint), nunca o áudio em si.
const SHAZAM_URL_BASE = 'https://amp.shazam.com/discovery/v5/en/US/iphone/-/tag';
const SHAZAM_USER_AGENT = 'Shazam/3685 CFNetwork/1220.1 Darwin/20.3.0';

export type RecognizeResult =
  | { found: true; title: string; artist: string; coverUrl: string | null }
  | { found: false };

@Injectable()
export class RecognizeService {
  private readonly logger = new Logger(RecognizeService.name);

  // Converte o áudio gravado no browser (webm/opus, mp4, etc.) pra WAV PCM —
  // formato que o decodificador do shazamio-core entende de forma confiável.
  private transcodeToWav(input: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn(ffmpegPath as string, [
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        'pipe:0',
        '-ar',
        '44100',
        '-ac',
        '1',
        '-f',
        'wav',
        'pipe:1',
      ]);
      const chunks: Buffer[] = [];
      let stderr = '';
      ffmpeg.stdout.on('data', (c) => chunks.push(c));
      ffmpeg.stderr.on('data', (c) => (stderr += c.toString()));
      ffmpeg.on('error', reject);
      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`ffmpeg falhou (${code}): ${stderr.slice(0, 300)}`));
          return;
        }
        resolve(Buffer.concat(chunks));
      });
      ffmpeg.stdin.on('error', () => undefined); // EPIPE se o processo já morreu — ignora
      ffmpeg.stdin.end(input);
    });
  }

  async identify(audio: Buffer): Promise<RecognizeResult> {
    const wav = await this.transcodeToWav(audio);
    const signatures = recognizeBytes(wav);
    if (signatures.length === 0) return { found: false };

    try {
      // Usa a assinatura com mais amostras — a que capturou a maior janela do trecho.
      const best = signatures.reduce((a, b) => (b.number_samples > a.number_samples ? b : a));
      return await this.queryShazam(best.uri, best.samplems);
    } finally {
      for (const sig of signatures) sig.free();
    }
  }

  private async queryShazam(uri: string, samplems: number): Promise<RecognizeResult> {
    const url = `${SHAZAM_URL_BASE}/${crypto.randomUUID()}/${crypto.randomUUID()}?sync=true&webv3=true&sampling=true&connected=&shazamapiversion=v3&sharehub=true&hubv5minorversion=v5.1&hidelb=true&video=v3`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': SHAZAM_USER_AGENT,
          Accept: '*/*',
        },
        body: JSON.stringify({
          timezone: 'America/Sao_Paulo',
          signature: { uri, samplems },
          timestamp: Date.now(),
          context: {},
          geolocation: {},
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        this.logger.warn(`Shazam respondeu ${res.status}`);
        return { found: false };
      }
      const data = (await res.json()) as {
        track?: { title?: string; subtitle?: string; images?: { coverart?: string } };
      };
      const track = data?.track;
      if (!track?.title) return { found: false };
      return {
        found: true,
        title: track.title,
        artist: track.subtitle ?? 'Artista desconhecido',
        coverUrl: track.images?.coverart ?? null,
      };
    } catch (err) {
      this.logger.warn(`Falha ao consultar Shazam: ${(err as Error).message}`);
      return { found: false };
    } finally {
      clearTimeout(timeout);
    }
  }
}
