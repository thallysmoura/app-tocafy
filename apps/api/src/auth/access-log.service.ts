import { Injectable, Logger } from '@nestjs/common';
import { UAParser } from 'ua-parser-js';
import { PrismaService } from '../prisma/prisma.service';

type RecordAttemptInput = {
  email: string;
  success: boolean;
  userId?: string;
  ip: string | null;
  userAgent: string | null;
  latitude?: number;
  longitude?: number;
  type?: 'login' | 'resume';
};

const FAILED_ATTEMPTS_WINDOW_MS = 15 * 60 * 1000;
const FAILED_ATTEMPTS_LIMIT = 8;

@Injectable()
export class AccessLogService {
  private readonly logger = new Logger(AccessLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Reverse geocoding gratuito via Nominatim (OpenStreetMap) — sem chave de
   * API, só exige um User-Agent identificável e respeitar ~1 req/s. */
  private async reverseGeocode(latitude: number, longitude: number) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=10`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Tocafy/1.0 (thallysmouraof@gmail.com)' },
      });
      if (!res.ok) return { city: null, country: null };
      const data = (await res.json()) as {
        address?: { city?: string; town?: string; village?: string; municipality?: string; country?: string };
      };
      const a = data.address ?? {};
      return {
        city: a.city ?? a.town ?? a.village ?? a.municipality ?? null,
        country: a.country ?? null,
      };
    } catch (err) {
      this.logger.warn(`Reverse geocode falhou: ${(err as Error).message}`);
      return { city: null, country: null };
    }
  }

  /** Quantas tentativas falhas recentes pra esse e-mail — usado pra bloquear
   * força-bruta mesmo dentro do limite geral do @Throttle. */
  async recentFailedCount(email: string): Promise<number> {
    return this.prisma.accessLog.count({
      where: {
        email: email.toLowerCase(),
        success: false,
        createdAt: { gte: new Date(Date.now() - FAILED_ATTEMPTS_WINDOW_MS) },
      },
    });
  }

  isLockedOut(recentFailedCount: number) {
    return recentFailedCount >= FAILED_ATTEMPTS_LIMIT;
  }

  async record(input: RecordAttemptInput) {
    let city: string | null = null;
    let country: string | null = null;
    if (input.latitude != null && input.longitude != null) {
      const geo = await this.reverseGeocode(input.latitude, input.longitude);
      city = geo.city;
      country = geo.country;
    }

    let browser: string | null = null;
    let os: string | null = null;
    let deviceType: string | null = null;
    let engine: string | null = null;
    let deviceVendor: string | null = null;
    let deviceModel: string | null = null;
    let cpuArch: string | null = null;
    if (input.userAgent) {
      const parsed = new UAParser(input.userAgent).getResult();
      browser = parsed.browser.name ? `${parsed.browser.name} ${parsed.browser.version ?? ''}`.trim() : null;
      os = parsed.os.name ? `${parsed.os.name} ${parsed.os.version ?? ''}`.trim() : null;
      deviceType = parsed.device.type ?? 'desktop';
      engine = parsed.engine.name ? `${parsed.engine.name} ${parsed.engine.version ?? ''}`.trim() : null;
      deviceVendor = parsed.device.vendor ?? null;
      deviceModel = parsed.device.model ?? null;
      cpuArch = parsed.cpu.architecture ?? null;
    }

    await this.prisma.accessLog.create({
      data: {
        email: input.email.toLowerCase(),
        success: input.success,
        type: input.type ?? 'login',
        userId: input.userId,
        ip: input.ip,
        userAgent: input.userAgent,
        latitude: input.latitude,
        longitude: input.longitude,
        city,
        country,
        browser,
        os,
        deviceType,
        engine,
        deviceVendor,
        deviceModel,
        cpuArch,
      },
    });
  }

  list(userId: string, limit = 50) {
    return this.prisma.accessLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
