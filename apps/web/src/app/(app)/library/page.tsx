'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, ListMusic, Plus, UploadCloud } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import BackButton from '@/components/BackButton';
import type { Playlist, Track } from '@/lib/types';

export default function LibraryPage() {
  const [name, setName] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: playlists, isLoading } = useQuery({
    queryKey: ['playlists'],
    queryFn: () => api.get<Playlist[]>('/playlists'),
  });

  const createPlaylist = useMutation({
    mutationFn: (playlistName: string) => api.post<Playlist>('/playlists', { name: playlistName }),
    onSuccess: () => {
      setName('');
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });

  const uploadTrack = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.upload<Track>('/tracks/upload', formData);
    },
    onSuccess: (track) => {
      setUploadError(null);
      setUploadedName(track.title);
      queryClient.invalidateQueries({ queryKey: ['search'] });
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
    },
    onError: (err) => {
      setUploadedName(null);
      setUploadError(err instanceof ApiError ? err.message : 'Falha ao enviar a música.');
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadedName(null);
    setUploadError(null);
    uploadTrack.mutate(file);
  }

  return (
    <div className="px-8 py-6">
      <div className="mb-6 flex items-center gap-3">
        <BackButton />
        <h1 className="text-3xl font-bold text-white">Sua biblioteca</h1>
      </div>

      <div className="mb-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/mpeg,.mp3"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadTrack.isPending}
          className="flex items-center gap-2 rounded-full bg-elevated px-4 py-2 text-sm font-semibold text-white hover:bg-elevatedhover disabled:opacity-50"
        >
          <UploadCloud size={16} />
          {uploadTrack.isPending ? 'Enviando...' : 'Enviar música do computador'}
        </button>
        {uploadedName && (
          <p className="mt-2 text-sm text-accent">&quot;{uploadedName}&quot; enviada com sucesso.</p>
        )}
        {uploadError && <p className="mt-2 text-sm text-red-400">{uploadError}</p>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) createPlaylist.mutate(name.trim());
        }}
        className="mb-6 flex gap-2"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da nova playlist"
          className="flex-1 max-w-sm rounded bg-elevated px-4 py-2 text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          type="submit"
          disabled={createPlaylist.isPending}
          className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accenthover disabled:opacity-50"
        >
          <Plus size={16} /> Criar
        </button>
      </form>

      {!isLoading && (playlists?.length ?? 0) === 0 && (
        <p className="text-muted">Nenhuma playlist ainda. Crie a primeira acima.</p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        <Link
          href="/"
          className="rounded bg-elevated p-4 hover:bg-elevatedhover"
        >
          <div className="mb-3 flex h-24 items-center justify-center rounded bg-gradient-to-br from-accent to-emerald-700">
            <Heart size={32} />
          </div>
          <div className="truncate font-medium text-white">Músicas Curtidas</div>
          <div className="text-xs text-muted">Sua coleção</div>
        </Link>
        {isLoading &&
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded bg-elevated p-4">
              <div className="mb-3 h-24 animate-pulse rounded bg-elevatedhover" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-elevatedhover" />
            </div>
          ))}
        {playlists?.map((p) => (
          <Link
            key={p.id}
            href={`/playlist/${p.id}`}
            className="rounded bg-elevated p-4 hover:bg-elevatedhover"
          >
            <div className="mb-3 flex h-24 items-center justify-center rounded bg-elevatedhover text-accent">
              <ListMusic size={32} />
            </div>
            <div className="truncate font-medium text-white">{p.name}</div>
            <div className="text-xs text-muted">{p.trackCount} faixa(s)</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
