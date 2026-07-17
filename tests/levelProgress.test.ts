import { describe, expect, it } from 'vitest';
import { resolveResultSummary, resolveStarProgress } from '../src/game/levelProgress';

const starScores: [number, number, number] = [1000, 1800, 2600];

describe('level progress presentation rules', () => {
  it('matches inclusive star thresholds and reports the next target', () => {
    expect(resolveStarProgress(starScores, 999, 0)).toMatchObject({
      stars: 0,
      pointsToNextStar: 1,
      newlyEarned: 0,
    });
    expect(resolveStarProgress(starScores, 1000, 0)).toMatchObject({
      stars: 1,
      pointsToNextStar: 800,
      newlyEarned: 1,
      milestoneText: '第一颗星到手',
    });
    expect(resolveStarProgress(starScores, 2600, 2)).toMatchObject({
      stars: 3,
      ratio: 1,
      pointsToNextStar: 0,
      newlyEarned: 1,
      milestoneText: '三星达成',
    });
  });

  it('collapses a multi-star jump into one highest-tier milestone', () => {
    expect(resolveStarProgress(starScores, 1900, 0)).toMatchObject({
      stars: 2,
      newlyEarned: 2,
      milestoneText: '两星达成',
    });
  });

  it('summarizes wins, records, and remaining failure targets', () => {
    expect(resolveResultSummary({
      won: true,
      shotsUsed: 1,
      targetsCleared: 1,
      totalTargets: 1,
      isNewBest: true,
    })).toEqual({ performanceText: '一发制胜', recordText: '本关新纪录' });
    expect(resolveResultSummary({
      won: true,
      shotsUsed: 3,
      targetsCleared: 2,
      totalTargets: 2,
      isNewBest: false,
    })).toEqual({ performanceText: '3 发漂亮过关' });
    expect(resolveResultSummary({
      won: false,
      shotsUsed: 5,
      targetsCleared: 1,
      totalTargets: 3,
      isNewBest: false,
    })).toEqual({ performanceText: '还差 2 个目标' });
  });
});
