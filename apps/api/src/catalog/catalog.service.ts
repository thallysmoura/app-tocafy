import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  listArtists() {
    return this.prisma.artist.findMany({ orderBy: { name: 'asc' } });
  }

  async getArtist(id: string) {
    const artist = await this.prisma.artist.findUnique({
      where: { id },
      include: {
        albums: { orderBy: { title: 'asc' } },
        tracks: { include: { album: true }, orderBy: { title: 'asc' } },
      },
    });
    if (!artist) throw new NotFoundException('Artista não encontrado');
    return artist;
  }

  async getAlbum(id: string) {
    const album = await this.prisma.album.findUnique({
      where: { id },
      include: {
        artist: true,
        tracks: { orderBy: { title: 'asc' } },
      },
    });
    if (!album) throw new NotFoundException('Álbum não encontrado');
    return album;
  }
}
