import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveCelebrationBonus } from '../src/game/rules';

describe('celebration feedback', () => {
  it('rewards target clears and big blasts with candy fireworks', () => {
    expect(resolveCelebrationBonus('target-clear')).toEqual({ score: 320, particles: 72, shake: 0.014 });
    expect(resolveCelebrationBonus('big-blast')).toEqual({ score: 180, particles: 56, shake: 0.012 });
  });

  it('uses a dedicated candy firework feedback hook in the game scene', () => {
    const source = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8');

    expect(source).toContain('celebrateImpact');
    expect(source).toContain('candy-firework');
    expect(source).toContain('resolveCelebrationBonus(kind)');
    expect(source).toContain("this.celebrateImpact(sprite.x, sprite.y, 'target-clear')");
    expect(source).toContain("this.celebrateImpact(bomb.x, bomb.y, 'big-blast')");
    expect(source).toContain("this.celebrateImpact(x, y, 'big-blast')");
  });
});
