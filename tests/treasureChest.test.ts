import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveTargetDamage } from '../src/game/rules';

describe('treasure chest targets', () => {
  it('opens a treasure chest over three satisfying hits', () => {
    expect(resolveTargetDamage('treasure-chest', 1, 3)).toEqual({ cleared: false, score: 350, stage: 'cracked' });
    expect(resolveTargetDamage('treasure-chest', 2, 3)).toEqual({ cleared: false, score: 500, stage: 'cracked' });
    expect(resolveTargetDamage('treasure-chest', 3, 3)).toEqual({ cleared: true, score: 900, stage: 'open' });
  });

  it('keeps existing candy jars as one-hit targets', () => {
    expect(resolveTargetDamage('jar', 1, 1)).toEqual({ cleared: true, score: 0, stage: 'open' });
  });

  it('connects chest textures and durability to the game scene', () => {
    const bootSource = readFileSync(new URL('../src/scenes/BootScene.ts', import.meta.url), 'utf8');
    const gameSource = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8');

    expect(bootSource).toContain('createTreasureChestTexture');
    expect(bootSource).toContain('treasure-chest-cracked');
    expect(gameSource).toContain('type TargetState');
    expect(gameSource).toContain('damageTarget');
    expect(gameSource).toContain('resolveTargetDamage');
    expect(gameSource).toContain("setTexture('treasure-chest-cracked')");
  });
});
