import { Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LibraryService } from './library.service';
import { AdminGuard } from '../auth/admin.guard';

@UseGuards(AuthGuard('jwt'), AdminGuard)
@Controller('library')
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @Post('scan')
  scan() {
    return this.libraryService.scan();
  }
}
