'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, LogOut, Settings, Shield } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import BackButton from '@/components/BackButton';
import { ApiError, api } from '@/lib/api';
import { changePasswordSchema, type ChangePasswordInput } from '@/lib/validation';

function formatMemberSince(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export default function ProfilePage() {
  const { user, changePassword, logout, refreshUser } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const forcePasswordChange = Boolean(user?.mustChangePassword);
  const passwordFormOpen = showPasswordForm || forcePasswordChange;

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarError(null);
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.upload('/auth/avatar', formData);
      await refreshUser();
    } catch (err) {
      setAvatarError(err instanceof ApiError ? err.message : 'Falha ao enviar a foto.');
    } finally {
      setAvatarUploading(false);
    }
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });

  async function onSubmit(data: ChangePasswordInput) {
    setError(null);
    setMessage(null);
    try {
      await changePassword(data.currentPassword, data.newPassword);
      setMessage('Senha atualizada.');
      reset();
      if (!forcePasswordChange) setShowPasswordForm(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao trocar senha');
    }
  }

  return (
    <div className="mx-auto max-w-lg px-8 py-6">
      <div className="mb-6 flex items-center gap-3">
        <BackButton />
        <h1 className="text-3xl font-bold text-white">Perfil</h1>
      </div>

      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="relative">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-elevated text-3xl font-bold text-white">
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="Sua foto de perfil" className="h-full w-full object-cover" />
            ) : (
              (user?.displayName?.[0] ?? '?').toUpperCase()
            )}
          </div>
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarUploading}
            className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white hover:bg-accenthover disabled:opacity-50"
            aria-label="Trocar foto de perfil"
          >
            <Camera size={16} />
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
        {avatarUploading && <p className="text-xs text-muted">Enviando foto...</p>}
        {avatarError && <p className="text-xs text-red-400">{avatarError}</p>}

        <p className="mt-2 text-muted">{user?.email}</p>
        {user?.createdAt && (
          <p className="text-xs text-muted">Membro desde {formatMemberSince(user.createdAt)}</p>
        )}
      </div>

      <div className="mb-6 rounded bg-elevated">
        <button
          onClick={() => setShowPasswordForm((v) => !v)}
          disabled={forcePasswordChange}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-white disabled:opacity-70"
        >
          <span className="flex items-center gap-2">
            <Settings size={16} />
            Alterar senha
          </span>
          <span className="text-xs text-muted">{passwordFormOpen ? 'ocultar' : 'abrir'}</span>
        </button>

        {passwordFormOpen && (
          <div className="border-t border-elevatedhover p-4">
            {forcePasswordChange && (
              <p className="mb-4 rounded bg-elevatedhover p-3 text-sm text-white">
                Por segurança, defina uma nova senha antes de continuar.
              </p>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
              <label className="text-sm text-muted">Senha atual</label>
              <input
                {...register('currentPassword')}
                type="password"
                className="rounded bg-elevatedhover px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent"
              />
              {errors.currentPassword && (
                <p className="text-xs text-red-400">{errors.currentPassword.message}</p>
              )}

              <label className="text-sm text-muted">Nova senha</label>
              <input
                {...register('newPassword')}
                type="password"
                className="rounded bg-elevatedhover px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent"
              />
              {errors.newPassword && (
                <p className="text-xs text-red-400">{errors.newPassword.message}</p>
              )}

              {message && <p className="text-sm text-accent">{message}</p>}
              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 rounded-full bg-accent py-3 font-semibold text-white hover:bg-accenthover disabled:opacity-50"
              >
                Trocar senha
              </button>
            </form>
          </div>
        )}
      </div>

      <Link
        href="/profile/access-log"
        className="mb-6 flex items-center gap-2 rounded bg-elevated px-4 py-3 text-sm font-semibold text-white hover:bg-elevatedhover"
      >
        <Shield size={16} />
        Log de acesso
      </Link>

      <button
        onClick={logout}
        className="flex items-center gap-2 text-sm font-semibold text-red-400 hover:text-red-300"
      >
        <LogOut size={16} />
        Sair da conta
      </button>
    </div>
  );
}
