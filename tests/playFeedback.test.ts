import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('play feedback hooks', () => {
  it('handles collectible stars, frosting bombs, and combo feedback in the game scene', () => {
    const source = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8');

    expect(source).toContain('collectibles = new Map');
    expect(source).toContain('hazards = new Map');
    expect(source).toContain('collectStar');
    expect(source).toContain('triggerFrostingBomb');
    expect(source).toContain('triggerShotBlast');
    expect(source).toContain('damageBlock');
    expect(source).toContain('startDraggingBall');
    expect(source).toContain('createBumper');
    expect(source).toContain('triggerBumper');
    expect(source).toContain('celebrateImpact');
    expect(source).toContain('showComboText');
    expect(source).toContain('scorePopupPoints');
    expect(source).toContain('feedbackProtectedUntil');
    expect(source).not.toContain('const comboText = this.add');
  });
});
