import { describe, expect, it } from 'vitest';
import { canonicalOrder, computeNextIndex, computePrevIndex, shuffleKeepingCurrent } from './queue';

describe('shuffleKeepingCurrent', () => {
  it('mantém a faixa atual na primeira posição', () => {
    const queue = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
    const shuffled = shuffleKeepingCurrent(queue, 'c');
    expect(shuffled[0].id).toBe('c');
    expect(shuffled.map((t) => t.id).sort()).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('computeNextIndex', () => {
  it('avança normalmente dentro da fila', () => {
    expect(computeNextIndex(0, 3, 'off')).toBe(1);
  });

  it('para no fim da fila sem repeat', () => {
    expect(computeNextIndex(2, 3, 'off')).toBeNull();
  });

  it('volta ao início com repeat-all', () => {
    expect(computeNextIndex(2, 3, 'repeat-all')).toBe(0);
  });

  it('repete a mesma faixa com repeat-one', () => {
    expect(computeNextIndex(1, 3, 'repeat-one')).toBe(1);
  });
});

describe('computePrevIndex', () => {
  it('volta uma posição', () => {
    expect(computePrevIndex(2, 'off')).toBe(1);
  });

  it('retorna null no início sem repeat', () => {
    expect(computePrevIndex(0, 'off')).toBeNull();
  });
});

describe('canonicalOrder', () => {
  it('restaura a ordem original a partir dos ids canônicos', () => {
    const queue = [{ id: 'b' }, { id: 'a' }, { id: 'c' }] as any;
    const result = canonicalOrder(queue, ['a', 'b', 'c']);
    expect(result.map((t: any) => t.id)).toEqual(['a', 'b', 'c']);
  });
});
