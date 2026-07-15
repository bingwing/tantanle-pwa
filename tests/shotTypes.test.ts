import { describe, expect, it } from 'vitest';
import { getShotTypeForIndex, resolveShotPhysics } from '../src/game/rules';

describe('shot type progression', () => {
  it('cycles kid-friendly candy ball types across shots', () => {
    expect(getShotTypeForIndex(0)).toBe('classic');
    expect(getShotTypeForIndex(1)).toBe('heavy');
    expect(getShotTypeForIndex(2)).toBe('bouncy');
    expect(getShotTypeForIndex(3)).toBe('blast');
    expect(getShotTypeForIndex(4)).toBe('split');
    expect(getShotTypeForIndex(5)).toBe('classic');
  });

  it('makes heavy shots hit harder, bouncy shots rebound more, and blast shots pop clusters', () => {
    expect(resolveShotPhysics('heavy')).toMatchObject({ density: 0.0042, restitution: 0.42, powerMultiplier: 1.08 });
    expect(resolveShotPhysics('bouncy')).toMatchObject({ density: 0.0016, restitution: 0.86, powerMultiplier: 0.96 });
    expect(resolveShotPhysics('classic')).toMatchObject({ density: 0.002, restitution: 0.62, powerMultiplier: 1 });
    expect(resolveShotPhysics('blast')).toMatchObject({ density: 0.0024, restitution: 0.5, powerMultiplier: 1.04 });
    expect(resolveShotPhysics('split')).toMatchObject({ density: 0.0019, restitution: 0.72, powerMultiplier: 1 });
  });
});
