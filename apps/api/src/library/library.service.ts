import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { R2Service } from '../storage/r2.service';
import * as chokidar from 'chokidar';
import * as fs from 'fs';
import * as path from 'path';
import { parseFile, parseBuffer } from 'music-metadata';
import { randomUUID } from 'crypto';

const COVERS_DIR = path.join(process.cwd(), 'covers');

@Injectable()
export class LibraryService implements OnModuleInit {
  private readonly logger = new Logger(LibraryService.name);
  private readonly musicDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly push: PushService,
    private readonly r2: R2Service,
  ) {
    this.musicDir = this.config.get<string>('MUSIC_DIR') ?? '';
    if (!fs.existsSync(COVERS_DIR)) fs.mkdirSync(COVERS_DIR, { recursive: true });
  }

  async onModuleInit() {
    if (!this.musicDir || !fs.existsSync(this.musicDir)) {
      this.logger.warn(`MUSIC_DIR inválido ou não configurado: "${this.musicDir}"`);
      return;
    }

    await this.scan();

    chokidar
      .watch(this.musicDir, { ignoreInitial: true, depth: 20, awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 100 } })
      .on('add', (filePath) => {
        if (this.isMp3(filePath)) {
          this.logger.log(`Novo arquivo detectado: ${filePath}`);
          this.importFile(filePath).catch((err) =>
            this.logger.error(`Falha ao importar ${filePath}: ${err.message}`),
          );
        }
      })
      .on('error', (err) => {
        // Arquivos ainda sendo escritos/baixados no Windows disparam EBUSY —
        // sem esse handler o erro derruba o processo inteiro (evento sem listener).
        this.logger.warn(`Watcher: ${(err as Error).message}`);
      });

    this.logger.log(`Observando ${this.musicDir} por novos MP3s...`);
  }

  async scan() {
    const files = this.walk(this.musicDir).filter((f) => this.isMp3(f));
    this.logger.log(`Scan inicial: ${files.length} MP3(s) encontrado(s) em ${this.musicDir}`);

    let imported = 0;
    for (const file of files) {
      const created = await this.importFile(file, { notify: false });
      if (created) imported++;
    }
    this.logger.log(`Scan concluído: ${imported} faixa(s) nova(s).`);
    return { found: files.length, imported };
  }

  private isMp3(filePath: string) {
    return path.extname(filePath).toLowerCase() === '.mp3';
  }

  private walk(dir: string): string[] {
    let results: string[] = [];
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return results;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results = results.concat(this.walk(full));
      } else {
        results.push(full);
      }
    }
    return results;
  }

  /** Normaliza título/artista pra comparar duplicatas (ignora acento, maiúscula,
   * pontuação e sufixos tipo "(Official Video)"/"[4K Remaster]"). */
  private normalizeForDedup(s: string) {
    return s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\(.*?\)|\[.*?\]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  // Dedupe é por dono — dois usuários podem baixar a mesma música, cada um
  // com a própria cópia; só evita duplicar dentro da biblioteca da mesma conta.
  private async findDuplicateTrack(title: string, artistName: string, ownerId: string) {
    const normTitle = this.normalizeForDedup(title);
    const normArtist = this.normalizeForDedup(artistName);
    const candidates = await this.prisma.track.findMany({
      where: { ownerId },
      include: { artist: true, album: true },
    });
    return (
      candidates.find(
        (t) =>
          this.normalizeForDedup(t.title) === normTitle &&
          this.normalizeForDedup(t.artist?.name ?? '') === normArtist,
      ) ?? null
    );
  }

  /** Id do admin — dono de tudo que entra pelo scan do disco (recurso do
   * servidor, não de um usuário específico). Cacheado após a primeira busca. */
  private adminIdCache: string | null | undefined;
  private async getAdminId(): Promise<string | null> {
    if (this.adminIdCache !== undefined) return this.adminIdCache;
    const admin = await this.prisma.user.findFirst({ where: { isAdmin: true } });
    this.adminIdCache = admin?.id ?? null;
    return this.adminIdCache;
  }

  private async upsertArtist(name: string) {
    return this.prisma.artist.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }

  private async upsertAlbum(title: string, artistId: string, coverPath: string | null) {
    return this.prisma.album.upsert({
      where: { title_artistId: { title, artistId } },
      create: { title, artistId, coverPath },
      update: coverPath ? { coverPath } : {},
    });
  }

  private async upsertGenres(trackId: string, genreNames: string[]) {
    for (const raw of genreNames) {
      const name = raw.trim();
      if (!name) continue;
      const genre = await this.prisma.genre.upsert({
        where: { name },
        create: { name },
        update: {},
      });
      await this.prisma.trackGenre
        .create({ data: { trackId, genreId: genre.id } })
        .catch(() => undefined);
    }
  }

  private async importFile(filePath: string, opts: { notify?: boolean } = {}): Promise<boolean> {
    const existing = await this.prisma.track.findUnique({ where: { filePath } });
    if (existing) return false;

    const notify = opts.notify ?? true;
    const ownerId = await this.getAdminId();

    try {
      const metadata = await parseFile(filePath);
      const common = metadata.common;
      const title = common.title || path.basename(filePath, '.mp3');
      const artistName = common.artist || common.albumartist || 'Artista desconhecido';
      const durationSec = metadata.format.duration
        ? Math.round(metadata.format.duration)
        : null;

      let coverPath: string | null = null;
      const picture = common.picture?.[0];
      if (picture) {
        const ext = picture.format.includes('png') ? 'png' : 'jpg';
        const id = Buffer.from(filePath).toString('base64url');
        const coverFile = path.join(COVERS_DIR, `${id}.${ext}`);
        fs.writeFileSync(coverFile, picture.data);
        coverPath = coverFile;
      }

      const artist = await this.upsertArtist(artistName);
      const album = common.album
        ? await this.upsertAlbum(common.album, artist.id, coverPath)
        : null;

      const track = await this.prisma.track.create({
        data: {
          filePath,
          title,
          artistId: artist.id,
          albumId: album?.id,
          durationSec,
          coverPath: album?.coverPath ?? coverPath,
          ownerId,
        },
      });

      if (common.genre?.length) {
        await this.upsertGenres(track.id, common.genre);
      }

      await this.uploadToR2(track.id, filePath);

      if (notify) {
        const usersToNotify = await this.prisma.notificationPreference.findMany({
          where: { newTracksFromArtists: true },
        });
        for (const pref of usersToNotify) {
          await this.push.notifyUser(pref.userId, {
            title: 'Nova faixa na sua biblioteca',
            body: `${title} — ${artistName}`,
          });
        }
      }

      return true;
    } catch (err) {
      this.logger.warn(`Não foi possível ler metadata de ${filePath}: ${(err as Error).message}`);
      const artist = await this.upsertArtist('Artista desconhecido');
      const track = await this.prisma.track.create({
        data: {
          filePath,
          title: path.basename(filePath, '.mp3'),
          artistId: artist.id,
          ownerId,
        },
      });
      await this.uploadToR2(track.id, filePath);
      return true;
    }
  }

  /**
   * Importa um MP3 enviado pelo usuário direto pelo front-end: extrai metadata do
   * buffer (sem tocar em disco), cria o Track e sobe pro R2. Exige R2 configurado —
   * não existe "arquivo local" pra fazer fallback aqui.
   */
  async importUploadedTrack(buffer: Buffer, originalName: string, ownerId: string) {
    if (!this.r2.isEnabled) {
      throw new BadRequestException('Upload indisponível no momento.');
    }

    const metadata = await parseBuffer(buffer, 'audio/mpeg').catch(() => null);
    const common = metadata?.common;
    const title = common?.title || path.basename(originalName, path.extname(originalName));
    const artistName = common?.artist || common?.albumartist || 'Artista desconhecido';
    const durationSec = metadata?.format.duration ? Math.round(metadata.format.duration) : null;

    // Já existe uma faixa com esse título+artista NA BIBLIOTECA DESSE USUÁRIO?
    // Não sobe de novo pro R2 — devolve a que já existe (o controller ainda
    // favorita ela normalmente).
    const duplicate = await this.findDuplicateTrack(title, artistName, ownerId);
    if (duplicate) return duplicate;

    let coverPath: string | null = null;
    const picture = common?.picture?.[0];
    if (picture) {
      const ext = picture.format.includes('png') ? 'png' : 'jpg';
      const coverFile = path.join(COVERS_DIR, `${randomUUID()}.${ext}`);
      fs.writeFileSync(coverFile, picture.data);
      coverPath = coverFile;
    }

    const artist = await this.upsertArtist(artistName);
    const album = common?.album ? await this.upsertAlbum(common.album, artist.id, coverPath) : null;

    const track = await this.prisma.track.create({
      data: {
        // Faixa enviada pelo usuário não tem arquivo em disco — só existe no R2.
        // filePath continua NOT NULL/único no schema, então usamos um marcador
        // opaco em vez de reaproveitar esse campo pra apontar pra algo real.
        filePath: `upload://${randomUUID()}`,
        title,
        artistId: artist.id,
        albumId: album?.id,
        durationSec,
        coverPath: album?.coverPath ?? coverPath,
        ownerId,
      },
    });

    if (common?.genre?.length) {
      await this.upsertGenres(track.id, common.genre);
    }

    const key = `tracks/${track.id}.mp3`;
    await this.r2.uploadBuffer(key, buffer);
    return this.prisma.track.update({
      where: { id: track.id },
      data: { r2Key: key },
      include: { artist: true, album: true },
    });
  }

  /** Sobe o MP3 pro R2 (se configurado) e grava a key no Track — streaming passa a servir de lá. */
  private async uploadToR2(trackId: string, filePath: string) {
    if (!this.r2.isEnabled) return;
    try {
      const key = `tracks/${trackId}.mp3`;
      await this.r2.uploadFile(key, filePath);
      await this.prisma.track.update({ where: { id: trackId }, data: { r2Key: key } });
    } catch (err) {
      this.logger.warn(`Falha ao subir ${filePath} pro R2: ${(err as Error).message}`);
    }
  }
}
