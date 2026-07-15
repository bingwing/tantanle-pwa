import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('fallen target clearance', () => {
  it('only clears jars that player-triggered physics released', () => {
    const source = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8');

    expect(source).toContain('released: boolean;');
    expect(source).toContain('released: false,');
    expect(source).toContain("target.kind === 'jar' && target.released && isTargetClearedByFall(target.sprite.y)");
    expect(source).toContain('target.released = true;\n        target.sprite.setStatic(false);');
  });
});
