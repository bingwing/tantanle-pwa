import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('collectible lifecycle', () => {
  it('stops collectible tweens before destroying collected stars', () => {
    const source = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8');

    expect(source).toContain('this.tweens.killTweensOf(star)');
    expect(source).toContain('star.destroy()');
  });
});
