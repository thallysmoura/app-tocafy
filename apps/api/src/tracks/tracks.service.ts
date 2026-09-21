import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const includeRelations = { artist: true, album: true } as const;

@Injectable()
export class TracksService {
  constructor(private readonly prisma: PrismaService) {}

  // Biblioteca é por conta — cada usuário só vê o que ele mesmo importou
  // (upload, YouTube) ou, no caso do admin, o que já veio do scan do disco.
  findAll(ownerId: string) {
    return this.prisma.track.findMany({
      where: { ownerId },
      orderBy: { addedAt: 'desc' },
      include: includeRelations,
    });
  }

  search(q: string, ownerId: string) {
    const query = q.trim();
    if (!query) return this.findAll(ownerId);

    return this.prisma.track.findMany({
      where: {
        ownerId,
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

  /** Só devolve a faixa se pertencer a esse usuário — 404 pros dois casos
   * (não existe / não é sua) pra não vazar que o id é válido. */
  async findOneOrFail(id: string, ownerId: string) {
    const track = await this.prisma.track.findUnique({
      where: { id },
      include: includeRelations,
    });
    if (!track || track.ownerId !== ownerId) throw new NotFoundException('Faixa não encontrada');
    return track;
  }
}
