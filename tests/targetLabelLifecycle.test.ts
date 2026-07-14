import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('target label lifecycle', () => {
  it('keeps dynamic target labels attached and removes them with the target', () => {
    const source = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8');

    expect(source).toContain('label: Phaser.GameObjects.Text');
    expect(source).toContain('target.label.setPosition(target.sprite.x');
    expect(source).toContain('target.label.destroy()');
  });

  it('stops target tweens before destroying its Matter body', () => {
    const source = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8');

    expect(source).toContain('this.tweens.killTweensOf(sprite);\n    target.label.destroy()');
  });
});
