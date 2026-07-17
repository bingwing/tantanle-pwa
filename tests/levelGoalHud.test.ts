import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('level goal and star chase HUD', () => {
  it('tracks real shots and renders accessible goal progress', () => {
    const source = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8');

    expect(source).toContain('private shotsUsed = 0;');
    expect(source).toContain('this.shotsUsed += 1;');
    expect(source).toContain('objectiveText');
    expect(source).toContain('starProgressGraphics');
    expect(source).toContain('resolveStarProgress');
    expect(source).toContain('progress.milestoneText');
    expect(source).toContain('目标 ${this.targetsCleared}/${this.level.targets.length}');
    expect(source).toContain('shotsUsed: this.shotsUsed');
    expect(source).toContain('targetsCleared: this.targetsCleared');
    expect(source).toContain('totalTargets: this.level.targets.length');
  });

  it('does not derive real shot count from sugar-rush extra balls', () => {
    const source = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8');
    const sugarRush = source.slice(source.indexOf('private triggerSugarRush'), source.indexOf('private showScorePop'));

    expect(sugarRush).toContain('this.shotsLeft += reward.extraShots;');
    expect(sugarRush).not.toContain('shotsUsed');
  });
});
