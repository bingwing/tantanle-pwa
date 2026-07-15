import Phaser from 'phaser';
import { APP_HEIGHT, APP_WIDTH, SLINGSHOT } from '../game/config';
import { LEVELS } from '../game/levels';
import {
  SUGAR_RUSH_COMBO_TARGET,
  calculateStars,
  getShotTypeForIndex,
  isTargetClearedByFall,
  resolveBombBlast,
  resolveBlockDamageScore,
  resolveBlockDurability,
  resolveBumperHit,
  resolveCelebrationBonus,
  resolveCollectibleScore,
  resolveComboBonus,
  resolvePortalTransfer,
  resolveShotAbility,
  resolveShotBlast,
  resolveShotPhysics,
  resolveShotScore,
  resolveSplitShotVelocities,
  resolveSugarRushReward,
  resolveTargetDamage,
  shouldLaunchShot,
  updateLevelProgress,
} from '../game/rules';
import { writeSave } from '../game/save';
import type { BlockDefinition, BumperDefinition, CelebrationKind, CollectibleDefinition, GameSave, HazardDefinition, LevelDefinition, PortalDefinition, ShotType, TargetKind } from '../game/types';
import { WORLD_SETTLE, isBodyMotionSettled, shouldFreezeWorld } from '../game/worldSettle';
import { addButton } from './ui';

type MatterImage = Phaser.Physics.Matter.Image & { gameId?: string; body: MatterJS.BodyType };
type BlockState = {
  sprite: MatterImage;
  material: BlockDefinition['material'];
  durability: number;
  hits: number;
};
type TargetState = {
  sprite: MatterImage;
  label: Phaser.GameObjects.Text;
  kind: TargetKind;
  durability: number;
  hits: number;
  released: boolean;
};
type PortalEndpointState = {
  destination: MatterImage;
  exitAngle: number;
};

const MATERIAL_TINT: Record<BlockDefinition['material'], number> = {
  wood: 0xd99545,
  glass: 0x87e8ff,
  stone: 0xa7adb8,
  jelly: 0x7fe3a1,
};

const MATERIAL_DENSITY: Record<BlockDefinition['material'], number> = {
  wood: 0.0015,
  glass: 0.001,
  stone: 0.0038,
  jelly: 0.0012,
};

const SHOT_TEXTURE: Record<ShotType, string> = {
  classic: 'candy-ball',
  heavy: 'candy-ball-heavy',
  bouncy: 'candy-ball-bouncy',
  blast: 'candy-ball-blast',
  split: 'candy-ball-split',
};

const SHOT_LABEL: Record<ShotType, string> = {
  classic: '普通糖球',
  heavy: '重重糖球',
  bouncy: '弹弹糖球',
  blast: '爆爆糖球',
  split: '彩虹分裂球',
};

const SHOT_TINT: Record<ShotType, number> = {
  classic: 0xffcf4d,
  heavy: 0xb66dff,
  bouncy: 0x58d9ff,
  blast: 0xff7a59,
  split: 0x54d6bf,
};

const SHOT_ABILITY_ICON: Record<ShotType, string> = {
  classic: '➤',
  heavy: '↓',
  bouncy: '↻',
  blast: '✦',
  split: '3',
};

const SHOT_ABILITY_FEEDBACK: Record<ShotType, string> = {
  classic: '糖球冲刺',
  heavy: '重糖坠击',
  bouncy: '弹跳转向',
  blast: '爆爆引爆',
  split: '彩虹三连弹',
};

const SUGAR_RUSH_METER = {
  x: 610,
  y: 154,
  width: 245,
  height: 28,
  gap: 7,
} as const;

export class GameScene extends Phaser.Scene {
  private level!: LevelDefinition;
  private shotsLeft = 0;
  private score = 0;
  private targetsCleared = 0;
  private blocksBroken = 0;
  private activeBall?: MatterImage;
  private activeBalls = new Set<MatterImage>();
  private activeBallHalo?: Phaser.GameObjects.Arc;
  private currentShotType: ShotType = 'classic';
  private shotIndex = 0;
  private pullLine?: Phaser.GameObjects.Graphics;
  private aimDots: Phaser.GameObjects.Arc[] = [];
  private lastTrajectoryDots: Phaser.GameObjects.Arc[] = [];
  private currentTrajectoryPreview: Array<{ x: number; y: number; radius: number }> = [];
  private hud?: Phaser.GameObjects.Text;
  private ballTypeText?: Phaser.GameObjects.Text;
  private feedback?: Phaser.GameObjects.Text;
  private sugarRushMeter?: Phaser.GameObjects.Graphics;
  private sugarRushText?: Phaser.GameObjects.Text;
  private abilityButton?: Phaser.GameObjects.Container;
  private abilityButtonBackground?: Phaser.GameObjects.Graphics;
  private abilityButtonIcon?: Phaser.GameObjects.Text;
  private abilityButtonPulse?: Phaser.GameObjects.Arc;
  private targets = new Map<string, TargetState>();
  private blocks = new Map<string, BlockState>();
  private collectibles = new Map<string, MatterImage>();
  private hazards = new Map<string, MatterImage>();
  private bumpers = new Map<string, MatterImage>();
  private bumperCooldowns = new WeakMap<MatterImage, Map<string, number>>();
  private portals = new Map<string, PortalEndpointState>();
  private portalCooldownUntil = new WeakMap<MatterImage, number>();
  private isDragging = false;
  private shotInFlight = false;
  private comboCount = 0;
  private abilityUsed = false;
  private sugarRushAwarded = false;
  private levelEnding = false;
  private worldReady = false;

  constructor() {
    super('GameScene');
  }

  init(data: { levelId: number }): void {
    this.level = LEVELS.find((candidate) => candidate.id === data.levelId) ?? LEVELS[0];
    this.shotsLeft = this.level.shots;
    this.score = 0;
    this.targetsCleared = 0;
    this.blocksBroken = 0;
    this.targets.clear();
    this.blocks.clear();
    this.collectibles.clear();
    this.hazards.clear();
    this.bumpers.clear();
    this.activeBalls.clear();
    this.bumperCooldowns = new WeakMap();
    this.portals.clear();
    this.portalCooldownUntil = new WeakMap();
    this.activeBall = undefined;
    this.activeBallHalo = undefined;
    this.currentShotType = 'classic';
    this.shotIndex = 0;
    this.currentTrajectoryPreview = [];
    this.shotInFlight = false;
    this.comboCount = 0;
    this.abilityUsed = false;
    this.sugarRushAwarded = false;
    this.levelEnding = false;
    this.worldReady = false;
  }

