import { Music2 } from 'lucide-react';

export default function CoverArt({
  src,
  size = 40,
  className = '',
}: {
  src: string | null;
  size?: number;
  className?: string;
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
      className={`flex flex-shrink-0 items-center justify-center rounded bg-elevatedhover text-muted ${className}`}
    >
      <Music2 size={Math.round(size * 0.5)} />
    </div>
  );
}
