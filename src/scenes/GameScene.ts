import Phaser from 'phaser';
import { APP_HEIGHT, APP_WIDTH, SLINGSHOT } from '../game/config';
import { LEVELS } from '../game/levels';
import {
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
  resolveShotBlast,
  resolveShotPhysics,
  resolveShotScore,
  shouldLaunchShot,
  updateLevelProgress,
} from '../game/rules';
import { writeSave } from '../game/save';
import type { BlockDefinition, BumperDefinition, CelebrationKind, CollectibleDefinition, GameSave, HazardDefinition, LevelDefinition, ShotType } from '../game/types';
import { addButton } from './ui';

type MatterImage = Phaser.Physics.Matter.Image & { gameId?: string; body: MatterJS.BodyType };
type BlockState = {
  sprite: MatterImage;
  material: BlockDefinition['material'];
  durability: number;
  hits: number;
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
};

const SHOT_LABEL: Record<ShotType, string> = {
  classic: '普通糖球',
  heavy: '重重糖球',
  bouncy: '弹弹糖球',
  blast: '爆爆糖球',
};

const SHOT_TINT: Record<ShotType, number> = {
  classic: 0xffcf4d,
  heavy: 0xb66dff,
  bouncy: 0x58d9ff,
  blast: 0xff7a59,
};

