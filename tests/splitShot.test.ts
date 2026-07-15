import { describe, expect, it } from 'vitest';
import { resolveSplitShotVelocities } from '../src/game/rules';

describe('split candy ball rules', () => {
  it('fans one velocity into three equal-speed candy balls', () => {
    const velocities = resolveSplitShotVelocities({ x: 12, y: 0 }, 14);

    expect(velocities).toHaveLength(3);
    expect(velocities[1]).toEqual({ x: 12, y: 0 });
    expect(velocities[0].y).toBeLessThan(0);
    expect(velocities[2].y).toBeGreaterThan(0);
    for (const velocity of velocities) {
      expect(Math.hypot(velocity.x, velocity.y)).toBeCloseTo(12, 8);
    }
  });
});
