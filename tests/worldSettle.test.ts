import { describe, expect, it } from 'vitest';
import { WORLD_SETTLE, isBodyMotionSettled, shouldFreezeWorld } from '../src/game/worldSettle';

describe('world settling rules', () => {
  it('only treats finite low-speed bodies as settled', () => {
    expect(isBodyMotionSettled(0.2, 0.01)).toBe(true);
    expect(isBodyMotionSettled(WORLD_SETTLE.maxSpeed + 0.01, 0)).toBe(false);
    expect(isBodyMotionSettled(0, WORLD_SETTLE.maxAngularSpeed + 0.01)).toBe(false);
    expect(isBodyMotionSettled(Number.NaN, 0)).toBe(false);
  });

  it('requires sampled physics time and consecutive stable checks, with a sampled timeout fallback', () => {
    expect(WORLD_SETTLE.maxMs).toBe(800);
    expect(shouldFreezeWorld(WORLD_SETTLE.minMs - 1, WORLD_SETTLE.stableChecks)).toBe(false);
    expect(shouldFreezeWorld(WORLD_SETTLE.minMs, WORLD_SETTLE.stableChecks - 1)).toBe(false);
    expect(shouldFreezeWorld(WORLD_SETTLE.minMs, WORLD_SETTLE.stableChecks)).toBe(true);
    expect(shouldFreezeWorld(WORLD_SETTLE.maxMs, 0)).toBe(true);
  });
});