export class GameScene extends Phaser.Scene {
  private level!: LevelDefinition;
  private shotsLeft = 0;
  private score = 0;
  private targetsCleared = 0;
  private blocksBroken = 0;
  private activeBall?: MatterImage;
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
  private targets = new Map<string, MatterImage>();
  private blocks = new Map<string, BlockState>();
  private collectibles = new Map<string, MatterImage>();
  private hazards = new Map<string, MatterImage>();
  private bumpers = new Map<string, MatterImage>();
  private bumperCooldowns = new Map<string, number>();
  private isDragging = false;
  private shotInFlight = false;
  private comboCount = 0;

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
    this.bumperCooldowns.clear();
    this.activeBall = undefined;
    this.activeBallHalo = undefined;
    this.currentShotType = 'classic';
    this.shotIndex = 0;
    this.currentTrajectoryPreview = [];
    this.shotInFlight = false;
    this.comboCount = 0;
  }

  create(): void {
    this.matter.world.setBounds(0, 0, APP_WIDTH, APP_HEIGHT, 64);
    this.addBackground();
    this.addHud();
    this.createWorld();
    this.createSlingshot();
    this.bindShotInput();
    this.spawnBall();
    this.matter.world.on('collisionstart', (event: Phaser.Physics.Matter.Events.CollisionStartEvent) => {
      this.handleCollisions(event);
    });
  }

  update(): void {
    if (this.targets.size === 0) {
      return;
    }

    for (const [id, target] of this.targets) {
      if (isTargetClearedByFall(target.y)) {
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
    addButton(this, 780, 56, 150, 58, '选关', () => this.scene.start('LevelScene'));
    this.refreshHud();
  }

  private refreshHud(): void {
    this.hud?.setText(`第 ${this.level.id} 关  ${this.level.name}\n分数 ${this.score}  糖果球 ${this.shotsLeft}`);
    this.ballTypeText?.setText(`当前：${SHOT_LABEL[this.currentShotType]}`);
    this.ballTypeText?.setColor(Phaser.Display.Color.IntegerToColor(SHOT_TINT[this.currentShotType]).rgba);
  }

  private createWorld(): void {
    this.matter.add.rectangle(APP_WIDTH / 2, 930, APP_WIDTH, 90, { isStatic: true, label: 'ground' });
    const floor = this.add.graphics();
    floor.fillStyle(0x3f9e61, 0.3);
    floor.fillRoundedRect(0, 884, APP_WIDTH, 82, 18);

    for (const block of this.level.blocks) {
      const sprite = this.matter.add.image(block.x, block.y, `block-${block.material}`, undefined, {
        density: MATERIAL_DENSITY[block.material],
        friction: 0.78,
        frictionAir: 0.012,
        restitution: block.material === 'jelly' ? 0.42 : 0.16,
        label: `block:${block.id}`,
      }) as MatterImage;
      sprite.gameId = block.id;
      sprite.setDisplaySize(block.width, block.height);
      sprite.setRectangle(block.width, block.height);
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
      const jar = this.matter.add.image(target.x, target.y, 'target-jar', undefined, {
        density: 0.0012,
        friction: 0.55,
        frictionAir: 0.01,
        restitution: 0.24,
        label: `target:${target.id}`,
      }) as MatterImage;
      jar.gameId = target.id;
      jar.setCircle(33);
      jar.body.label = `target:${target.id}`;
      jar.setScale(0.95);
      this.targets.set(target.id, jar);
      this.add
        .text(target.x, target.y + 55, '糖果罐', {
          fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
          fontSize: '18px',
          color: '#2e4057',
          fontStyle: '900',
          stroke: '#ffffff',
          strokeThickness: 3,
        })
        .setOrigin(0.5);
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
  }

  private createCollectible(collectible: CollectibleDefinition): void {
    const star = this.matter.add.image(collectible.x, collectible.y, 'bonus-star', undefined, {
      isStatic: true,
      isSensor: true,
      label: `collectible:${collectible.id}`,
    }) as MatterImage;
    star.gameId = collectible.id;
    star.setCircle(30);
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
    const bomb = this.matter.add.image(hazard.x, hazard.y, 'frosting-bomb', undefined, {
      density: 0.001,
      friction: 0.45,
      frictionAir: 0.01,
      restitution: 0.38,
      label: `hazard:${hazard.id}`,
    }) as MatterImage;
    bomb.gameId = hazard.id;
    bomb.setCircle(34);
    bomb.body.label = `hazard:${hazard.id}`;
    bomb.setDepth(13);
    this.hazards.set(hazard.id, bomb);
  }

  private createBumper(bumper: BumperDefinition): void {
    const bumperBody = this.matter.add.image(bumper.x, bumper.y, 'bounce-pad', undefined, {
      isStatic: true,
      friction: 0.08,
      restitution: 1.18,
      label: `bumper:${bumper.id}`,
    }) as MatterImage;
    bumperBody.gameId = bumper.id;
    bumperBody.setRectangle(148, 42, { chamfer: { radius: 21 } });
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
    this.drawLastTrajectory();
    const physics = resolveShotPhysics(this.currentShotType);
    const ball = this.matter.add.image(SLINGSHOT.x, SLINGSHOT.y, SHOT_TEXTURE[this.currentShotType], undefined, {
      isStatic: true,
      restitution: physics.restitution,
      friction: 0.4,
      frictionAir: 0.01,
      density: physics.density,
      label: 'ball',
    }) as MatterImage;
    ball.setCircle(34);
    ball.body.label = 'ball';
    ball.setInteractive({ draggable: true, useHandCursor: true });
    ball.setDepth(20);
    this.activeBall = ball;
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
    if (this.shotInFlight || !this.activeBall) {
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
    this.time.delayedCall(5200, () => this.endShot());
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
        const targetLabel = labels.find((label) => label.startsWith('target:'));
        const blockLabel = labels.find((label) => label.startsWith('block:'));
        const collectibleLabel = labels.find((label) => label.startsWith('collectible:'));
        const hazardLabel = labels.find((label) => label.startsWith('hazard:'));
        const bumperLabel = labels.find((label) => label.startsWith('bumper:'));
        if (targetLabel) {
          this.clearTarget(targetLabel.replace('target:', ''));
        }
        if (blockLabel) {
          this.damageBlock(blockLabel.replace('block:', ''), 1);
          this.triggerShotBlast(pair.collision.supports?.[0]?.x ?? this.activeBall?.x ?? 0, pair.collision.supports?.[0]?.y ?? this.activeBall?.y ?? 0);
        }
        if (collectibleLabel) {
          this.collectStar(collectibleLabel.replace('collectible:', ''));
        }
        if (hazardLabel) {
          this.triggerFrostingBomb(hazardLabel.replace('hazard:', ''));
        }
        if (bumperLabel) {
          this.triggerBumper(bumperLabel.replace('bumper:', ''));
        }
      }
    }
  }

  private triggerBumper(id: string): void {
    const bumper = this.bumpers.get(id);
    if (!bumper || !this.activeBall) {
      return;
    }

    const now = this.time.now;
    if ((this.bumperCooldowns.get(id) ?? 0) > now) {
      return;
    }

    const hit = resolveBumperHit('bounce-pad');
    this.bumperCooldowns.set(id, now + hit.cooldownMs);
    const normalAngle = Phaser.Math.DegToRad(bumper.angle - 90);
    this.activeBall.setVelocity(Math.cos(normalAngle) * hit.impulse, Math.sin(normalAngle) * hit.impulse);
    this.activeBall.setAngularVelocity(0.32);
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
    const bodies = [...Array.from(this.blocks.values(), (block) => block.sprite), ...this.targets.values()];
    for (const body of bodies) {
      const distance = Phaser.Math.Distance.Between(x, y, body.x, body.y);
      if (distance > radius || distance <= 1) {
        continue;
      }
      const strength = (1 - distance / radius) * force;
      body.applyForce(
        new Phaser.Math.Vector2(
          ((body.x - x) / distance) * strength,
          ((body.y - y) / distance) * strength - strength * 0.35,
        ),
      );
      this.damageBlock(body.gameId ?? '', damage);
    }
    this.cameras.main.shake(180, 0.012);
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
    this.feedback?.setText('糖果罐打飞啦');
    this.burst(target.x, target.y, 0xff6f91, 32);
    this.showScorePop(target.x, target.y - 32, points, 0xff6f91);
    this.showComboText(target.x, target.y - 84);
    this.celebrateImpact(target.x, target.y, 'target-clear');
    target.destroy();
    this.refreshHud();
    this.finishIfNeeded();
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
    this.activeBall?.destroy();
    this.clearShotHalo();
    this.activeBall = undefined;
    this.shotInFlight = false;
    this.comboCount = 0;
    this.finishIfNeeded();
    if (this.scene.isActive('GameScene')) {
      this.spawnBall();
    }
  }

  private finishIfNeeded(): void {
    if (this.targets.size === 0) {
      this.finish(true);
      return;
    }
    if (this.shotsLeft <= 0 && !this.shotInFlight) {
      this.finish(false);
    }
  }

  private finish(won: boolean): void {
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
