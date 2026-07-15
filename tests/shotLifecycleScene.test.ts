import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('dynamic shot lifecycle scene integration', () => {
  it('advances lifecycle from update instead of using the fixed shot timer', () => {
    const source = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8');

    expect(source).toContain('advanceShotLifecycle');
    expect(source).toContain('SHOT_LIFECYCLE.nextBallDelayMs');
    expect(source).not.toContain('delayedCall(5200');
  });

  it('guards delayed respawn against scene exit and level completion', () => {
    const source = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8');

    expect(source).toContain("this.scene.isActive('GameScene')");
    expect(source).toContain('!this.levelEnding');
    expect(source).toContain('!this.shotInFlight');
    expect(source).toContain('!this.activeBall');
  });
});
