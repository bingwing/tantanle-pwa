import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('slingshot interaction flow', () => {
  it('keeps the previous shot arc as a faint aiming guide', () => {
    const source = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8');

    expect(source).toContain('lastTrajectoryDots');
    expect(source).toContain('drawLastTrajectory');
    expect(source).toContain('recordLastTrajectory');
  });

  it('shows current candy ball type and next level action', () => {
    const gameSource = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8');
    const resultSource = readFileSync(new URL('../src/scenes/ResultScene.ts', import.meta.url), 'utf8');

    expect(gameSource).toContain('currentShotType');
    expect(gameSource).toContain('ballTypeText');
    expect(resultSource).toContain('下一关');
    expect(resultSource).toContain('nextLevelId');
  });
});
