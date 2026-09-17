import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CatalogService } from './catalog.service';

@UseGuards(AuthGuard('jwt'))
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('artists')
  listArtists() {
    return this.catalog.listArtists();
  }

  @Get('artists/:id')
  getArtist(@Param('id') id: string) {
    return this.catalog.getArtist(id);
  }

  @Get('albums/:id')
  getAlbum(@Param('id') id: string) {
    return this.catalog.getAlbum(id);
  }
}
