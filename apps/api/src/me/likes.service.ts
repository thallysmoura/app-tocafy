import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LikesService {
  constructor(private readonly prisma: PrismaService) {}

  async like(userId: string, trackId: string) {
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
}
