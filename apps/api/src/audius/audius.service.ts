import { Injectable, NotFoundException } from '@nestjs/common';
import { sdk } from '@audius/sdk';

const audius = sdk({ appName: 'Tocafy' });

export type AudiusTrackResult = {
  id: string;
  title: string;
  artistName: string;
  artworkUrl: string | null;
  durationSec: number | null;
  source: 'audius';
};

@Injectable()
export class AudiusService {
  async search(query: string): Promise<AudiusTrackResult[]> {
    if (!query.trim()) return [];
    const { data } = await audius.tracks.searchTracks({ query });
    return (data ?? []).slice(0, 30).map((track) => ({
      id: track.id,
      title: track.title,
      artistName: track.user?.name ?? 'Artista desconhecido',
      artworkUrl: track.artwork?._480x480 ?? track.artwork?._150x150 ?? null,
      durationSec: track.duration ?? null,
      source: 'audius' as const,
    }));
  }

  async getStreamUrl(trackId: string): Promise<string> {
    const { data } = await audius.tracks.streamTrack({ trackId, noRedirect: true });
    if (!data) throw new NotFoundException('Faixa não encontrada no Audius');
    return data;
  }
}
