'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

const AUTO_CLOSE_MS = 5000;

export default function ImportSuccessModal({
  trackTitle,
  onClose,
}: {
  trackTitle: string;
  onClose: () => void;
}) {
  const [remainingPct, setRemainingPct] = useState(100);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.max(0, 100 - (elapsed / AUTO_CLOSE_MS) * 100);
      setRemainingPct(pct);
      if (elapsed >= AUTO_CLOSE_MS) onClose();
    }, 50);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm overflow-hidden rounded-lg bg-elevated shadow-xl"
      >
        <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
          <CheckCircle2 size={48} className="text-accent" />
          <h2 className="text-lg font-bold text-white">Música importada</h2>
          <p className="text-sm text-muted">
            &quot;{trackTitle}&quot; já está na sua biblioteca e em Músicas Curtidas.
          </p>
          <button
            onClick={onClose}
            className="mt-2 w-full rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accenthover"
          >
            OK
          </button>
        </div>
        <div className="h-1 w-full bg-elevatedhover">
          <div
            className="h-full bg-accent"
            style={{ width: `${remainingPct}%`, transition: 'width 50ms linear' }}
          />
        </div>
      </div>
    </div>
  );
}
