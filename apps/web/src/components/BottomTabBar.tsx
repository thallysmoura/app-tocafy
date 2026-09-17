'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Library, ListMusic, UploadCloud } from 'lucide-react';

const TABS = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/search', label: 'Buscar', icon: Search },
  { href: '/library', label: 'Sua Biblioteca', icon: Library },
  { href: '/playlist/new', label: 'Playlist', icon: ListMusic },
  { href: '/upload', label: 'Upload', icon: UploadCloud },
];

export default function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-[calc(4rem+env(safe-area-inset-bottom))] items-center justify-around border-t border-elevatedhover bg-black pb-[env(safe-area-inset-bottom)] sm:hidden">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-1 text-[10px] font-semibold ${
              active ? 'text-white' : 'text-muted'
            }`}
          >
            <Icon size={20} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
