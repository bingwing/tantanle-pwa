export type BlockMaterial = 'wood' | 'glass' | 'stone' | 'jelly';
export type ShotType = 'classic' | 'heavy' | 'bouncy' | 'blast';
export type CollectibleKind = 'star';
export type HazardKind = 'frosting-bomb';
export type BumperKind = 'bounce-pad';
export type PortalKind = 'rainbow-portal';
export type TargetKind = 'jar' | 'treasure-chest';
export type CelebrationKind = 'target-clear' | 'big-blast';

export type BlockDefinition = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle?: number;
  material: BlockMaterial;
};

export type TargetDefinition = {
  id: string;
  x: number;
  y: number;
  kind?: TargetKind;
  durability?: number;
};

export type CollectibleDefinition = {
  id: string;
  x: number;
  y: number;
  kind: CollectibleKind;
};

export type HazardDefinition = {
  id: string;
  x: number;
  y: number;
  kind: HazardKind;
};

export type BumperDefinition = {
  id: string;
  x: number;
  y: number;
  angle?: number;
  kind: BumperKind;
};

export type PortalDefinition = {
  id: string;
  kind: PortalKind;
  entry: {
    x: number;
    y: number;
    angle?: number;
  };
  exit: {
    x: number;
    y: number;
    angle?: number;
  };
};

export type LevelDefinition = {
  id: number;
  name: string;
  shots: number;
  starScores: [number, number, number];
  blocks: BlockDefinition[];
  targets: TargetDefinition[];
  collectibles?: CollectibleDefinition[];
  hazards?: HazardDefinition[];
  bumpers?: BumperDefinition[];
  portals?: PortalDefinition[];
};

export type LevelProgress = {
  unlocked: boolean;
  stars: number;
  bestScore: number;
};

export type GameSave = {
  version: 1;
  soundEnabled: boolean;
  lastUnlockedLevel: number;
  levels: Record<number, LevelProgress>;
};
