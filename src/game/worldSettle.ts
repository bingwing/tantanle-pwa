export const WORLD_SETTLE = {
  minMs: 650,
  maxMs: 800,
  checkMs: 80,
  stableChecks: 3,
  maxSpeed: 0.35,
  maxAngularSpeed: 0.025,
} as const;

export function isBodyMotionSettled(speed: number, angularSpeed: number): boolean {
  return (
    Number.isFinite(speed) &&
    Number.isFinite(angularSpeed) &&
    speed <= WORLD_SETTLE.maxSpeed &&
    angularSpeed <= WORLD_SETTLE.maxAngularSpeed
  );
}

export function shouldFreezeWorld(sampledMs: number, stableChecks: number): boolean {
  return (
    sampledMs >= WORLD_SETTLE.maxMs ||
    (sampledMs >= WORLD_SETTLE.minMs && stableChecks >= WORLD_SETTLE.stableChecks)
  );
}
