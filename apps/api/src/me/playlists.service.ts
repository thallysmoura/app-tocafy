import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlaylistsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string) {
    const playlists = await this.prisma.playlist.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { tracks: true } } },
    });
    return playlists.map((p) => ({
      id: p.id,
      name: p.name,
      isPublic: p.isPublic,
      ownerId: p.ownerId,
      createdAt: p.createdAt,
      trackCount: p._count.tracks,
    }));
  }

  create(userId: string, name: string, isPublic: boolean) {
    return this.prisma.playlist.create({
      data: { name, isPublic, ownerId: userId },
    });
  }

  private async getOwnedOrPublicOrFail(playlistId: string, userId: string) {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id: playlistId },
    });
    if (!playlist) throw new NotFoundException('Playlist não encontrada');
    if (!playlist.isPublic && playlist.ownerId !== userId) {
      throw new ForbiddenException('Playlist privada');
    }
    return playlist;
  }

  private async getOwnedOrFail(playlistId: string, userId: string) {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id: playlistId },
    });
    if (!playlist) throw new NotFoundException('Playlist não encontrada');
    if (playlist.ownerId !== userId) throw new ForbiddenException('Sem permissão');
    return playlist;
  }

  async getDetail(playlistId: string, userId: string) {
    const playlist = await this.getOwnedOrPublicOrFail(playlistId, userId);
    const entries = await this.prisma.playlistTrack.findMany({
      where: { playlistId },
      orderBy: { position: 'asc' },
      include: { track: { include: { artist: true, album: true } } },
    });
    return {
      id: playlist.id,
      name: playlist.name,
      isPublic: playlist.isPublic,
      ownerId: playlist.ownerId,
      tracks: entries.map((e) => e.track),
    };
  }

  async rename(playlistId: string, userId: string, name: string, isPublic?: boolean) {
    await this.getOwnedOrFail(playlistId, userId);
    return this.prisma.playlist.update({
      where: { id: playlistId },
      data: { name, ...(isPublic === undefined ? {} : { isPublic }) },
    });
  }

  async remove(playlistId: string, userId: string) {
    await this.getOwnedOrFail(playlistId, userId);
    await this.prisma.playlist.delete({ where: { id: playlistId } });
  }

  async addTrack(playlistId: string, userId: string, trackId: string) {
    await this.getOwnedOrFail(playlistId, userId);
    const track = await this.prisma.track.findUnique({ where: { id: trackId } });
    if (!track || track.ownerId !== userId) throw new NotFoundException('Faixa não encontrada');
    const last = await this.prisma.playlistTrack.findFirst({
      where: { playlistId },
      orderBy: { position: 'desc' },
    });
    const position = (last?.position ?? 0) + 1024;
    await this.prisma.playlistTrack.upsert({
      where: { playlistId_trackId: { playlistId, trackId } },
      create: { playlistId, trackId, position },
      update: {},
    });
  }

  async removeTrack(playlistId: string, userId: string, trackId: string) {
    await this.getOwnedOrFail(playlistId, userId);
    await this.prisma.playlistTrack
      .delete({ where: { playlistId_trackId: { playlistId, trackId } } })
      .catch(() => undefined);
  }

  /**
   * Reordena inserindo a faixa entre as duas vizinhas do novo índice (posição
   * fracionária). Só renumera tudo no raro caso de colisão de ponto flutuante.
   */
  async reorder(playlistId: string, userId: string, trackId: string, newIndex: number) {
    await this.getOwnedOrFail(playlistId, userId);
    const entries = await this.prisma.playlistTrack.findMany({
      where: { playlistId },
      orderBy: { position: 'asc' },
    });
    const others = entries.filter((e) => e.trackId !== trackId);
    const clampedIndex = Math.max(0, Math.min(newIndex, others.length));

    const before = others[clampedIndex - 1];
    const after = others[clampedIndex];

    let position: number;
    if (!before && !after) position = 1024;
    else if (!before) position = after.position / 2;
    else if (!after) position = before.position + 1024;
    else position = (before.position + after.position) / 2;

    if (before && after && after.position - before.position < 0.0001) {
      await this.renumber(playlistId);
      return this.reorder(playlistId, userId, trackId, newIndex);
    }

    await this.prisma.playlistTrack.update({
      where: { playlistId_trackId: { playlistId, trackId } },
      data: { position },
    });
  }

  private async renumber(playlistId: string) {
    const entries = await this.prisma.playlistTrack.findMany({
      where: { playlistId },
      orderBy: { position: 'asc' },
    });
    await this.prisma.$transaction(
      entries.map((e, index) =>
        this.prisma.playlistTrack.update({
          where: { playlistId_trackId: { playlistId, trackId: e.trackId } },
          data: { position: (index + 1) * 1024 },
        }),
      ),
    );
  }
}
