import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('split candy ball scene integration', () => {
  it('connects the split ball texture and one-tap ability to the game scene', () => {
    const bootSource = readFileSync(new URL('../src/scenes/BootScene.ts', import.meta.url), 'utf8');
    const gameSource = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8');

    expect(bootSource).toContain("'candy-ball-split'");
    expect(gameSource).toContain("split: 'candy-ball-split'");
    expect(gameSource).toContain('private splitActiveBall');
    expect(gameSource).toContain('resolveSplitShotVelocities');
    expect(gameSource).toContain("ability.kind === 'split'");
  });

  it('keeps each split ball in the Matter collision and cleanup lifecycle', () => {
    const gameSource = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8');

    expect(gameSource).toContain('private activeBalls = new Set<MatterImage>()');
    expect(gameSource).toContain('this.activeBalls.add(ball)');
    expect(gameSource).toContain('this.activeBalls.add(clone)');
    expect(gameSource).toContain('this.activeBalls.has(ball)');
    expect(gameSource).toContain('triggerPortal(id: string, ball: MatterImage)');
    expect(gameSource).toContain('triggerBumper(id: string, ball: MatterImage)');
    expect(gameSource).toContain('this.activeBalls.clear()');
  });
});
