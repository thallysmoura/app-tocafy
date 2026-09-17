'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Library, Heart, User, UploadCloud } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Logo from './Logo';

const NAV_GROUPS = [
  {
    title: 'Principais',
    items: [
      { href: '/', label: 'Início', icon: Home },
      { href: '/search', label: 'Buscar', icon: Search },
      { href: '/library', label: 'Biblioteca', icon: Library },
    ],
  },
  {
    title: 'Administrativo',
    items: [{ href: '/upload', label: 'Upload de música', icon: UploadCloud }],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <aside className="hidden w-64 flex-shrink-0 flex-col bg-black p-6 pb-24 sm:flex">
      <div className="mb-8 flex items-center gap-2 text-xl font-bold text-white">
        <Logo size={28} /> Tocafy
      </div>
      <nav className="flex flex-col gap-6 text-sm font-semibold">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="flex flex-col gap-3">
            <span className="px-3 text-xs font-bold uppercase tracking-wide text-muted">
              {group.title}
            </span>
            <div className="flex flex-col gap-4">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 ${active ? 'text-white' : 'text-muted hover:text-white'}`}
                  >
                    <Icon size={20} /> {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-8 border-t border-elevatedhover pt-4">
        <Link
          href="/"
          className="flex items-center gap-3 rounded bg-elevated p-3 text-white hover:bg-elevatedhover"
        >
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-gradient-to-br from-accent to-emerald-700">
            <Heart size={18} />
          </span>
          <div className="text-sm">
            <div className="font-semibold">Músicas Curtidas</div>
            <div className="text-xs text-muted">Sua coleção</div>
          </div>
        </Link>
      </div>
      <Link
        href="/profile"
        className="mt-auto flex items-center gap-3 pt-4 text-sm font-semibold text-muted hover:text-white"
      >
        {user?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
        ) : (
          <User size={20} />
        )}
        Perfil
      </Link>
    </aside>
  );
}
