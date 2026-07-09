import type { BlockMaterial, BumperKind, CelebrationKind, CollectibleKind, GameSave, HazardKind, LevelDefinition, ShotType } from './types';

type ShotScoreInput = {
  targetsCleared: number;
  blocksBroken: number;
  shotsLeft: number;
};

type ShotPhysics = {
  density: number;
  restitution: number;
  powerMultiplier: number;
};

type BombBlast = {
  radius: number;
  force: number;
  score: number;
};

type BumperHit = {
  impulse: number;
  score: number;
  cooldownMs: number;
};

type CelebrationBonus = {
  score: number;
  particles: number;
  shake: number;
};

const SHOT_SEQUENCE: ShotType[] = ['classic', 'heavy', 'bouncy', 'blast'];

const BLOCK_DURABILITY: Record<BlockMaterial, number> = {
  glass: 1,
  jelly: 1,
  wood: 2,
  stone: 3,
};

const BLOCK_CRACK_SCORE: Record<BlockMaterial, number> = {
  glass: 90,
  jelly: 90,
  wood: 80,
  stone: 110,
};

const BLOCK_BREAK_SCORE: Record<BlockMaterial, number> = {
  glass: 220,
  jelly: 210,
  wood: 240,
  stone: 320,
};

const SHOT_PHYSICS: Record<ShotType, ShotPhysics> = {
  classic: {
    density: 0.002,
    restitution: 0.62,
    powerMultiplier: 1,
  },
  heavy: {
    density: 0.0042,
    restitution: 0.42,
    powerMultiplier: 1.08,
  },
  bouncy: {
    density: 0.0016,
    restitution: 0.86,
    powerMultiplier: 0.96,
  },
  blast: {
    density: 0.0024,
    restitution: 0.5,
    powerMultiplier: 1.04,
  },
};

export function calculateStars(level: LevelDefinition, score: number): number {
  if (score >= level.starScores[2]) {
    return 3;
  }
  if (score >= level.starScores[1]) {
    return 2;
  }
  if (score >= level.starScores[0]) {
    return 1;
  }
  return 0;
}

export function resolveShotScore({ targetsCleared, blocksBroken, shotsLeft }: ShotScoreInput): number {
  return targetsCleared * 1000 + blocksBroken * 100 + shotsLeft * 200;
}

export function resolveCollectibleScore(kind: CollectibleKind): number {
  return kind === 'star' ? 500 : 0;
}

export function resolveComboBonus(comboCount: number): number {
  if (comboCount < 2) {
    return 0;
  }
  return comboCount * 150;
}

export function resolveBombBlast(kind: HazardKind): BombBlast {
  return kind === 'frosting-bomb' ? { radius: 168, force: 0.028, score: 350 } : { radius: 0, force: 0, score: 0 };
}

export function resolveShotBlast(type: ShotType): BombBlast {
  return type === 'blast' ? { radius: 132, force: 0.02, score: 260 } : { radius: 0, force: 0, score: 0 };
}

export function resolveBumperHit(kind: BumperKind): BumperHit {
  return kind === 'bounce-pad' ? { impulse: 12.8, score: 220, cooldownMs: 260 } : { impulse: 0, score: 0, cooldownMs: 0 };
}

export function resolveCelebrationBonus(kind: CelebrationKind): CelebrationBonus {
  return kind === 'target-clear' ? { score: 320, particles: 72, shake: 0.014 } : { score: 180, particles: 56, shake: 0.012 };
}

export function resolveBlockDurability(material: BlockMaterial): number {
  return BLOCK_DURABILITY[material];
}

export function resolveBlockDamageScore(material: BlockMaterial, destroyed: boolean): number {
  return destroyed ? BLOCK_BREAK_SCORE[material] : BLOCK_CRACK_SCORE[material];
}

export function shouldLaunchShot(pullDistance: number): boolean {
  return pullDistance >= 28;
}

export function isTargetClearedByFall(y: number): boolean {
  return y >= 820;
}

export function getShotTypeForIndex(index: number): ShotType {
  return SHOT_SEQUENCE[index % SHOT_SEQUENCE.length];
}

export function resolveShotPhysics(type: ShotType): ShotPhysics {
  return SHOT_PHYSICS[type];
}

export function createDefaultSave(levels: LevelDefinition[]): GameSave {
  return {
    version: 1,
    soundEnabled: true,
    lastUnlockedLevel: 1,
    levels: Object.fromEntries(
      levels.map((level) => [
        level.id,
        {
          unlocked: level.id === 1,
          stars: 0,
          bestScore: 0,
        },
      ]),
    ),
  };
}

export function updateLevelProgress(
  save: GameSave,
  levels: LevelDefinition[],
  levelId: number,
  score: number,
  stars: number,
): GameSave {
  const current = save.levels[levelId] ?? { unlocked: true, stars: 0, bestScore: 0 };
  const nextLevel = levels.find((level) => level.id === levelId + 1);
  const nextLevels = {
    ...save.levels,
    [levelId]: {
      unlocked: true,
      stars: Math.max(current.stars, stars),
      bestScore: Math.max(current.bestScore, score),
    },
  };

  if (nextLevel) {
    nextLevels[nextLevel.id] = {
      ...(nextLevels[nextLevel.id] ?? { stars: 0, bestScore: 0 }),
      unlocked: true,
    };
  }

  return {
    ...save,
    lastUnlockedLevel: Math.max(save.lastUnlockedLevel, nextLevel?.id ?? levelId),
    levels: nextLevels,
  };
}
