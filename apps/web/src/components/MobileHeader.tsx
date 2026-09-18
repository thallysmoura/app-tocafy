'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, User as UserIcon, UploadCloud, LogOut, Shield, Mic, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function MobileHeader() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  // Trava o scroll do fundo enquanto a sidebar está aberta.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-30 flex h-[calc(env(safe-area-inset-top)+3.5rem)] items-end justify-between bg-black px-4 pb-2 sm:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMenuOpen(true)}
            className="flex h-9 w-9 items-center justify-center text-white"
            aria-label="Abrir menu"
          >
            <Menu size={22} />
          </button>
          <span className="text-sm font-bold text-white">Olá, {user?.displayName ?? ''}</span>
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

      {/* Backdrop — fecha ao tocar fora, some com fade junto da sidebar. */}
      <div
        onClick={() => setMenuOpen(false)}
        className={`fixed inset-0 z-40 bg-black/70 transition-opacity duration-300 sm:hidden ${
          menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Sidebar deslizante estilo Spotify mobile — ocupa a maior parte da
          largura, desliza da esquerda por cima de tudo. */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[82%] max-w-80 flex-col bg-elevated pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] shadow-2xl transition-transform duration-300 ease-out sm:hidden ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 pb-4 pt-5">
          <Link
            href="/profile"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-3"
          >
            <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-elevatedhover text-white">
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <UserIcon size={22} />
              )}
            </span>
            <span className="text-base font-bold text-white">{user?.displayName ?? ''}</span>
          </Link>
          <button
            onClick={() => setMenuOpen(false)}
            className="flex h-9 w-9 items-center justify-center text-white"
            aria-label="Fechar menu"
          >
            <X size={22} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col overflow-y-auto py-2">
          <Link
            href="/profile"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-4 px-5 py-3.5 text-base font-semibold text-white hover:bg-elevatedhover"
          >
            <UserIcon size={20} /> Perfil
          </Link>
          <Link
            href="/upload"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-4 px-5 py-3.5 text-base font-semibold text-white hover:bg-elevatedhover"
          >
            <UploadCloud size={20} /> Upload de música
          </Link>
          <Link
            href="/identify"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-4 px-5 py-3.5 text-base font-semibold text-white hover:bg-elevatedhover"
          >
            <Mic size={20} /> Identificar Música
          </Link>
          <Link
            href="/profile/access-log"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-4 px-5 py-3.5 text-base font-semibold text-white hover:bg-elevatedhover"
          >
            <Shield size={20} /> Log de acesso
          </Link>
        </nav>

        <button
          onClick={() => {
            setMenuOpen(false);
            logout();
          }}
          className="flex items-center gap-4 border-t border-elevatedhover px-5 py-4 text-base font-semibold text-red-400 hover:bg-elevatedhover"
        >
          <LogOut size={20} /> Sair da conta
        </button>
      </aside>
    </>
  );
}
