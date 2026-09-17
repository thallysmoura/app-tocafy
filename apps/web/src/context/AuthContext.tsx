'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { signInWithGoogle } from '@/lib/firebase';
import { getCurrentPosition } from '@/lib/geolocation';
import type { AuthUser } from '@/lib/types';

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const me = await api.get<AuthUser>('/auth/me');
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(
    async (email: string, password: string, remember = true) => {
      // Segurança: login só é aceito com localização autorizada — se o
      // usuário negar ou o navegador não suportar, o erro sobe pro form.
      const { latitude, longitude } = await getCurrentPosition();
      const { user: loggedUser } = await api.post<{ user: AuthUser }>('/auth/login', {
        email,
        password,
        remember,
        latitude,
        longitude,
      });
      setUser(loggedUser);
      router.push(loggedUser.mustChangePassword ? '/profile' : '/');
    },
    [router],
  );

  const loginWithGoogle = useCallback(async () => {
    const idToken = await signInWithGoogle();
    const { user: loggedUser } = await api.post<{ user: AuthUser }>('/auth/google', { idToken });
    setUser(loggedUser);
    router.push(loggedUser.mustChangePassword ? '/profile' : '/');
  }, [router]);

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => undefined);
    setUser(null);
    router.push('/login');
  }, [router]);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const { user: updated } = await api.post<{ user: AuthUser }>('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setUser(updated);
    },
    [],
  );

  return (
    <AuthContext.Provider
      value={{ user, loading, login, loginWithGoogle, logout, changePassword, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de AuthProvider');
  return ctx;
}

export { ApiError };
