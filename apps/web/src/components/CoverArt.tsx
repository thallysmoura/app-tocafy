import { Music2 } from 'lucide-react';

// Gradientes vivos pro placeholder de capa — evita a mesma cor cinza padrão
// se repetindo em toda faixa sem capa numa lista.
const PALETTE = [
  'from-pink-500 to-rose-600',
  'from-orange-500 to-amber-600',
  'from-yellow-500 to-lime-600',
  'from-green-500 to-emerald-600',
  'from-teal-500 to-cyan-600',
  'from-sky-500 to-blue-600',
  'from-indigo-500 to-violet-600',
  'from-purple-500 to-fuchsia-600',
  'from-red-500 to-orange-600',
];

function paletteFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export default function CoverArt({
  src,
  size = 40,
  className = '',
  seed = '',
}: {
  src: string | null;
  size?: number;
  className?: string;
  /** ID/título da faixa — usado pra escolher uma cor consistente pro placeholder. */
  seed?: string;
}) {
  const dimension = `${size}px`;

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        style={{ width: dimension, height: dimension }}
        className={`flex-shrink-0 rounded object-cover ${className}`}
      />
    );
  }

  return (
    <div
      style={{ width: dimension, height: dimension }}
      className={`flex flex-shrink-0 items-center justify-center rounded bg-gradient-to-br text-white/90 ${paletteFor(seed)} ${className}`}
    >
      <Music2 size={Math.round(size * 0.5)} />
    </div>
  );
}
