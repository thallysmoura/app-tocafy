'use client';

import { useEffect, useState } from 'react';
import Logo from './Logo';

const VISIBLE_MS = 1100;
const FADE_MS = 350;

export default function SplashScreen() {
  const [phase, setPhase] = useState<'in' | 'out' | 'gone'>('in');

  useEffect(() => {
    const outTimer = setTimeout(() => setPhase('out'), VISIBLE_MS);
    const goneTimer = setTimeout(() => setPhase('gone'), VISIBLE_MS + FADE_MS);
    return () => {
      clearTimeout(outTimer);
      clearTimeout(goneTimer);
    };
  }, []);

  if (phase === 'gone') return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-base transition-opacity duration-[350ms] ${
        phase === 'out' ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <div className="animate-[splash-pop_0.5s_ease-out]">
        <Logo size={96} />
      </div>
    </div>
  );
}
