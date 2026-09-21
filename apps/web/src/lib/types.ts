export type Artist = { id: string; name: string };
export type Album = { id: string; title: string; artistId: string; coverPath: string | null };

export type Track = {
  id: string;
  title: string;
  filePath: string;
  artistId: string | null;
  artist: Artist | null;
  albumId: string | null;
  album: Album | null;
  durationSec: number | null;
  coverPath: string | null;
  addedAt: string;
};

export type Playlist = {
  id: string;
  name: string;
  isPublic: boolean;
  ownerId: string;
  createdAt: string;
  trackCount: number;
};

export type PlaylistDetail = {
  id: string;
  name: string;
  isPublic: boolean;
  ownerId: string;
  tracks: Track[];
};

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  mustChangePassword: boolean;
  isAdmin: boolean;
  avatarUrl: string | null;
  createdAt: string;
};

export type RepeatMode = 'off' | 'repeat-all' | 'repeat-one';
