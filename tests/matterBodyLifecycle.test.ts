import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

type MatterBodyFixture = {
  mass: number;
  inverseMass: number;
  inertia: number;
  inverseInertia: number;
};

const require = createRequire(import.meta.url);
const Bodies = require('../node_modules/phaser/src/physics/matter-js/lib/factory/Bodies.js') as {
  circle(x: number, y: number, radius: number, options: Record<string, unknown>): MatterBodyFixture;
};
const Body = require('../node_modules/phaser/src/physics/matter-js/lib/body/Body.js') as {
  setStatic(body: MatterBodyFixture, isStatic: boolean): void;
};

describe('launcher Matter body lifecycle', () => {
  it('restores finite mass after a dynamic body is frozen and released', () => {
    const ball = Bodies.circle(170, 820, 34, { isStatic: false, density: 0.002 });

    Body.setStatic(ball, true);
    expect(ball.mass).toBe(Number.POSITIVE_INFINITY);
    expect(ball.inverseMass).toBe(0);

    Body.setStatic(ball, false);
    expect(Number.isFinite(ball.mass)).toBe(true);
    expect(Number.isFinite(ball.inertia)).toBe(true);
    expect(ball.inverseMass).toBeGreaterThan(0);
    expect(ball.inverseInertia).toBeGreaterThan(0);
  });
});
