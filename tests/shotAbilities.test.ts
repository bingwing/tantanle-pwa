import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveShotAbility } from '../src/game/rules';

describe('shot abilities', () => {
  it('gives every candy ball a distinct one-tap flight ability', () => {
    expect(resolveShotAbility('classic')).toEqual({
      kind: 'dash',
      speedMultiplier: 1.45,
      verticalImpulse: -1.5,
      blastRadius: 0,
      blastForce: 0,
      blastDamage: 0,
    });
    expect(resolveShotAbility('heavy')).toEqual({
      kind: 'slam',
      speedMultiplier: 0.88,
      verticalImpulse: 15,
      blastRadius: 0,
      blastForce: 0,
      blastDamage: 0,
    });
    expect(resolveShotAbility('bouncy')).toEqual({
      kind: 'hop',
      speedMultiplier: 1.12,
      verticalImpulse: -10,
      blastRadius: 0,
      blastForce: 0,
      blastDamage: 0,
    });
    expect(resolveShotAbility('blast')).toEqual({
      kind: 'detonate',
      speedMultiplier: 1,
      verticalImpulse: 0,
      blastRadius: 150,
      blastForce: 0.024,
      blastDamage: 2,
    });
  });

  it('connects the ability rule to a single-use in-flight button', () => {
    const source = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8');

    expect(source).toContain('abilityButton');
    expect(source).toContain('abilityUsed');
    expect(source).toContain('createAbilityButton');
    expect(source).toContain('showAbilityButton');
    expect(source).toContain('hideAbilityButton');
    expect(source).toContain('activateShotAbility');
    expect(source).toContain('resolveShotAbility(this.currentShotType)');
  });
});
