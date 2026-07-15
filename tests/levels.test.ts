import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/game/levels';

function restsOnAuthoredSupport(level: (typeof LEVELS)[number], target: (typeof LEVELS)[number]['targets'][number]): boolean {
  const halfHeight = target.kind === 'treasure-chest' ? 36 : 33;
  const targetBottom = target.y + halfHeight;
  return level.blocks.some((block) => {
    const blockTop = block.y - block.height / 2;
    const horizontalOverlap = Math.abs(target.x - block.x) <= block.width / 2 + 28;
    return horizontalOverlap && Math.abs(blockTop - targetBottom) <= 3;
  });
}

describe('authored slingshot levels', () => {
  it('starts with gentle levels for kids', () => {
    expect(LEVELS).toHaveLength(25);
    expect(LEVELS[0].shots).toBeGreaterThanOrEqual(4);
    expect(LEVELS[0].targets.length).toBe(1);
    expect(LEVELS[0].blocks.length).toBeGreaterThanOrEqual(4);
  });

  it('adds a portal-focused rainbow island chapter', () => {
    for (const level of LEVELS.slice(10, 15)) {
      expect(level.portals?.length).toBeGreaterThanOrEqual(1);
      expect(level.shots).toBeGreaterThanOrEqual(6);
      for (const portal of level.portals ?? []) {
        expect(portal.entry.y).toBeGreaterThanOrEqual(790);
        expect(portal.entry.y).toBeLessThanOrEqual(835);
      }
    }
  });

  it('adds a forgiving treasure island chapter with multi-hit chests', () => {
    for (const level of LEVELS.slice(15, 20)) {
      expect(level.targets.some((target) => target.kind === 'treasure-chest')).toBe(true);
      expect(level.shots).toBeGreaterThanOrEqual(7);
    }
  });

  it('adds a generous soda island chapter that introduces split-shot play', () => {
    for (const level of LEVELS.slice(20)) {
      expect(level.shots).toBeGreaterThanOrEqual(8);
      expect(level.targets.length).toBeGreaterThanOrEqual(2);
    }
    expect(LEVELS[23].portals?.length).toBeGreaterThanOrEqual(1);
    expect(LEVELS[24].targets.some((target) => target.kind === 'treasure-chest')).toBe(true);
  });

  it('keeps soda island targets on an authored support instead of letting them fall before a shot', () => {
    for (const level of LEVELS.slice(20)) {
      for (const target of level.targets) {
        expect(restsOnAuthoredSupport(level, target)).toBe(true);
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
