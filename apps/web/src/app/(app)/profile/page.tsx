'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/context/AuthContext';
import BackButton from '@/components/BackButton';
import { ApiError, api } from '@/lib/api';
import { changePasswordSchema, type ChangePasswordInput } from '@/lib/validation';
import { subscribeToPush } from '@/lib/push';

export default function ProfilePage() {
  const { user, changePassword, logout } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<'idle' | 'ok' | 'error' | 'unsupported'>('idle');

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
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao trocar senha');
    }
  }

  async function enableNotifications() {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushStatus('error');
        return;
      }
      const sub = await subscribeToPush();
      if (!sub) {
        setPushStatus('unsupported');
        return;
      }
      await api.post('/push/subscribe', sub);
      setPushStatus('ok');
    } catch {
      setPushStatus('error');
    }
  }

  return (
    <div className="mx-auto max-w-lg px-8 py-6">
      <div className="mb-2 flex items-center gap-3">
        <BackButton />
        <h1 className="text-3xl font-bold text-white">Perfil</h1>
      </div>
      <p className="mb-6 text-muted">{user?.email}</p>

      {user?.mustChangePassword && (
        <p className="mb-4 rounded bg-elevatedhover p-3 text-sm text-white">
          Por segurança, defina uma nova senha antes de continuar.
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mb-8 flex flex-col gap-3">
        <label className="text-sm text-muted">Senha atual</label>
        <input
          {...register('currentPassword')}
          type="password"
          className="rounded bg-elevated px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent"
        />
        {errors.currentPassword && (
          <p className="text-xs text-red-400">{errors.currentPassword.message}</p>
        )}

        <label className="text-sm text-muted">Nova senha</label>
        <input
          {...register('newPassword')}
          type="password"
          className="rounded bg-elevated px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent"
        />
        {errors.newPassword && <p className="text-xs text-red-400">{errors.newPassword.message}</p>}

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

      <div className="mb-8 rounded bg-elevated p-4">
        <h2 className="mb-2 font-semibold text-white">Notificações</h2>
        <p className="mb-3 text-sm text-muted">
          Receba um aviso quando uma nova faixa for adicionada à sua biblioteca.
        </p>
        <button
          onClick={enableNotifications}
          className="rounded-full bg-elevatedhover px-4 py-2 text-sm text-white hover:bg-accent"
        >
          Ativar notificações
        </button>
        {pushStatus === 'ok' && <p className="mt-2 text-sm text-accent">Ativado.</p>}
        {pushStatus === 'error' && (
          <p className="mt-2 text-sm text-red-400">Permissão negada ou falha ao ativar.</p>
        )}
        {pushStatus === 'unsupported' && (
          <p className="mt-2 text-sm text-muted">Push não suportado neste navegador.</p>
        )}
      </div>

      <button onClick={logout} className="text-sm text-muted hover:text-white">
        Sair da conta
      </button>
    </div>
  );
}
