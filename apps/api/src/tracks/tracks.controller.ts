import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsString, IsUrl } from 'class-validator';
import { Response } from 'express';
import * as fs from 'fs';
import { TracksService } from './tracks.service';
import { LikesService } from '../me/likes.service';
import { CurrentUserId } from '../auth/current-user.decorator';
import { R2Service } from '../storage/r2.service';
import { LibraryService } from '../library/library.service';
import { YoutubeDownloadService } from './youtube-download.service';

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

class DownloadYoutubeDto {
  @IsString()
  @IsUrl({ require_protocol: true })
  url: string;
}

@UseGuards(AuthGuard('jwt'))
@Controller('tracks')
export class TracksController {
  constructor(
    private readonly tracksService: TracksService,
    private readonly likesService: LikesService,
    private readonly r2: R2Service,
    private readonly libraryService: LibraryService,
    private readonly youtubeDownload: YoutubeDownloadService,
  ) {}

  @Get()
  findAll() {
    return this.tracksService.findAll();
  }

  @Get('search')
  search(@Query('q') q = '') {
    return this.tracksService.search(q);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUserId() userId: string,
  ) {
    if (!file) throw new BadRequestException('Envie um arquivo no campo "file".');
    if (!file.originalname.toLowerCase().endsWith('.mp3')) {
      throw new BadRequestException('Só arquivos .mp3 são suportados.');
    }
    const track = await this.libraryService.importUploadedTrack(file.buffer, file.originalname);
    await this.likesService.like(userId, track.id);
    return track;
  }

  @Post('youtube')
  startFromYoutube(@Body() dto: DownloadYoutubeDto) {
    const jobId = this.youtubeDownload.startDownload(dto.url);
    return { jobId };
  }

  // Precisa vir antes de "youtube/:jobId" — senão o Nest casa "search" como
  // se fosse um jobId (rota com parâmetro registrada primeiro "engole" tudo).
  @Get('youtube/search')
  searchYoutube(@Query('q') q = '') {
    return this.youtubeDownload.search(q);
  }

  @Get('youtube/:jobId')
  async youtubeJobStatus(@Param('jobId') jobId: string, @CurrentUserId() userId: string) {
    const job = this.youtubeDownload.consumeJob(jobId);
    if (!job) throw new NotFoundException('Job não encontrado ou já expirado.');
    if (job.status === 'downloading') return { status: 'downloading', percent: job.percent };
    if (job.status === 'error') return { status: 'error', error: job.error };
    const track = await this.libraryService.importUploadedTrack(job.buffer, `${job.title}.mp3`);
    await this.likesService.like(userId, track.id);
    return { status: 'done', track };
  }

  @Get(':id/stream')
  async stream(
    @Param('id') id: string,
    @Res() res: Response,
    @CurrentUserId() userId: string,
  ) {
    const track = await this.tracksService.findOneOrFail(id);
    this.likesService.recordPlay(userId, track.id).catch(() => undefined);

    if (track.r2Key && this.r2.isEnabled) {
      const exists = await this.r2.objectExists(track.r2Key);
      if (!exists) {
        throw new NotFoundException('Arquivo de áudio indisponível.');
      }
      const url = await this.r2.getSignedStreamUrl(track.r2Key);
      res.redirect(302, url);
      return;
    }

    if (!fs.existsSync(track.filePath)) {
      throw new NotFoundException('Arquivo de áudio indisponível (faixa de demonstração sem áudio real)');
    }
    const stat = fs.statSync(track.filePath);
    const range = res.req.headers.range;

    if (!range) {
      res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Content-Length': stat.size,
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(track.filePath).pipe(res);
      return;
    }

    const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : stat.size - 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': 'audio/mpeg',
    });
    fs.createReadStream(track.filePath, { start, end }).pipe(res);
  }

  @Get(':id/cover')
  async cover(@Param('id') id: string, @Res() res: Response) {
    const track = await this.tracksService.findOneOrFail(id);
    if (!track.coverPath || !fs.existsSync(track.coverPath)) {
      throw new NotFoundException('Sem capa');
    }
    res.sendFile(track.coverPath);
  }
}
