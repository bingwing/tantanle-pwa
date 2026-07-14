import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SUGAR_RUSH_COMBO_TARGET, resolveSugarRushReward } from '../src/game/rules';

describe('sugar rush reward', () => {
  it('awards one extra shot after four hits in the same shot', () => {
    expect(SUGAR_RUSH_COMBO_TARGET).toBe(4);
    expect(resolveSugarRushReward(3, false)).toEqual({ triggered: false, extraShots: 0, score: 0 });
    expect(resolveSugarRushReward(4, false)).toEqual({ triggered: true, extraShots: 1, score: 600 });
  });

  it('only awards sugar rush once per level', () => {
    expect(resolveSugarRushReward(8, true)).toEqual({ triggered: false, extraShots: 0, score: 0 });
  });

  it('connects the reward to a visible segmented meter and celebration', () => {
    const source = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8');

    expect(source).toContain('sugarRushMeter');
    expect(source).toContain('drawSugarRushMeter');
    expect(source).toContain('triggerSugarRush');
    expect(source).toContain('shotsLeft += reward.extraShots');
    expect(source).toContain('糖果狂热');
    expect(source).toContain('levelEnding');
    expect(source).toContain('this.time.delayedCall(900');
  });
});
