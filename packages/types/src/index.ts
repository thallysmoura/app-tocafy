export type Track = {
  id: string;
  title: string;
  artistId: string | null;
  artistName: string;
  albumId: string | null;
  albumTitle: string | null;
  durationSec: number | null;
  coverUrl: string | null;
  addedAt: string;
};

export type Artist = {
  id: string;
  name: string;
};

export type Album = {
  id: string;
  title: string;
  artistId: string;
  coverUrl: string | null;
};

export type Playlist = {
  id: string;
  name: string;
  isPublic: boolean;
  ownerId: string;
  trackCount: number;
  createdAt: string;
};

export type PlaylistDetail = Playlist & {
  tracks: Track[];
};

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  mustChangePassword: boolean;
};

export type RepeatMode = 'off' | 'repeat-all' | 'repeat-one';
