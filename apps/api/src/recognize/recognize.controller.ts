import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { RecognizeService } from './recognize.service';

// ~12s de áudio comprimido (webm/opus) já é generoso — corta qualquer upload
// anormalmente grande antes de gastar CPU transcodificando.
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

@UseGuards(AuthGuard('jwt'))
@Controller('recognize')
export class RecognizeController {
  constructor(private readonly recognize: RecognizeService) {}

  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_AUDIO_BYTES } }))
  async identify(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException('Envie um trecho de áudio no campo "file".');
    return this.recognize.identify(file.buffer);
  }
}
