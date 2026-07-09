import { describe, expect, it } from 'vitest';
import { calculateStars, createDefaultSave, isTargetClearedByFall, resolveShotScore, updateLevelProgress } from '../src/game/rules';
import type { LevelDefinition } from '../src/game/types';

const level: LevelDefinition = {
  id: 1,
  name: '糖果木塔',
  shots: 4,
  starScores: [1000, 1800, 2600],
  targets: [{ id: 'jar-1', x: 780, y: 645 }],
  blocks: [],
};

describe('slingshot game rules', () => {
  it('calculates stars from score thresholds', () => {
    expect(calculateStars(level, 400)).toBe(0);
    expect(calculateStars(level, 1000)).toBe(1);
    expect(calculateStars(level, 2100)).toBe(2);
    expect(calculateStars(level, 3200)).toBe(3);
  });

  it('scores target hits, broken blocks, and unused shots', () => {
    expect(resolveShotScore({ targetsCleared: 1, blocksBroken: 5, shotsLeft: 2 })).toBe(1900);
  });

  it('clears targets that have fallen off their tower', () => {
    expect(isTargetClearedByFall(760)).toBe(false);
    expect(isTargetClearedByFall(835)).toBe(true);
  });

  it('creates a local save with only level 1 unlocked', () => {
    const save = createDefaultSave([level, { ...level, id: 2 }]);

    expect(save.version).toBe(1);
    expect(save.lastUnlockedLevel).toBe(1);
    expect(save.levels[1]).toEqual({ unlocked: true, stars: 0, bestScore: 0 });
    expect(save.levels[2]).toEqual({ unlocked: false, stars: 0, bestScore: 0 });
  });

  it('updates best score, stars, and unlocks the next level after a win', () => {
    const save = createDefaultSave([level, { ...level, id: 2 }]);

    const updated = updateLevelProgress(save, [level, { ...level, id: 2 }], 1, 2200, 2);

    expect(updated.levels[1]).toEqual({ unlocked: true, stars: 2, bestScore: 2200 });
    expect(updated.levels[2]?.unlocked).toBe(true);
    expect(updated.lastUnlockedLevel).toBe(2);
  });
});
