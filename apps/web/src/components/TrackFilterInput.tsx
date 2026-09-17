'use client';

import { Search } from 'lucide-react';

export default function TrackFilterInput({
  value,
  onChange,
  placeholder = 'Título ou artista',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative mb-4 max-w-md">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full bg-elevated py-2 pl-9 pr-4 text-sm text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
      />
    </div>
  );
}
