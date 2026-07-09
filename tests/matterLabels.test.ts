import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('matter body labels', () => {
  it('reapplies labels after setCircle and setRectangle recreate physics bodies', () => {
    const source = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8');

    expect(source).toContain("sprite.body.label = `block:${block.id}`");
    expect(source).toContain("jar.body.label = `target:${target.id}`");
    expect(source).toContain("ball.body.label = 'ball'");
    expect(source).toContain("bumperBody.body.label = `bumper:${bumper.id}`");
  });
});
