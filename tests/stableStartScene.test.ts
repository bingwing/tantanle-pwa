import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('stable level startup', () => {
  it('settles destructible bodies before freezing the world and spawning the first ball', () => {
    const gameSource = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8');

    expect(gameSource).toContain('private worldReady = false;');
    expect(gameSource).toContain("this.showFeedback('糖果塔准备中');");
    expect(gameSource).toContain('private settleWorldAndSpawnBall(): void');
    expect(gameSource).toContain('isBodyMotionSettled(sprite.body.speed, sprite.body.angularSpeed)');
    expect(gameSource).toContain('sampledMs += WORLD_SETTLE.checkMs;');
    expect(gameSource).toContain('shouldFreezeWorld(sampledMs, stableChecks)');
    expect(gameSource).toContain('this.time.delayedCall(WORLD_SETTLE.checkMs, checkWorld)');
    expect(gameSource).not.toContain('this.time.now - startedAt');
    expect(gameSource).toContain("isStatic: false,\n        label: `block:${block.id}`,");
    expect(gameSource).toContain("isStatic: false,\n        label: `target:${target.id}`,");
    expect(gameSource).toContain('block.sprite.setStatic(true)');
    expect(gameSource).toContain('target.sprite.setStatic(true)');
    expect(gameSource).toContain('hazard.setStatic(true)');
    expect(gameSource).toContain('this.worldReady = true;\n      this.spawnBall();');
    expect(gameSource).toContain('if (!this.worldReady || this.shotInFlight || !this.activeBall)');
    expect(gameSource).not.toContain('this.bindShotInput();\n    this.spawnBall();');
  });

  it('keeps complete Matter options when rebuilding body shapes', () => {
    const gameSource = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8');

    expect(gameSource).toContain('sprite.setRectangle(block.width, block.height, blockBody);');
    expect(gameSource).toContain('sprite.setCircle(33, targetBody);');
    expect(gameSource).toContain("const ballBody = {\n      isStatic: false,");
    expect(gameSource).toContain('ball.setCircle(34, ballBody);');
    expect(gameSource).toContain('ball.setCircle(34, ballBody);\n    ball.setStatic(true);');
  });
});
