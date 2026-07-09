import { describe, expect, it } from 'vitest';
import { resolveBlockDamageScore, resolveBlockDurability, shouldLaunchShot } from '../src/game/rules';

describe('satisfying block destruction rules', () => {
  it('makes light materials break quickly and stone survive longer', () => {
    expect(resolveBlockDurability('glass')).toBe(1);
    expect(resolveBlockDurability('jelly')).toBe(1);
    expect(resolveBlockDurability('wood')).toBe(2);
    expect(resolveBlockDurability('stone')).toBe(3);
  });

  it('rewards full destruction more than a crack', () => {
    expect(resolveBlockDamageScore('wood', false)).toBe(80);
    expect(resolveBlockDamageScore('wood', true)).toBe(240);
    expect(resolveBlockDamageScore('stone', true)).toBeGreaterThan(resolveBlockDamageScore('glass', true));
  });

  it('does not waste a shot on tiny accidental pulls', () => {
    expect(shouldLaunchShot(12)).toBe(false);
    expect(shouldLaunchShot(32)).toBe(true);
  });
});
