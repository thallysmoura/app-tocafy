'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Menu, User as UserIcon, UploadCloud, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function MobileHeader() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  return (
    <header className="fixed inset-x-0 top-0 z-30 flex h-[calc(env(safe-area-inset-top)+3.5rem)] items-end justify-between bg-black px-4 pb-2 sm:hidden">
      <div className="relative flex items-center gap-3" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center text-white"
          aria-label="Mais opções"
        >
          <Menu size={22} />
        </button>
        <span className="text-sm font-bold text-white">Olá, {user?.displayName ?? ''}</span>

        {menuOpen && (
          <div className="absolute left-0 top-11 z-40 w-52 overflow-hidden rounded-lg bg-elevated shadow-xl">
            <Link
              href="/profile"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-white hover:bg-elevatedhover"
            >
              <UserIcon size={18} /> Perfil
            </Link>
            <Link
              href="/upload"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-white hover:bg-elevatedhover"
            >
              <UploadCloud size={18} /> Upload de música
            </Link>
            <button
              onClick={() => {
                setMenuOpen(false);
                logout();
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-red-400 hover:bg-elevatedhover"
            >
              <LogOut size={18} /> Sair da conta
            </button>
          </div>
        )}
      </div>

      <Link
        href="/profile"
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-elevatedhover text-white"
        aria-label="Perfil"
      >
        {user?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <UserIcon size={20} />
        )}
      </Link>
    </header>
  );
}
