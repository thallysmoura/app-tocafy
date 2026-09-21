import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LikesService {
  constructor(private readonly prisma: PrismaService) {}

  async like(userId: string, trackId: string) {
    const track = await this.prisma.track.findUnique({ where: { id: trackId } });
    if (!track || track.ownerId !== userId) throw new NotFoundException('Faixa não encontrada');
    await this.prisma.like.upsert({
      where: { userId_trackId: { userId, trackId } },
      create: { userId, trackId },
      update: {},
    });
    return { liked: true };
  }

  async unlike(userId: string, trackId: string) {
    await this.prisma.like
      .delete({ where: { userId_trackId: { userId, trackId } } })
      .catch(() => undefined);
    return { liked: false };
  }

  list(userId: string) {
    return this.prisma.like.findMany({
      where: { userId },
      orderBy: { likedAt: 'desc' },
      include: { track: { include: { artist: true, album: true } } },
    });
  }

  async recordPlay(userId: string, trackId: string) {
    await this.prisma.listeningHistory.create({ data: { userId, trackId } });
  }

  history(userId: string, limit = 50) {
    return this.prisma.listeningHistory.findMany({
      where: { userId },
      orderBy: { playedAt: 'desc' },
      take: limit,
      include: { track: { include: { artist: true, album: true } } },
    });
  }

  /** Ranking das faixas mais tocadas (conta linhas de ListeningHistory por
   * faixa) — top 1 é a mais repetida, como pedido. */
  async topPlayed(userId: string, limit = 10) {
    const grouped = await this.prisma.listeningHistory.groupBy({
      by: ['trackId'],
      where: { userId },
      _count: { trackId: true },
      orderBy: { _count: { trackId: 'desc' } },
      take: limit,
    });
    if (grouped.length === 0) return [];

    const tracks = await this.prisma.track.findMany({
      where: { id: { in: grouped.map((g) => g.trackId) } },
      include: { artist: true, album: true },
    });
    const trackById = new Map(tracks.map((t) => [t.id, t]));

    return grouped
      .map((g) => ({ track: trackById.get(g.trackId), playCount: g._count.trackId }))
      .filter((entry): entry is { track: NonNullable<typeof entry.track>; playCount: number } =>
        Boolean(entry.track),
      );
  }
}
