import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolvePortalTransfer } from '../src/game/rules';

describe('rainbow portal elements', () => {
  it('preserves momentum while rewarding a portal trick shot', () => {
    expect(resolvePortalTransfer('rainbow-portal')).toEqual({
      speedMultiplier: 1.12,
      score: 400,
      cooldownMs: 650,
      exitOffset: 64,
    });
  });

  it('connects portal textures, matter labels, and collision handling', () => {
    const bootSource = readFileSync(new URL('../src/scenes/BootScene.ts', import.meta.url), 'utf8');
    const gameSource = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8');

    expect(bootSource).toContain('createPortalTexture');
    expect(gameSource).toContain('portals = new Map');
    expect(gameSource).toContain('createPortal');
    expect(gameSource).toContain('triggerPortal');
    expect(gameSource).toContain('portalCooldownUntil');
    expect(gameSource).toContain('`portal:${portal.id}:entry`');
    expect(gameSource).toContain('`portal:${portal.id}:exit`');
    expect(gameSource).toContain('entry.setStatic(true)');
    expect(gameSource).toContain('exit.setStatic(true)');
  });

  it('paginates the level map into a rainbow island chapter', () => {
    const levelSource = readFileSync(new URL('../src/scenes/LevelScene.ts', import.meta.url), 'utf8');

    expect(levelSource).toContain('LEVEL_CHAPTERS');
    expect(levelSource).toContain('renderPage');
    expect(levelSource).toContain('changePage');
    expect(levelSource).toContain('彩虹岛');
    expect(levelSource).toContain('宝藏岛');
  });
});
