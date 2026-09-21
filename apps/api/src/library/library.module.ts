import { Module } from '@nestjs/common';
import { LibraryService } from './library.service';
import { LibraryController } from './library.controller';
import { PushModule } from '../push/push.module';
import { AdminGuard } from '../auth/admin.guard';

@Module({
  imports: [PushModule],
  controllers: [LibraryController],
  providers: [LibraryService, AdminGuard],
  exports: [LibraryService],
})
export class LibraryModule {}
