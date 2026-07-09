import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/game/levels';
import { resolveBombBlast, resolveCollectibleScore, resolveComboBonus, resolveShotBlast } from '../src/game/rules';

describe('play elements that make shots more satisfying', () => {
  it('adds collectible stars and frosting bombs to early levels', () => {
    expect(LEVELS[0].collectibles?.length).toBeGreaterThanOrEqual(1);
    expect(LEVELS[1].hazards?.some((hazard) => hazard.kind === 'frosting-bomb')).toBe(true);
  });

  it('scores collectibles, combos, and blast radius predictably', () => {
    expect(resolveCollectibleScore('star')).toBe(500);
    expect(resolveComboBonus(1)).toBe(0);
    expect(resolveComboBonus(3)).toBe(450);
    expect(resolveBombBlast('frosting-bomb')).toEqual({ radius: 168, force: 0.028, score: 350 });
    expect(resolveShotBlast('blast')).toEqual({ radius: 132, force: 0.02, score: 260 });
    expect(resolveShotBlast('classic')).toEqual({ radius: 0, force: 0, score: 0 });
  });
});
