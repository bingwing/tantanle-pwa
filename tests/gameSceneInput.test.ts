import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('slingshot input binding', () => {
  it('keeps release handling persistent after the level-select pointerup', () => {
    const source = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8');

    expect(source).toContain("this.input.on('pointerup'");
    expect(source).not.toContain("this.input.once('pointerup'");
  });
});
