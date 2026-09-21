import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  // Artista/álbum são entidades compartilhadas (upsert por nome), mas as
  // faixas listadas dentro deles precisam ficar restritas ao dono — senão
  // um usuário veria faixas de outro só por elas terem o mesmo artista.
  listArtists(ownerId: string) {
    return this.prisma.artist.findMany({
      where: { tracks: { some: { ownerId } } },
      orderBy: { name: 'asc' },
    });
  }

  async getArtist(id: string, ownerId: string) {
    const artist = await this.prisma.artist.findUnique({
      where: { id },
      include: {
        albums: { orderBy: { title: 'asc' } },
        tracks: { where: { ownerId }, include: { album: true }, orderBy: { title: 'asc' } },
      },
    });
    if (!artist) throw new NotFoundException('Artista não encontrado');
    return artist;
  }

  async getAlbum(id: string, ownerId: string) {
    const album = await this.prisma.album.findUnique({
      where: { id },
      include: {
        artist: true,
        tracks: { where: { ownerId }, orderBy: { title: 'asc' } },
      },
    });
    if (!album) throw new NotFoundException('Álbum não encontrado');
    return album;
  }
}
