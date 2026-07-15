import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('stable level startup', () => {
  it('keeps destructible bodies fixed until a local impact releases them', () => {
    const gameSource = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8');

    expect(gameSource).toContain("isStatic: true,\n        label: `block:${block.id}`,");
    expect(gameSource).toContain("isStatic: true,\n        label: `target:${target.id}`,");
    expect(gameSource).toContain('sprite.setRectangle(block.width, block.height, blockBody);');
    expect(gameSource).toContain('sprite.setCircle(33, targetBody);');
    expect(gameSource).toContain('ball.setCircle(34, ballBody);');
    expect(gameSource).toContain('private releaseImpactArea');
    expect(gameSource).toContain('this.releaseImpactArea(ball.x, ball.y);');
    expect(gameSource).toContain('this.releaseImpactArea(x, y, radius);');
  });
});
