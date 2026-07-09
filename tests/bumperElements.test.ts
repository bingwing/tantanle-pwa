import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/game/levels';
import { resolveBumperHit } from '../src/game/rules';

describe('bounce pad play elements', () => {
  it('adds visible bounce pads to early levels', () => {
    expect(LEVELS[2].bumpers?.some((bumper) => bumper.kind === 'bounce-pad')).toBe(true);
    expect(LEVELS[5].bumpers?.length).toBeGreaterThanOrEqual(1);
  });

  it('scores and boosts a bounce pad hit predictably', () => {
    expect(resolveBumperHit('bounce-pad')).toEqual({ impulse: 12.8, score: 220, cooldownMs: 260 });
  });
});
