import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { TracksModule } from './tracks/tracks.module';
import { CatalogModule } from './catalog/catalog.module';
import { LibraryModule } from './library/library.module';
import { PushModule } from './push/push.module';
import { MeModule } from './me/me.module';
import { HealthModule } from './health/health.module';
import { AudiusModule } from './audius/audius.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    RedisModule,
    StorageModule,
    PrismaModule,
    AuthModule,
    MeModule,
    TracksModule,
    CatalogModule,
    LibraryModule,
    PushModule,
    HealthModule,
    AudiusModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
