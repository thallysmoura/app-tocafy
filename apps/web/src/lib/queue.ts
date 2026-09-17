import type { RepeatMode, Track } from './types';

/** Fisher–Yates, mas mantém a faixa atual na posição 0 (é a que já está tocando). */
export function shuffleKeepingCurrent<T extends { id: string }>(
  queue: T[],
  currentId: string | null,
): T[] {
  const rest = queue.filter((t) => t.id !== currentId);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  const current = queue.find((t) => t.id === currentId);
  return current ? [current, ...rest] : rest;
}

/**
 * Calcula o próximo índice a tocar dado o modo de repeat/shuffle.
 * Retorna null quando a reprodução deve parar (fim da fila, sem repeat).
 */
export function computeNextIndex(
  currentIndex: number,
  queueLength: number,
  repeat: RepeatMode,
): number | null {
  if (queueLength === 0) return null;
  if (repeat === 'repeat-one') return currentIndex;

  const next = currentIndex + 1;
  if (next < queueLength) return next;
  if (repeat === 'repeat-all') return 0;
  return null;
}

export function computePrevIndex(currentIndex: number, repeat: RepeatMode): number | null {
  const prev = currentIndex - 1;
  if (prev >= 0) return prev;
  if (repeat === 'repeat-all') return null; // deixa o caller decidir ir pro fim
  return null;
}

export function canonicalOrder(queue: Track[], canonicalIds: string[]): Track[] {
  const byId = new Map(queue.map((t) => [t.id, t]));
  return canonicalIds.map((id) => byId.get(id)).filter((t): t is Track => Boolean(t));
}
