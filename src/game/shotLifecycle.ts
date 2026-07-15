export const SHOT_LIFECYCLE = {
  minFlightMs: 700,
  settleMs: 450,
  maxFlightMs: 7000,
  maxDeltaMs: 100,
  maxSpeed: 0.72,
  maxAngularSpeed: 0.08,
  boundsPadding: 120,
  nextBallDelayMs: 280,
} as const;

export type ShotBallMotion = {
  x: number;
  y: number;
  speed: number;
  angularSpeed: number;
};

export type ShotLifecycleState = {
  elapsedMs: number;
  settledMs: number;
};

export type ShotEndReason = 'settled' | 'out-of-play' | 'timeout';

export type ShotLifecycleResult = {
  state: ShotLifecycleState;
  shouldEnd: boolean;
  reason?: ShotEndReason;
};

export function createShotLifecycleState(): ShotLifecycleState {
  return { elapsedMs: 0, settledMs: 0 };
}

export function advanceShotLifecycle(
  state: ShotLifecycleState,
  deltaMs: number,
  balls: ShotBallMotion[],
  width: number,
  height: number,
): ShotLifecycleResult {
  const safeDeltaMs = Number.isFinite(deltaMs) ? deltaMs : 0;
  const stepMs = Math.min(SHOT_LIFECYCLE.maxDeltaMs, Math.max(0, safeDeltaMs));
  const elapsedMs = Math.min(SHOT_LIFECYCLE.maxFlightMs, state.elapsedMs + stepMs);
  const isOutOfPlay = (ball: ShotBallMotion) =>
    ball.x < -SHOT_LIFECYCLE.boundsPadding ||
    ball.x > width + SHOT_LIFECYCLE.boundsPadding ||
    ball.y > height + SHOT_LIFECYCLE.boundsPadding;

  if (balls.length > 0 && balls.every(isOutOfPlay)) {
    return {
      state: { elapsedMs, settledMs: state.settledMs },
      shouldEnd: true,
      reason: 'out-of-play',
    };
  }

  const inPlayBalls = balls.filter((ball) => !isOutOfPlay(ball));
  const allSettled =
    inPlayBalls.length > 0 &&
    inPlayBalls.every(
      (ball) =>
        Number.isFinite(ball.speed) &&
        Number.isFinite(ball.angularSpeed) &&
        ball.speed <= SHOT_LIFECYCLE.maxSpeed &&
        ball.angularSpeed <= SHOT_LIFECYCLE.maxAngularSpeed,
    );
  const settledMs = allSettled ? state.settledMs + stepMs : 0;
  const nextState = { elapsedMs, settledMs };

  if (elapsedMs >= SHOT_LIFECYCLE.maxFlightMs) {
    return { state: nextState, shouldEnd: true, reason: 'timeout' };
  }
  if (elapsedMs >= SHOT_LIFECYCLE.minFlightMs && settledMs >= SHOT_LIFECYCLE.settleMs) {
    return { state: nextState, shouldEnd: true, reason: 'settled' };
  }
  return { state: nextState, shouldEnd: false };
}
