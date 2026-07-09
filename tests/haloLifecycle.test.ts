import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('shot halo lifecycle', () => {
  it('does not keep reading a ball position after the ball is destroyed', () => {
    const source = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8');

    expect(source).toContain('activeBallHalo');
    expect(source).toContain('clearShotHalo');
    expect(source).not.toContain('onUpdate: () => halo.setPosition(ball.x, ball.y)');
  });
});