  create(): void {
    this.matter.world.setBounds(0, 0, APP_WIDTH, APP_HEIGHT, 64);
    this.addBackground();
    this.addHud();
    this.createWorld();
    this.createSlingshot();
    this.bindShotInput();
    this.feedback?.setText('糖果塔准备中');
    this.settleWorldAndSpawnBall();
    this.matter.world.on('collisionstart', (event: Phaser.Physics.Matter.Events.CollisionStartEvent) => {
      this.handleCollisions(event);
    });
  }

  update(): void {
    if (this.targets.size === 0) {
      return;
    }

    for (const [id, target] of this.targets) {
      target.label.setPosition(target.sprite.x, target.sprite.y + (target.kind === 'treasure-chest' ? 68 : 55));
      if (target.kind === 'jar' && target.released && isTargetClearedByFall(target.sprite.y)) {
        this.clearTarget(id);
      }
    }
  }

  private addBackground(): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x7bd3ff, 0xbbeeff, 0xfff0b5, 0xfff8df, 1);
    bg.fillRect(0, 0, APP_WIDTH, APP_HEIGHT);
    bg.fillStyle(0xffffff, 0.26);
    for (let i = 0; i < 10; i += 1) {
      bg.fillCircle(70 + i * 92, 115 + (i % 3) * 72, 22 + (i % 2) * 13);
    }
    bg.fillStyle(0x79d28d, 1);
    bg.fillRoundedRect(0, 890, APP_WIDTH, 310, 34);
    bg.fillStyle(0x62bb78, 1);
    bg.fillRoundedRect(0, 940, APP_WIDTH, 260, 0);
    bg.lineStyle(5, 0x2e4057, 0.12);
    bg.lineBetween(0, 890, APP_WIDTH, 890);
  }

  private addHud(): void {
    this.hud = this.add.text(34, 28, '', {
      fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: '27px',
      color: '#2e4057',
      fontStyle: '900',
      stroke: '#ffffff',
      strokeThickness: 4,
    });
    this.feedback = this.add
      .text(APP_WIDTH / 2, 94, '拉动糖果球发射', {
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: '32px',
        color: '#ff6f91',
        fontStyle: '900',
        stroke: '#ffffff',
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    this.ballTypeText = this.add
      .text(34, 104, '', {
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: '24px',
        color: '#2e4057',
        fontStyle: '900',
        stroke: '#ffffff',
        strokeThickness: 4,
      })
      .setDepth(30);
    this.sugarRushMeter = this.add.graphics().setDepth(30);
    this.sugarRushText = this.add
      .text(SUGAR_RUSH_METER.x + SUGAR_RUSH_METER.width / 2, SUGAR_RUSH_METER.y - 21, '', {
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: '20px',
        color: '#2e4057',
        fontStyle: '900',
        stroke: '#ffffff',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(31);
    this.createAbilityButton();
    addButton(this, 780, 56, 150, 58, '选关', () => this.scene.start('LevelScene'));
    this.refreshHud();
  }

  private refreshHud(): void {
    this.hud?.setText(`第 ${this.level.id} 关  ${this.level.name}\n分数 ${this.score}  糖果球 ${this.shotsLeft}`);
    this.ballTypeText?.setText(`当前：${SHOT_LABEL[this.currentShotType]}`);
    this.ballTypeText?.setColor(Phaser.Display.Color.IntegerToColor(SHOT_TINT[this.currentShotType]).rgba);
    this.drawSugarRushMeter();
  }

  private drawSugarRushMeter(): void {
    if (!this.sugarRushMeter) {
      return;
    }

    const { x, y, width, height, gap } = SUGAR_RUSH_METER;
    const progress = this.sugarRushAwarded ? SUGAR_RUSH_COMBO_TARGET : Math.min(this.comboCount, SUGAR_RUSH_COMBO_TARGET);
    const segmentWidth = (width - gap * (SUGAR_RUSH_COMBO_TARGET - 1)) / SUGAR_RUSH_COMBO_TARGET;
    this.sugarRushText?.setText(this.sugarRushAwarded ? '糖果连锁  奖励已拿' : `糖果连锁  ${progress}/${SUGAR_RUSH_COMBO_TARGET}`);
    this.sugarRushMeter.clear();
    this.sugarRushMeter.fillStyle(0xffffff, 0.92);
    this.sugarRushMeter.fillRoundedRect(x - 6, y - 6, width + 12, height + 12, 10);
    this.sugarRushMeter.lineStyle(4, 0x2e4057, 0.84);
    this.sugarRushMeter.strokeRoundedRect(x - 6, y - 6, width + 12, height + 12, 10);

    for (let index = 0; index < SUGAR_RUSH_COMBO_TARGET; index += 1) {
      const segmentX = x + index * (segmentWidth + gap);
      const filled = index < progress;
      this.sugarRushMeter.fillStyle(filled ? 0xffcf4d : 0xdfe9ed, 1);
      this.sugarRushMeter.fillRoundedRect(segmentX, y, segmentWidth, height, 6);
      this.sugarRushMeter.lineStyle(3, 0x2e4057, filled ? 0.78 : 0.28);
      this.sugarRushMeter.strokeRoundedRect(segmentX, y, segmentWidth, height, 6);
      if (filled) {
        this.sugarRushMeter.lineStyle(3, 0xffffff, 0.72);
        for (let offset = 10; offset < segmentWidth; offset += 14) {
          this.sugarRushMeter.lineBetween(segmentX + offset - 7, y + height - 5, segmentX + offset + 4, y + 5);
        }
      }
    }
  }

  private createAbilityButton(): void {
    const pulse = this.add.circle(0, 0, 68, 0xffffff, 0.14).setStrokeStyle(5, 0xffffff, 0.78);
    const background = this.add.graphics();
    const icon = this.add
      .text(0, 0, '', {
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: '58px',
        color: '#ffffff',
        fontStyle: '900',
        stroke: '#2e4057',
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    const hit = this.add.zone(0, 0, 142, 142).setInteractive({ useHandCursor: true });
    const button = this.add.container(815, 1060, [pulse, background, icon, hit]).setDepth(85).setVisible(false);
    hit.on('pointerdown', () => button.setScale(0.92));
    hit.on('pointerup', () => {
      button.setScale(1);
      this.activateShotAbility();
    });
    hit.on('pointerout', () => button.setScale(1));
    this.abilityButton = button;
    this.abilityButtonBackground = background;
    this.abilityButtonIcon = icon;
    this.abilityButtonPulse = pulse;
  }

  private showAbilityButton(): void {
    if (!this.abilityButton || !this.abilityButtonBackground || !this.abilityButtonIcon || !this.abilityButtonPulse) {
      return;
    }

    const tint = SHOT_TINT[this.currentShotType];
    this.abilityButtonBackground.clear();
    this.abilityButtonBackground.fillStyle(0xffffff, 0.96);
    this.abilityButtonBackground.fillCircle(0, 0, 61);
    this.abilityButtonBackground.lineStyle(6, 0x2e4057, 0.9);
    this.abilityButtonBackground.strokeCircle(0, 0, 61);
    this.abilityButtonBackground.fillStyle(tint, 1);
    this.abilityButtonBackground.fillCircle(0, 0, 49);
    this.abilityButtonBackground.lineStyle(4, 0xffffff, 0.68);
    this.abilityButtonBackground.strokeCircle(0, 0, 49);
    this.abilityButtonIcon.setText(SHOT_ABILITY_ICON[this.currentShotType]);
    this.abilityButtonPulse.setFillStyle(tint, 0.16).setStrokeStyle(5, tint, 0.76).setScale(0.88).setAlpha(0.92);
    this.abilityButton.setScale(1).setVisible(true);
    this.tweens.killTweensOf(this.abilityButtonPulse);
    this.tweens.add({
      targets: this.abilityButtonPulse,
      scale: 1.16,
      alpha: 0.18,
      duration: 620,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  private hideAbilityButton(): void {
    if (this.abilityButtonPulse) {
      this.tweens.killTweensOf(this.abilityButtonPulse);
    }
    this.abilityButton?.setVisible(false).setScale(1);
  }

  private createWorld(): void {
    this.matter.add.rectangle(APP_WIDTH / 2, 930, APP_WIDTH, 90, { isStatic: true, label: 'ground' });
    const floor = this.add.graphics();
    floor.fillStyle(0x3f9e61, 0.3);
    floor.fillRoundedRect(0, 884, APP_WIDTH, 82, 18);

    for (const block of this.level.blocks) {
      const blockBody = {
        density: MATERIAL_DENSITY[block.material],
        friction: 0.78,
        frictionAir: 0.012,
        restitution: block.material === 'jelly' ? 0.42 : 0.16,
        isStatic: false,
        label: `block:${block.id}`,
      };
      const sprite = this.matter.add.image(block.x, block.y, `block-${block.material}`, undefined, blockBody) as MatterImage;
      sprite.gameId = block.id;
      sprite.setDisplaySize(block.width, block.height);
      sprite.setRectangle(block.width, block.height, blockBody);
      sprite.body.label = `block:${block.id}`;
      sprite.setTint(MATERIAL_TINT[block.material]);
      sprite.setAngle(block.angle ?? 0);
      this.blocks.set(block.id, {
        sprite,
        material: block.material,
        durability: resolveBlockDurability(block.material),
        hits: 0,
      });
    }

    for (const target of this.level.targets) {
      const kind = target.kind ?? 'jar';
      const isTreasureChest = kind === 'treasure-chest';
      const targetBody = {
        density: isTreasureChest ? 0.0022 : 0.0012,
        friction: isTreasureChest ? 0.72 : 0.55,
        frictionAir: 0.01,
        restitution: isTreasureChest ? 0.16 : 0.24,
        isStatic: false,
        label: `target:${target.id}`,
      };
      const sprite = this.matter.add.image(target.x, target.y, isTreasureChest ? 'treasure-chest' : 'target-jar', undefined, targetBody) as MatterImage;
      sprite.gameId = target.id;
      if (isTreasureChest) {
        sprite.setRectangle(102, 72, { ...targetBody, chamfer: { radius: 10 } });
      } else {
        sprite.setCircle(33, targetBody);
        sprite.setScale(0.95);
      }
      sprite.body.label = `target:${target.id}`;
      sprite.setDepth(12);
      const label = this.add
        .text(target.x, target.y + (isTreasureChest ? 68 : 55), isTreasureChest ? '糖果宝箱' : '糖果罐', {
          fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
          fontSize: '18px',
          color: '#2e4057',
          fontStyle: '900',
          stroke: '#ffffff',
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(13);
      this.targets.set(target.id, {
        sprite,
        label,
        kind,
        durability: Math.max(1, target.durability ?? (isTreasureChest ? 3 : 1)),
        hits: 0,
        released: false,
      });
    }

    for (const collectible of this.level.collectibles ?? []) {
      this.createCollectible(collectible);
    }

    for (const hazard of this.level.hazards ?? []) {
      this.createHazard(hazard);
    }

    for (const bumper of this.level.bumpers ?? []) {
      this.createBumper(bumper);
    }

    for (const portal of this.level.portals ?? []) {
      this.createPortal(portal);
    }
  }

  private settleWorldAndSpawnBall(): void {
    let sampledMs = 0;
    let stableChecks = 0;
    const sprites = [
      ...Array.from(this.blocks.values(), (block) => block.sprite),
      ...Array.from(this.targets.values(), (target) => target.sprite),
      ...this.hazards.values(),
    ];

    const checkWorld = () => {
      if (!this.scene.isActive('GameScene') || this.levelEnding) {
        return;
      }

      // Consecutive samples avoid freezing a body at the top of a bounce.
      const allSettled = sprites.every((sprite) => isBodyMotionSettled(sprite.body.speed, sprite.body.angularSpeed));
      stableChecks = allSettled ? stableChecks + 1 : 0;
      sampledMs += WORLD_SETTLE.checkMs;
      if (!shouldFreezeWorld(sampledMs, stableChecks)) {
        this.time.delayedCall(WORLD_SETTLE.checkMs, checkWorld);
        return;
      }

      for (const block of this.blocks.values()) {
        block.sprite.setStatic(true);
      }
      for (const target of this.targets.values()) {
        target.sprite.setStatic(true);
      }
      for (const hazard of this.hazards.values()) {
        hazard.setStatic(true);
      }

      this.worldReady = true;
      this.spawnBall();
    };

    this.time.delayedCall(WORLD_SETTLE.checkMs, checkWorld);
  }

  private createCollectible(collectible: CollectibleDefinition): void {
    const starBody = {
      isStatic: true,
      isSensor: true,
      label: `collectible:${collectible.id}`,
    };
    const star = this.matter.add.image(collectible.x, collectible.y, 'bonus-star', undefined, starBody) as MatterImage;
    star.gameId = collectible.id;
    star.setCircle(30, starBody);
    star.body.label = `collectible:${collectible.id}`;
    star.body.isSensor = true;
    star.setDepth(12);
    this.collectibles.set(collectible.id, star);
    this.tweens.add({
      targets: star,
      y: collectible.y - 10,
      angle: 10,
      duration: 980,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  private createHazard(hazard: HazardDefinition): void {
    const bombBody = {
      density: 0.001,
      friction: 0.45,
      frictionAir: 0.01,
      restitution: 0.38,
      isStatic: false,
      label: `hazard:${hazard.id}`,
    };
    const bomb = this.matter.add.image(hazard.x, hazard.y, 'frosting-bomb', undefined, bombBody) as MatterImage;
    bomb.gameId = hazard.id;
    bomb.setCircle(34, bombBody);
    bomb.body.label = `hazard:${hazard.id}`;
    bomb.setDepth(13);
    this.hazards.set(hazard.id, bomb);
  }

  private createBumper(bumper: BumperDefinition): void {
    const bumperOptions = {
      isStatic: true,
      friction: 0.08,
      restitution: 1.18,
      label: `bumper:${bumper.id}`,
    };
    const bumperBody = this.matter.add.image(bumper.x, bumper.y, 'bounce-pad', undefined, bumperOptions) as MatterImage;
    bumperBody.gameId = bumper.id;
    bumperBody.setRectangle(148, 42, { ...bumperOptions, chamfer: { radius: 21 } });
    bumperBody.body.label = `bumper:${bumper.id}`;
    bumperBody.setAngle(bumper.angle ?? 0);
    bumperBody.setDepth(14);
    this.bumpers.set(bumper.id, bumperBody);
    this.add
      .text(bumper.x, bumper.y - 38, '弹力糖垫', {
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: '17px',
        color: '#2e4057',
        fontStyle: '900',
        stroke: '#ffffff',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(15);
  }

  private createPortal(portal: PortalDefinition): void {
    const entryLabel = `portal:${portal.id}:entry`;
    const exitLabel = `portal:${portal.id}:exit`;
    const entry = this.matter.add.image(portal.entry.x, portal.entry.y, 'rainbow-portal', undefined, {
      isStatic: true,
      isSensor: true,
      label: entryLabel,
    }) as MatterImage;
    entry.setCircle(43, { isStatic: true, isSensor: true, label: entryLabel });
    entry.setStatic(true);
    entry.body.label = `portal:${portal.id}:entry`;
    entry.body.isSensor = true;
    entry.setAngle(portal.entry.angle ?? 0).setDepth(14);

    const exit = this.matter.add.image(portal.exit.x, portal.exit.y, 'rainbow-portal', undefined, {
      isStatic: true,
      isSensor: true,
      label: exitLabel,
    }) as MatterImage;
    exit.setCircle(43, { isStatic: true, isSensor: true, label: exitLabel });
    exit.setStatic(true);
    exit.body.label = `portal:${portal.id}:exit`;
    exit.body.isSensor = true;
    exit.setAngle(portal.exit.angle ?? 0).setDepth(14);

    this.portals.set(`${portal.id}:entry`, {
      destination: exit,
      exitAngle: portal.exit.angle ?? 0,
    });
    this.portals.set(`${portal.id}:exit`, {
      destination: entry,
      exitAngle: portal.entry.angle ?? 180,
    });

    for (const endpoint of [entry, exit]) {
      const halo = this.add.circle(endpoint.x, endpoint.y, 55, 0xffffff, 0.08).setStrokeStyle(5, 0x58d9ff, 0.72).setDepth(13);
      this.tweens.add({
        targets: halo,
        scale: { from: 0.88, to: 1.18 },
        alpha: { from: 0.78, to: 0.12 },
        duration: 760,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }
  }

  private createSlingshot(): void {
    const g = this.add.graphics();
    g.lineStyle(18, 0x8b5a3c, 1);
    g.lineBetween(SLINGSHOT.x - 42, SLINGSHOT.y + 106, SLINGSHOT.x - 15, SLINGSHOT.y + 24);
    g.lineBetween(SLINGSHOT.x + 42, SLINGSHOT.y + 106, SLINGSHOT.x + 15, SLINGSHOT.y + 24);
    g.lineStyle(10, 0xff6f91, 0.95);
    g.lineBetween(SLINGSHOT.x - 18, SLINGSHOT.y + 26, SLINGSHOT.x + 18, SLINGSHOT.y + 26);
    g.fillStyle(0x8b5a3c, 1);
    g.fillRoundedRect(SLINGSHOT.x - 18, SLINGSHOT.y + 88, 36, 128, 12);
  }

  private bindShotInput(): void {
    // Scene-level release handling survives the pointerup from entering the level.
    this.input.off('pointermove', this.dragBall, this);
    this.input.off('pointerup', this.releaseBall, this);
    this.input.off('pointerdown', this.startDraggingBall, this);
    this.input.on('pointerdown', this.startDraggingBall, this);
    this.input.on('pointermove', this.dragBall, this);
    this.input.on('pointerup', this.releaseBall, this);
  }

  private spawnBall(): void {
    if (this.shotsLeft <= 0 || this.targets.size === 0) {
      this.finishIfNeeded();
      return;
    }

    this.currentShotType = getShotTypeForIndex(this.shotIndex);
    this.abilityUsed = false;
    this.hideAbilityButton();
    this.drawLastTrajectory();
    const physics = resolveShotPhysics(this.currentShotType);
    const ballBody = {
      isStatic: false,
      restitution: physics.restitution,
      friction: 0.4,
      frictionAir: 0.01,
      density: physics.density,
      label: 'ball',
    };
    const ball = this.matter.add.image(SLINGSHOT.x, SLINGSHOT.y, SHOT_TEXTURE[this.currentShotType], undefined, ballBody) as MatterImage;
    ball.setCircle(34, ballBody);
    ball.setStatic(true);
    ball.body.label = 'ball';
    ball.setInteractive({ draggable: true, useHandCursor: true });
    ball.setDepth(20);
    this.activeBall = ball;
    this.activeBalls.add(ball);
    this.feedback?.setText(`${SHOT_LABEL[this.currentShotType]}准备好`);
    this.refreshHud();

    this.addShotHalo(ball);
  }

  private addShotHalo(ball: MatterImage): void {
    this.clearShotHalo();
    const halo = this.add.circle(ball.x, ball.y, 48, SHOT_TINT[this.currentShotType], 0.22).setDepth(18);
    this.activeBallHalo = halo;
    this.tweens.add({
      targets: halo,
      scale: { from: 0.9, to: 1.18 },
      alpha: { from: 0.35, to: 0.08 },
      duration: 760,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    ball.once('destroy', () => this.clearShotHalo());
  }

  private clearShotHalo(): void {
    if (!this.activeBallHalo) {
      return;
    }
    this.tweens.killTweensOf(this.activeBallHalo);
    this.activeBallHalo.destroy();
    this.activeBallHalo = undefined;
  }

  private startDraggingBall(pointer: Phaser.Input.Pointer): void {
    if (!this.worldReady || this.shotInFlight || !this.activeBall) {
      return;
    }

    const distanceFromBall = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.activeBall.x, this.activeBall.y);
    const distanceFromSling = Phaser.Math.Distance.Between(pointer.x, pointer.y, SLINGSHOT.x, SLINGSHOT.y);
    if (distanceFromBall > 92 && distanceFromSling > 130) {
      return;
    }

    this.isDragging = true;
    this.dragBall(pointer);
  }

  private dragBall(pointer: Phaser.Input.Pointer): void {
    if (!this.isDragging || !this.activeBall) {
      return;
    }

    const pull = Phaser.Math.Clamp(Phaser.Math.Distance.Between(SLINGSHOT.x, SLINGSHOT.y, pointer.x, pointer.y), 0, SLINGSHOT.maxPull);
    const angle = Phaser.Math.Angle.Between(SLINGSHOT.x, SLINGSHOT.y, pointer.x, pointer.y);
    const x = SLINGSHOT.x + Math.cos(angle) * pull;
    const y = SLINGSHOT.y + Math.sin(angle) * pull;
    this.activeBall.setPosition(x, y);
    this.activeBallHalo?.setPosition(x, y);
    this.drawPullPreview(x, y);
  }

  private drawPullPreview(x: number, y: number): void {
    this.pullLine?.destroy();
    for (const dot of this.aimDots) {
      dot.destroy();
    }
    this.aimDots = [];
    this.currentTrajectoryPreview = [];

    const physics = resolveShotPhysics(this.currentShotType);
    const velocity = {
      x: (SLINGSHOT.x - x) * SLINGSHOT.power * physics.powerMultiplier,
      y: (SLINGSHOT.y - y) * SLINGSHOT.power * physics.powerMultiplier,
    };
    this.pullLine = this.add.graphics();
    this.pullLine.lineStyle(8, 0xff6f91, 0.68);
    this.pullLine.lineBetween(SLINGSHOT.x - 18, SLINGSHOT.y + 26, x, y);
    this.pullLine.lineBetween(SLINGSHOT.x + 18, SLINGSHOT.y + 26, x, y);
    this.pullLine.lineStyle(5, 0xffffff, 0.6);
    this.pullLine.strokeCircle(x, y, 44);

    let px = SLINGSHOT.x;
    let py = SLINGSHOT.y;
    let vx = velocity.x;
    let vy = velocity.y;
    for (let i = 0; i < 10; i += 1) {
      px += vx * 4.8;
      py += vy * 4.8;
      vy += 4.8;
      vx *= 0.992;
      const radius = Math.max(4, 10 - i * 0.55);
      const dot = this.add.circle(px, py, radius, 0xffffff, 0.75);
      dot.setStrokeStyle(2, SHOT_TINT[this.currentShotType], 0.75);
      this.aimDots.push(dot);
      this.currentTrajectoryPreview.push({ x: px, y: py, radius });
    }
  }

  private releaseBall(): void {
    if (!this.isDragging || !this.activeBall) {
      return;
    }

    const ball = this.activeBall;
    const pullDistance = Phaser.Math.Distance.Between(SLINGSHOT.x, SLINGSHOT.y, ball.x, ball.y);
    if (!shouldLaunchShot(pullDistance)) {
      this.isDragging = false;
      ball.setPosition(SLINGSHOT.x, SLINGSHOT.y);
      this.clearAim();
      this.feedback?.setText('再拉远一点');
      return;
    }

    const physics = resolveShotPhysics(this.currentShotType);
    const velocity = {
      x: (SLINGSHOT.x - ball.x) * SLINGSHOT.power * physics.powerMultiplier,
      y: (SLINGSHOT.y - ball.y) * SLINGSHOT.power * physics.powerMultiplier,
    };
    this.isDragging = false;
    this.shotInFlight = true;
    this.shotsLeft -= 1;
    this.shotIndex += 1;
    ball.setStatic(false);
    ball.setVelocity(velocity.x, velocity.y);
    ball.setAngularVelocity(0.18);
    this.clearAim();
    this.recordLastTrajectory();
    this.clearShotHalo();
    this.feedback?.setText(`${SHOT_LABEL[this.currentShotType]}出击`);
    this.refreshHud();
    this.showAbilityButton();
    this.time.delayedCall(5200, () => this.endShot());
  }

  private activateShotAbility(): void {
    if (!this.shotInFlight || this.abilityUsed || !this.activeBall) {
      return;
    }

    const ability = resolveShotAbility(this.currentShotType);
    const velocity = this.activeBall.body.velocity;
    this.abilityUsed = true;
    this.hideAbilityButton();
    if (ability.kind === 'split') {
      this.splitActiveBall(ability.splitSpreadDegrees ?? 20);
      return;
    }
    this.activeBall.setVelocity(
      velocity.x * ability.speedMultiplier,
      velocity.y * ability.speedMultiplier + ability.verticalImpulse,
    );
    this.activeBall.setAngularVelocity(ability.kind === 'slam' ? 0.48 : ability.kind === 'hop' ? -0.38 : 0.26);
    this.burst(this.activeBall.x, this.activeBall.y, SHOT_TINT[this.currentShotType], ability.kind === 'detonate' ? 48 : 28);
    if (ability.blastRadius > 0) {
      this.applyBlastForce(
        this.activeBall.x,
        this.activeBall.y,
        ability.blastRadius,
        ability.blastForce,
        ability.blastDamage,
      );
      this.celebrateImpact(this.activeBall.x, this.activeBall.y, 'big-blast');
    }
    this.feedback?.setText(SHOT_ABILITY_FEEDBACK[this.currentShotType]);
  }

  private splitActiveBall(spreadDegrees: number): void {
    if (!this.activeBall) {
      return;
    }

    const ball = this.activeBall;
    const physics = resolveShotPhysics('split');
    const velocities = resolveSplitShotVelocities(ball.body.velocity, spreadDegrees);
    const collisionGroup = -this.shotIndex - 1;
    ball.setCollisionGroup(collisionGroup);
    ball.setVelocity(velocities[1].x, velocities[1].y);
    ball.setAngularVelocity(0.26);

    for (const [index, velocity] of [velocities[0], velocities[2]].entries()) {
      const cloneBody = {
        restitution: physics.restitution,
        friction: 0.4,
        frictionAir: 0.01,
        density: physics.density,
        label: 'ball',
      };
      const clone = this.matter.add.image(ball.x, ball.y + (index === 0 ? -16 : 16), 'candy-ball-split', undefined, cloneBody) as MatterImage;
      clone.setCircle(34, cloneBody);
      clone.body.label = 'ball';
      clone.setCollisionGroup(collisionGroup);
      clone.setVelocity(velocity.x, velocity.y);
      clone.setAngularVelocity(velocity.y < 0 ? -0.28 : 0.28);
      clone.setDepth(20);
      this.activeBalls.add(clone);
    }

    this.burst(ball.x, ball.y, SHOT_TINT.split, 64);
    this.cameras.main.flash(150, 104, 236, 209, false);
    this.cameras.main.shake(170, 0.013);
    this.feedback?.setText(SHOT_ABILITY_FEEDBACK.split);
  }

  private clearAim(): void {
    this.pullLine?.destroy();
    this.pullLine = undefined;
    for (const dot of this.aimDots) {
      dot.destroy();
    }
    this.aimDots = [];
    this.currentTrajectoryPreview = [];
  }

  private recordLastTrajectory(): void {
    for (const dot of this.lastTrajectoryDots) {
      dot.destroy();
    }
    this.lastTrajectoryDots = this.currentTrajectoryPreview.map((point, index) => {
      const dot = this.add.circle(point.x, point.y, Math.max(3, point.radius - 2), SHOT_TINT[this.currentShotType], 0.2);
      dot.setStrokeStyle(1, 0xffffff, 0.28);
      dot.setDepth(2 + index * 0.01);
      return dot;
    });
  }

  private drawLastTrajectory(): void {
    for (const dot of this.lastTrajectoryDots) {
      dot.setAlpha(0.18);
      dot.setDepth(2);
    }
  }

  private handleCollisions(event: Phaser.Physics.Matter.Events.CollisionStartEvent): void {
    for (const pair of event.pairs) {
      const labels = [pair.bodyA.label, pair.bodyB.label];
      if (labels.includes('ball')) {
        const ballBody = pair.bodyA.label === 'ball' ? pair.bodyA : pair.bodyB.label === 'ball' ? pair.bodyB : undefined;
        const ball = ballBody?.gameObject as MatterImage | undefined;
        if (!ball || !this.activeBalls.has(ball)) {
          continue;
        }
        const targetLabel = labels.find((label) => label.startsWith('target:'));
        const blockLabel = labels.find((label) => label.startsWith('block:'));
        const collectibleLabel = labels.find((label) => label.startsWith('collectible:'));
        const hazardLabel = labels.find((label) => label.startsWith('hazard:'));
        const bumperLabel = labels.find((label) => label.startsWith('bumper:'));
        const portalLabel = labels.find((label) => label.startsWith('portal:'));
        if (targetLabel) {
          this.releaseImpactArea(ball.x, ball.y);
          this.damageTarget(targetLabel.replace('target:', ''));
        }
        if (blockLabel) {
          this.releaseImpactArea(ball.x, ball.y);
          this.damageBlock(blockLabel.replace('block:', ''), 1);
          this.triggerShotBlast(pair.collision.supports?.[0]?.x ?? ball.x, pair.collision.supports?.[0]?.y ?? ball.y);
        }
        if (collectibleLabel) {
          this.collectStar(collectibleLabel.replace('collectible:', ''));
        }
        if (hazardLabel) {
          this.triggerFrostingBomb(hazardLabel.replace('hazard:', ''));
        }
        if (bumperLabel) {
          this.triggerBumper(bumperLabel.replace('bumper:', ''), ball);
        }
        if (portalLabel) {
          this.triggerPortal(portalLabel.replace('portal:', ''), ball);
        }
      }
    }
  }

  private triggerPortal(id: string, ball: MatterImage): void {
    const endpoint = this.portals.get(id);
    const cooldownUntil = this.portalCooldownUntil.get(ball) ?? 0;
    if (!endpoint || this.time.now < cooldownUntil) {
      return;
    }

    const transfer = resolvePortalTransfer('rainbow-portal');
    const velocity = ball.body.velocity;
    const speed = Math.max(10, Math.hypot(velocity.x, velocity.y) * transfer.speedMultiplier);
    const exitAngle = Phaser.Math.DegToRad(endpoint.exitAngle);
    const sourceX = ball.x;
    const sourceY = ball.y;
    this.portalCooldownUntil.set(ball, this.time.now + transfer.cooldownMs);
    this.burst(sourceX, sourceY, 0x58d9ff, 30);
    ball.setPosition(
      endpoint.destination.x + Math.cos(exitAngle) * transfer.exitOffset,
      endpoint.destination.y + Math.sin(exitAngle) * transfer.exitOffset,
    );
    ball.setVelocity(Math.cos(exitAngle) * speed, Math.sin(exitAngle) * speed);
    ball.setAngularVelocity(0.42);
    this.score += transfer.score;
    this.comboCount += 1;
    this.feedback?.setText('彩虹穿梭');
    this.burst(endpoint.destination.x, endpoint.destination.y, 0xff6f91, 38);
    this.showScorePop(endpoint.destination.x, endpoint.destination.y - 58, transfer.score, 0x58d9ff);
    this.showComboText(endpoint.destination.x, endpoint.destination.y - 104);
    this.refreshHud();
  }

  private triggerBumper(id: string, ball: MatterImage): void {
    const bumper = this.bumpers.get(id);
    if (!bumper) {
      return;
    }

    const now = this.time.now;
    const cooldowns = this.bumperCooldowns.get(ball) ?? new Map<string, number>();
    this.bumperCooldowns.set(ball, cooldowns);
    if ((cooldowns.get(id) ?? 0) > now) {
      return;
    }

    const hit = resolveBumperHit('bounce-pad');
    cooldowns.set(id, now + hit.cooldownMs);
    const normalAngle = Phaser.Math.DegToRad(bumper.angle - 90);
    ball.setVelocity(Math.cos(normalAngle) * hit.impulse, Math.sin(normalAngle) * hit.impulse);
    ball.setAngularVelocity(0.32);
    this.score += hit.score;
    this.comboCount += 1;
    this.feedback?.setText('弹力糖垫反弹');
    this.burst(bumper.x, bumper.y, 0xffcf4d, 26);
    this.showScorePop(bumper.x, bumper.y - 42, hit.score, 0xffcf4d);
    this.showComboText(bumper.x, bumper.y - 88);
    this.tweens.add({
      targets: bumper,
      scaleX: bumper.scaleX * 1.12,
      scaleY: bumper.scaleY * 1.26,
      duration: 85,
      yoyo: true,
      ease: 'Sine.out',
    });
    this.refreshHud();
  }

  private collectStar(id: string): void {
    const star = this.collectibles.get(id);
    if (!star) {
      return;
    }

    this.collectibles.delete(id);
    const points = resolveCollectibleScore('star');
    this.score += points;
    this.comboCount += 1;
    this.feedback?.setText('星星糖收集');
    this.burst(star.x, star.y, 0xffcf4d, 24);
    this.showScorePop(star.x, star.y - 24, points, 0xffcf4d);
    this.showComboText(star.x, star.y - 74);
    this.tweens.killTweensOf(star);
    star.destroy();
    this.refreshHud();
  }

  private triggerFrostingBomb(id: string): void {
    const bomb = this.hazards.get(id);
    if (!bomb) {
      return;
    }

    this.hazards.delete(id);
    const blast = resolveBombBlast('frosting-bomb');
    this.score += blast.score;
    this.comboCount += 1;
    this.feedback?.setText('糖霜爆开啦');
    this.burst(bomb.x, bomb.y, 0xff8fb3, 54);
    this.showScorePop(bomb.x, bomb.y - 30, blast.score, 0xff8fb3);
    this.showComboText(bomb.x, bomb.y - 82);
    this.applyBlastForce(bomb.x, bomb.y, blast.radius, blast.force);
    this.celebrateImpact(bomb.x, bomb.y, 'big-blast');
    bomb.destroy();
    this.refreshHud();
  }

  private triggerShotBlast(x: number, y: number): void {
    const blast = resolveShotBlast(this.currentShotType);
    if (blast.radius <= 0) {
      return;
    }

    this.score += blast.score;
    this.comboCount += 1;
    this.feedback?.setText('爆爆糖球炸开');
    this.burst(x, y, 0xff7a59, 42);
    this.showScorePop(x, y - 28, blast.score, 0xff7a59);
    this.showComboText(x, y - 76);
    this.applyBlastForce(x, y, blast.radius, blast.force, 1);
    this.celebrateImpact(x, y, 'big-blast');
    this.refreshHud();
  }

  private applyBlastForce(x: number, y: number, radius: number, force: number, damage = 2): void {
    this.releaseImpactArea(x, y, radius);
    const bodies = [
      ...Array.from(this.blocks.entries(), ([id, block]) => ({ id, kind: 'block' as const, sprite: block.sprite })),
      ...Array.from(this.targets.entries(), ([id, target]) => ({ id, kind: 'target' as const, sprite: target.sprite })),
    ];
    for (const body of bodies) {
      const distance = Phaser.Math.Distance.Between(x, y, body.sprite.x, body.sprite.y);
      if (distance > radius || distance <= 1) {
        continue;
      }
      const strength = (1 - distance / radius) * force;
      body.sprite.applyForce(
        new Phaser.Math.Vector2(
          ((body.sprite.x - x) / distance) * strength,
          ((body.sprite.y - y) / distance) * strength - strength * 0.35,
        ),
      );
      if (body.kind === 'block') {
        this.damageBlock(body.id, damage);
      } else {
        this.damageTarget(body.id, damage);
      }
    }
    this.cameras.main.shake(180, 0.012);
  }

  private releaseImpactArea(x: number, y: number, radius = 250): void {
    for (const block of this.blocks.values()) {
      if (Phaser.Math.Distance.Between(x, y, block.sprite.x, block.sprite.y) <= radius) {
        block.sprite.setStatic(false);
      }
    }
    for (const target of this.targets.values()) {
      if (Phaser.Math.Distance.Between(x, y, target.sprite.x, target.sprite.y) <= radius) {
        target.released = true;
        target.sprite.setStatic(false);
      }
    }
  }

  private damageTarget(id: string, amount = 1): void {
    const target = this.targets.get(id);
    if (!target) {
      return;
    }

    target.hits += amount;
    const damage = resolveTargetDamage(target.kind, target.hits, target.durability);
    if (damage.score > 0) {
      this.score += damage.score;
      this.showScorePop(target.sprite.x, target.sprite.y - 48, damage.score, 0xffcf4d);
    }
    if (damage.cleared) {
      this.clearTarget(id);
      return;
    }

    const sprite = target.sprite;
    this.comboCount += 1;
    sprite.setTexture('treasure-chest-cracked');
    this.feedback?.setText(target.hits === 1 ? '宝箱裂开啦，再来一下' : '宝藏要出来啦');
    this.burst(sprite.x, sprite.y, 0x58d9ff, target.hits === 1 ? 26 : 38);
    this.showComboText(sprite.x, sprite.y - 100);
    this.tweens.add({
      targets: sprite,
      scaleX: sprite.scaleX * 1.13,
      scaleY: sprite.scaleY * 1.13,
      angle: sprite.angle + (target.hits % 2 === 0 ? -9 : 9),
      duration: 110,
      yoyo: true,
      ease: 'Back.out',
    });
    this.cameras.main.shake(150, 0.01);
    this.refreshHud();
  }

  private clearTarget(id: string): void {
    const target = this.targets.get(id);
    if (!target) {
      return;
    }
    this.targets.delete(id);
    this.targetsCleared += 1;
    const points = resolveShotScore({ targetsCleared: 1, blocksBroken: 0, shotsLeft: this.shotsLeft });
    this.score += points;
    this.comboCount += 1;
    const sprite = target.sprite;
    const isTreasureChest = target.kind === 'treasure-chest';
    const color = isTreasureChest ? 0xffcf4d : 0xff6f91;
    this.feedback?.setText(isTreasureChest ? '宝箱打开，糖果宝藏喷出来啦' : '糖果罐打飞啦');
    this.burst(sprite.x, sprite.y, color, isTreasureChest ? 58 : 32);
    this.showScorePop(sprite.x, sprite.y - 32, points, color);
    this.showComboText(sprite.x, sprite.y - 84);
    this.celebrateImpact(sprite.x, sprite.y, 'target-clear');
    this.tweens.killTweensOf(sprite);
    target.label.destroy();
    sprite.destroy();
    this.refreshHud();
    if (this.targets.size === 0) {
      // Keep the scene alive briefly so the final hit and reward celebration are visible before results.
      this.levelEnding = true;
      this.hideAbilityButton();
      this.time.delayedCall(900, () => {
        if (this.scene.isActive('GameScene')) {
          this.finish(true);
        }
      });
    }
  }

  private celebrateImpact(x: number, y: number, kind: CelebrationKind): void {
    const celebration = resolveCelebrationBonus(kind);
    this.score += celebration.score;
    const fireworks = this.add.particles(x, y, 'candy-firework', {
      speed: { min: 140, max: 430 },
      angle: { min: 0, max: 360 },
      lifespan: 820,
      quantity: celebration.particles,
      scale: { start: 1.25, end: 0 },
      gravityY: 180,
      tint: [0xff6f91, 0xffcf4d, 0x58d9ff, 0xb66dff],
      emitting: false,
    });
    fireworks.explode(celebration.particles);
    this.showScorePop(x, y - 104, celebration.score, 0xff6f91);
    this.feedback?.setText(kind === 'target-clear' ? '糖果礼花' : '彩糖连锁');
    this.cameras.main.shake(220, celebration.shake);
    this.time.delayedCall(920, () => fireworks.destroy());
  }

  private damageBlock(id: string, amount: number): void {
    const block = this.blocks.get(id);
    if (!block) {
      return;
    }
    block.hits += amount;
    const destroyed = block.hits >= block.durability;
    const points = resolveBlockDamageScore(block.material, destroyed);
    this.blocksBroken += 1;
    this.score += points;
    this.comboCount += 1;
    const sprite = block.sprite;
    const damageRatio = Math.min(1, block.hits / block.durability);
    sprite.setAlpha(destroyed ? 0.48 : 0.84 - damageRatio * 0.2);
    sprite.setTint(destroyed ? 0xf7f0d2 : MATERIAL_TINT[block.material]);
    this.tweens.add({
      targets: sprite,
      scaleX: sprite.scaleX * (destroyed ? 1.16 : 1.07),
      scaleY: sprite.scaleY * (destroyed ? 1.16 : 1.07),
      duration: 90,
      yoyo: true,
      ease: 'Sine.out',
    });
    this.burst(sprite.x, sprite.y, destroyed ? 0xffffff : 0xffcf4d, destroyed ? 24 : 12);
    this.showScorePop(sprite.x, sprite.y - 34, points, destroyed ? 0xffffff : 0xffcf4d);
    this.showComboText(sprite.x, sprite.y - 78);
    if (destroyed) {
      this.blocks.delete(id);
      this.time.delayedCall(80, () => {
        sprite.setCollisionCategory(0);
        sprite.setSensor(true);
      });
      this.tweens.add({
        targets: sprite,
        y: sprite.y + 22,
        angle: sprite.angle + Phaser.Math.Between(-12, 12),
        alpha: 0,
        duration: 620,
        ease: 'Back.in',
        onComplete: () => sprite.destroy(),
      });
    }
    this.refreshHud();
  }

  private crackBlock(id: string): void {
    this.damageBlock(id, 1);
  }

  private showComboText(x: number, y: number): void {
    const bonus = resolveComboBonus(this.comboCount);
    if (bonus <= 0) {
      return;
    }
    this.score += bonus;
    const comboText = this.add
      .text(x, y, `连击 x${this.comboCount}  +${bonus}`, {
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: '28px',
        color: '#ff6f91',
        fontStyle: '900',
        stroke: '#ffffff',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(42);
    this.tweens.add({
      targets: comboText,
      y: y - 72,
      scale: 1.18,
      alpha: 0,
      duration: 820,
      ease: 'Back.out',
      onComplete: () => comboText.destroy(),
    });
    this.triggerSugarRush();
  }

  private triggerSugarRush(): void {
    const reward = resolveSugarRushReward(this.comboCount, this.sugarRushAwarded);
    if (!reward.triggered) {
      return;
    }

    this.sugarRushAwarded = true;
    this.shotsLeft += reward.extraShots;
    this.score += reward.score;
    this.feedback?.setText('糖果狂热！奖励糖果球');
    const banner = this.add
      .text(APP_WIDTH / 2, 255, `糖果狂热！\n+${reward.extraShots} 糖果球`, {
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: '50px',
        color: '#2e4057',
        align: 'center',
        fontStyle: '900',
        stroke: '#ffffff',
        strokeThickness: 9,
      })
      .setOrigin(0.5)
      .setDepth(60)
      .setScale(0.55);
    const fireworks = this.add.particles(APP_WIDTH / 2, 245, 'candy-firework', {
      speed: { min: 180, max: 470 },
      angle: { min: 195, max: 345 },
      lifespan: 1050,
      quantity: 88,
      scale: { start: 1.35, end: 0 },
      gravityY: 220,
      tint: [0xffcf4d, 0xff6f91, 0x58d9ff, 0xffffff],
      emitting: false,
    });
    fireworks.explode(88);
    this.showScorePop(APP_WIDTH / 2, 350, reward.score, 0xffcf4d);
    this.cameras.main.flash(280, 255, 225, 90, false);
    this.cameras.main.shake(260, 0.016);
    this.tweens.add({
      targets: banner,
      scale: 1,
      duration: 260,
      ease: 'Back.out',
      yoyo: true,
      hold: 540,
      onComplete: () => banner.destroy(),
    });
    this.time.delayedCall(1150, () => fireworks.destroy());
    this.refreshHud();
  }

  private showScorePop(x: number, y: number, points: number, color: number): void {
    const pop = this.add
      .text(x, y, `+${points}`, {
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: '30px',
        color: Phaser.Display.Color.IntegerToColor(color).rgba,
        fontStyle: '900',
        stroke: '#ffffff',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(40);

    this.tweens.add({
      targets: pop,
      y: y - 62,
      scale: 1.25,
      alpha: 0,
      duration: 760,
      ease: 'Back.out',
      onComplete: () => pop.destroy(),
    });
  }

  private burst(x: number, y: number, tint: number, count: number): void {
    const particles = this.add.particles(x, y, 'spark', {
      speed: { min: 80, max: 320 },
      lifespan: 540,
      quantity: count,
      scale: { start: 0.9, end: 0 },
      gravityY: 150,
      tint,
      emitting: false,
    });
    particles.explode(count);
    this.time.delayedCall(620, () => particles.destroy());
    this.cameras.main.shake(120, 0.006);
  }

  private endShot(): void {
    if (!this.shotInFlight) {
      return;
    }
    this.clearShotHalo();
    this.hideAbilityButton();
    for (const ball of this.activeBalls) {
      this.tweens.killTweensOf(ball);
      ball.destroy();
    }
    this.activeBalls.clear();
    this.activeBall = undefined;
    this.shotInFlight = false;
    this.comboCount = 0;
    this.finishIfNeeded();
    if (this.scene.isActive('GameScene')) {
      this.spawnBall();
    }
  }

  private finishIfNeeded(): void {
    if (this.levelEnding) {
      return;
    }
    if (this.targets.size === 0) {
      this.finish(true);
      return;
    }
    if (this.shotsLeft <= 0 && !this.shotInFlight) {
      this.finish(false);
    }
  }

  private finish(won: boolean): void {
    this.hideAbilityButton();
    const stars = won ? Math.max(1, calculateStars(this.level, this.score)) : 0;
    if (won) {
      const save = updateLevelProgress(this.registry.get('save') as GameSave, LEVELS, this.level.id, this.score, stars);
      this.registry.set('save', save);
      writeSave(window.localStorage, save);
    }
    this.scene.start('ResultScene', {
      levelId: this.level.id,
      won,
      score: this.score,
      stars,
    });
  }
}
