export type StarProgress = {
  stars: number;
  ratio: number;
  pointsToNextStar: number;
  newlyEarned: number;
  milestoneText?: string;
};

export type ResultSummaryInput = {
  won: boolean;
  shotsUsed: number;
  targetsCleared: number;
  totalTargets: number;
  isNewBest: boolean;
};

export type ResultSummary = {
  performanceText: string;
  recordText?: string;
};

export function resolveStarProgress(
  starScores: readonly [number, number, number],
  score: number,
  previousStars: number,
): StarProgress {
  const safeScore = Math.max(0, Number.isFinite(score) ? score : 0);
  const stars = starScores.reduce((count, threshold) => count + (safeScore >= threshold ? 1 : 0), 0);
  const previous = Math.max(0, Math.min(3, previousStars));
  const newlyEarned = Math.max(0, stars - previous);
  const finalThreshold = Math.max(1, starScores[2]);
  const nextThreshold = stars < 3 ? starScores[stars] : safeScore;
  const milestoneText = newlyEarned > 0
    ? ['第一颗星到手', '两星达成', '三星达成'][stars - 1]
    : undefined;

  return {
    stars,
    ratio: Math.min(1, safeScore / finalThreshold),
    pointsToNextStar: stars < 3 ? Math.max(0, nextThreshold - safeScore) : 0,
    newlyEarned,
    milestoneText,
  };
}

export function resolveResultSummary(input: ResultSummaryInput): ResultSummary {
  if (!input.won) {
    return {
      performanceText: `还差 ${Math.max(0, input.totalTargets - input.targetsCleared)} 个目标`,
    };
  }

  const performanceText = input.shotsUsed === 1
    ? '一发制胜'
    : input.shotsUsed >= 2 && input.shotsUsed <= 3
      ? `${input.shotsUsed} 发漂亮过关`
      : input.shotsUsed > 3
        ? `${input.shotsUsed} 发完成目标`
        : '目标完成';

  return {
    performanceText,
    ...(input.isNewBest ? { recordText: '本关新纪录' } : {}),
  };
}
