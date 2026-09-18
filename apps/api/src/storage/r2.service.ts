import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';

/** Wrapper fino sobre o S3Client apontado pro Cloudflare R2 (API S3-compatible). */
const OBJECT_EXISTS_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private readonly client: S3Client | null;
  private readonly bucket: string;
  // Evita bater no R2 (HeadObject) a cada troca de faixa — a existência do
  // arquivo não muda no meio de uma sessão de escuta, então cachear por
  // alguns minutos tira uma viagem de rede inteira do caminho crítico do
  // "próxima música" sem perder a checagem de segurança.
  private readonly existsCache = new Map<string, { exists: boolean; at: number }>();

  constructor(private readonly config: ConfigService) {
    const accountId = this.config.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY');
    this.bucket = this.config.get<string>('R2_BUCKET') ?? '';

    if (!accountId || !accessKeyId || !secretAccessKey || !this.bucket) {
      this.logger.warn('R2 não configurado (faltam variáveis) — upload/streaming via R2 desativado.');
      this.client = null;
      return;
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  get isEnabled() {
    return this.client !== null;
  }

  async uploadFile(key: string, filePath: string): Promise<void> {
    if (!this.client) throw new Error('R2 não configurado');
    const body = fs.createReadStream(filePath);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: 'audio/mpeg',
      }),
    );
  }

  async uploadBuffer(key: string, body: Buffer, contentType = 'audio/mpeg'): Promise<void> {
    if (!this.client) throw new Error('R2 não configurado');
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
  }

  /** Checa se o objeto existe no bucket antes de gerar uma URL presigned pra ele —
   * evita redirecionar o player pra uma URL que vai devolver um XML de erro do R2
   * (o <audio> do browser não decodifica isso e mostra "código 4"). */
  async objectExists(key: string): Promise<boolean> {
    if (!this.client) return false;

    const cached = this.existsCache.get(key);
    if (cached && Date.now() - cached.at < OBJECT_EXISTS_TTL_MS) return cached.exists;

    let exists: boolean;
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      exists = true;
    } catch {
      exists = false;
    }
    this.existsCache.set(key, { exists, at: Date.now() });
    return exists;
  }

  async getSignedStreamUrl(key: string, expiresInSec = 3600): Promise<string> {
    if (!this.client) throw new Error('R2 não configurado');
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSec });
  }

  /** Soma bytes + quantidade de objetos no bucket (paginado) — usado pra mostrar
   * no front quanto já foi usado do plano gratuito do R2. */
  async getUsage(): Promise<{ bytes: number; objectCount: number }> {
    if (!this.client) return { bytes: 0, objectCount: 0 };
    let bytes = 0;
    let objectCount = 0;
    let continuationToken: string | undefined;
    do {
      const page = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          ContinuationToken: continuationToken,
        }),
      );
      for (const obj of page.Contents ?? []) {
        bytes += obj.Size ?? 0;
        objectCount++;
      }
      continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (continuationToken);
    return { bytes, objectCount };
  }
}
