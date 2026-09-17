'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Mail } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';
import { loginSchema, type LoginInput } from '@/lib/validation';
import Logo from '@/components/Logo';

const REMEMBERED_EMAIL_KEY = 'tocafy:remembered-email';

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleLogin() {
    setError(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // Usuário fechou o popup — não é erro, não mostra nada.
      } else {
        setError(err instanceof ApiError ? err.message : 'Falha ao entrar com Google.');
      }
    } finally {
      setGoogleLoading(false);
    }
  }
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    try {
      const remembered = window.localStorage.getItem(REMEMBERED_EMAIL_KEY);
      if (remembered) setValue('email', remembered);
    } catch {
      // localStorage indisponível — só não pré-preenche.
    }
  }, [setValue]);

  async function onSubmit(data: LoginInput) {
    setError(null);
    try {
      await login(data.email, data.password, rememberMe);
      try {
        if (rememberMe) window.localStorage.setItem(REMEMBERED_EMAIL_KEY, data.email);
        else window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      } catch {
        // ignora — não é crítico.
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao entrar');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#0f2a1a,_#0b0b0d_60%)] px-4">
      <div className="w-full max-w-sm rounded-xl bg-elevated p-8 shadow-2xl">
        <div className="mb-8 flex items-center justify-center gap-3">
          <Logo size={44} />
          <span className="text-2xl font-bold tracking-wide text-white">TOCAFY</span>
        </div>

        <h1 className="mb-6 text-center text-2xl font-bold text-white">Entrar para continuar.</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <div>
            <div className="relative">
              <input
                {...register('email')}
                type="email"
                placeholder="E-mail"
                autoComplete="email"
                className="w-full rounded bg-elevatedhover px-4 py-3 pr-10 text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <Mail size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
            </div>
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
          </div>

          <div>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="Senha"
                autoComplete="current-password"
                className="w-full rounded bg-elevatedhover px-4 py-3 pr-10 text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
            )}
          </div>

          <label className="mt-1 flex items-center justify-between text-sm text-muted">
            <span>Lembrar de mim</span>
            <button
              type="button"
              role="switch"
              aria-checked={rememberMe}
              onClick={() => setRememberMe((v) => !v)}
              className={`h-6 w-11 rounded-full transition-colors ${rememberMe ? 'bg-accent' : 'bg-elevatedhover'}`}
            >
              <span
                className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform ${rememberMe ? 'translate-x-5' : ''}`}
              />
            </button>
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-3 rounded-full bg-white py-3 font-bold tracking-wide text-black hover:bg-gray-200 disabled:opacity-50"
          >
            {isSubmitting ? 'ENTRANDO...' : 'ENTRAR'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-muted">
          <div className="h-px flex-1 bg-elevatedhover" />
          ou
          <div className="h-px flex-1 bg-elevatedhover" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="flex w-full items-center justify-center gap-3 rounded-full bg-white py-3 font-semibold text-black hover:bg-gray-200 disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62Z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18Z"
            />
            <path
              fill="#FBBC05"
              d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33Z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58Z"
            />
          </svg>
          {googleLoading ? 'Entrando...' : 'Entrar com Google'}
        </button>
      </div>
    </div>
  );
}
