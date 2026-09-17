'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Mail } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';
import { GeolocationDeniedError } from '@/lib/geolocation';
import { loginSchema, type LoginInput } from '@/lib/validation';
import Logo from '@/components/Logo';

const REMEMBERED_EMAIL_KEY = 'tocafy:remembered-email';

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
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
      if (err instanceof GeolocationDeniedError) setError(err.message);
      else setError(err instanceof ApiError ? err.message : 'Falha ao entrar');
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

          <p className="mt-1 text-center text-xs text-muted">
            Por segurança, pedimos sua localização para registrar o acesso.
          </p>
        </form>
      </div>
    </div>
  );
}
