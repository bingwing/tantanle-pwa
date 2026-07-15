import { describe, expect, it } from 'vitest';
import {
  SHOT_LIFECYCLE,
  advanceShotLifecycle,
  createShotLifecycleState,
} from '../src/game/shotLifecycle';

const stoppedBall = { x: 450, y: 900, speed: 0.1, angularSpeed: 0.01 };
const movingBall = { x: 500, y: 600, speed: 4, angularSpeed: 0.2 };

describe('shot lifecycle', () => {
  it('ends after every in-play ball remains settled for the configured window', () => {
    let result = advanceShotLifecycle(createShotLifecycleState(), 0, [movingBall], 900, 1200);
    for (let elapsed = 0; elapsed < SHOT_LIFECYCLE.minFlightMs; elapsed += SHOT_LIFECYCLE.maxDeltaMs) {
      result = advanceShotLifecycle(result.state, SHOT_LIFECYCLE.maxDeltaMs, [movingBall], 900, 1200);
    }
    for (let settled = 0; settled < 400; settled += SHOT_LIFECYCLE.maxDeltaMs) {
      result = advanceShotLifecycle(result.state, SHOT_LIFECYCLE.maxDeltaMs, [stoppedBall], 900, 1200);
    }
    expect(result.shouldEnd).toBe(false);

    result = advanceShotLifecycle(result.state, 50, [stoppedBall], 900, 1200);
    expect(result.shouldEnd).toBe(true);
    expect(result.reason).toBe('settled');
  });

  it('resets settling when any split ball is still moving', () => {
    let state = advanceShotLifecycle(createShotLifecycleState(), 100, [stoppedBall], 900, 1200).state;
    state = advanceShotLifecycle(state, 100, [stoppedBall, movingBall], 900, 1200).state;

    expect(state.settledMs).toBe(0);
  });

  it('ends immediately when every ball is outside the playable sides or bottom', () => {
    const result = advanceShotLifecycle(
      createShotLifecycleState(),
      16,
      [{ ...movingBall, x: 1100 }, { ...movingBall, y: 1400 }],
      900,
      1200,
    );

    expect(result).toMatchObject({ shouldEnd: true, reason: 'out-of-play' });
  });

  it('rejects non-finite motion and caps a background-frame delta', () => {
    const invalid = { ...stoppedBall, speed: Number.NaN };
    const result = advanceShotLifecycle(createShotLifecycleState(), 60_000, [invalid], 900, 1200);

    expect(result.state.elapsedMs).toBe(SHOT_LIFECYCLE.maxDeltaMs);
    expect(result.shouldEnd).toBe(false);
  });

  it('uses a maximum elapsed fallback for a permanently moving ball', () => {
    let result = advanceShotLifecycle(createShotLifecycleState(), 0, [movingBall], 900, 1200);
    while (!result.shouldEnd) {
      result = advanceShotLifecycle(result.state, SHOT_LIFECYCLE.maxDeltaMs, [movingBall], 900, 1200);
    }

    expect(result.reason).toBe('timeout');
    expect(result.state.elapsedMs).toBe(SHOT_LIFECYCLE.maxFlightMs);
  });
});
