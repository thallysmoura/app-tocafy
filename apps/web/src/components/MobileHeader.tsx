'use client';

import Link from 'next/link';
import { User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function MobileHeader() {
  const { user } = useAuth();

  return (
    <header className="fixed inset-x-0 top-0 z-30 flex h-[calc(env(safe-area-inset-top)+3.5rem)] items-end justify-between bg-black px-4 pb-2 sm:hidden">
      <span className="text-sm font-bold text-white">Olá, {user?.displayName ?? ''}</span>
      <Link
        href="/profile"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-elevatedhover text-white"
        aria-label="Perfil"
      >
        <User size={20} />
      </Link>
    </header>
  );
}
