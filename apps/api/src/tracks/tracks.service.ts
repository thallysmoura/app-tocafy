import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const includeRelations = { artist: true, album: true } as const;

@Injectable()
export class TracksService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.track.findMany({
      orderBy: { addedAt: 'desc' },
      include: includeRelations,
    });
  }

  search(q: string) {
    const query = q.trim();
    if (!query) return this.findAll();

    return this.prisma.track.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { artist: { name: { contains: query, mode: 'insensitive' } } },
          { album: { title: { contains: query, mode: 'insensitive' } } },
        ],
      },
      include: includeRelations,
      take: 50,
      orderBy: { addedAt: 'desc' },
    });
  }

  async findOneOrFail(id: string) {
    const track = await this.prisma.track.findUnique({
      where: { id },
      include: includeRelations,
    });
    if (!track) throw new NotFoundException('Faixa não encontrada');
    return track;
  }
}
