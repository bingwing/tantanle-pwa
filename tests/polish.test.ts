import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('kid-friendly polish', () => {
  it('uses shape and pattern cues instead of relying on flat colors only', () => {
    const bootScene = readFileSync(new URL('../src/scenes/BootScene.ts', import.meta.url), 'utf8');

    expect(bootScene).toContain('drawWoodGrain');
    expect(bootScene).toContain('drawGlassShine');
    expect(bootScene).toContain('drawStoneSpeckles');
    expect(bootScene).toContain('drawJellyBubbles');
  });

  it('adds tactile button feedback for touch play', () => {
    const ui = readFileSync(new URL('../src/scenes/ui.ts', import.meta.url), 'utf8');

    expect(ui).toContain("hit.on('pointerdown'");
    expect(ui).toContain("hit.on('pointerup'");
    expect(ui).toContain("hit.on('pointerout'");
    expect(ui).toContain('container.setScale');
  });

  it('shows impact score pops and celebratory win effects', () => {
    const gameScene = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8');
    const resultScene = readFileSync(new URL('../src/scenes/ResultScene.ts', import.meta.url), 'utf8');

    expect(gameScene).toContain('showScorePop');
    expect(resultScene).toContain('addVictorySparkles');
  });
});
