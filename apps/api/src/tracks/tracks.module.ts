import { Module } from '@nestjs/common';
import { TracksService } from './tracks.service';
import { TracksController } from './tracks.controller';
import { YoutubeDownloadService } from './youtube-download.service';
import { MeModule } from '../me/me.module';
import { LibraryModule } from '../library/library.module';

@Module({
  imports: [MeModule, LibraryModule],
  controllers: [TracksController],
  providers: [TracksService, YoutubeDownloadService],
  exports: [TracksService],
})
export class TracksModule {}
