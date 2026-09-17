'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.mustChangePassword && pathname !== '/profile') {
      router.replace('/profile');
    }
  }, [loading, user, pathname, router]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-muted">Carregando...</div>;
  }

  if (!user) return null;

  return <>{children}</>;
}
