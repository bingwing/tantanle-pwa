import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/game/levels';

describe('authored slingshot levels', () => {
  it('starts with gentle levels for kids', () => {
    expect(LEVELS).toHaveLength(15);
    expect(LEVELS[0].shots).toBeGreaterThanOrEqual(4);
    expect(LEVELS[0].targets.length).toBe(1);
    expect(LEVELS[0].blocks.length).toBeGreaterThanOrEqual(4);
  });

  it('adds a portal-focused rainbow island chapter', () => {
    for (const level of LEVELS.slice(10)) {
      expect(level.portals?.length).toBeGreaterThanOrEqual(1);
      expect(level.shots).toBeGreaterThanOrEqual(6);
      for (const portal of level.portals ?? []) {
        expect(portal.entry.y).toBeGreaterThanOrEqual(790);
        expect(portal.entry.y).toBeLessThanOrEqual(835);
      }
    }
  });

  it('keeps targets inside the visible play area', () => {
    for (const level of LEVELS) {
      for (const target of level.targets) {
        expect(target.x).toBeGreaterThan(520);
        expect(target.x).toBeLessThan(880);
        expect(target.y).toBeGreaterThan(170);
        expect(target.y).toBeLessThan(760);
      }
    }
  });
});
