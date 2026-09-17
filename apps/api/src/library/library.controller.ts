import { Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LibraryService } from './library.service';

@UseGuards(AuthGuard('jwt'))
@Controller('library')
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @Post('scan')
  scan() {
    return this.libraryService.scan();
  }
}
