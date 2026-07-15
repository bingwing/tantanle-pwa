# 游戏节奏与反馈闭环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让糖果球按真实运动状态快速结束回合，统一命中反馈，明确飞行技能，并补上可静音的本地音效。

**Architecture:** 将可独立验证的回合判断放入 `shotLifecycle.ts`，由 `GameScene.update()` 每帧输入所有活动球状态；场景层继续负责 Phaser 对象清理和下一球生成。反馈仍由 `GameScene` 编排，但普通得分与连击共用一个聚合文字；程序化音效由一个跨场景共享的 `CandyAudio` 实例提供。

**Tech Stack:** TypeScript 5、Phaser 3.90 Matter Physics、Web Audio API、Vitest 2、Vite 5、PWA/GitHub Pages。

## Global Constraints

- 保持纯本地 PWA，不增加账号、广告、内购、排行榜、埋点、后端或网络音频资源。
- 保持 `tantanle-save-v1`、`GameSave.version = 1`、关卡编号和已解锁进度兼容。
- 有效命中后 150ms 内出现明显反馈；球停止后最多 1.2 秒可操作下一球。
- 分裂球必须等待全部子球结束；高速运动、传送或反弹中的球不得提前回收。
- 低帧率或从后台恢复时不能因单帧超大 `delta` 立即结束回合。
- 不整体拆分 `GameScene`，只抽取有独立规则或跨场景复用价值的模块。
- 每个行为先写失败测试，再写最小实现；完成后运行全量测试、构建和桌面/iPad 实玩。

---

### Task 1: 动态回合结束规则

**Files:**
- Create: `src/game/shotLifecycle.ts`
- Create: `tests/shotLifecycle.test.ts`

**Interfaces:**
- Produces: `SHOT_LIFECYCLE` 时间与速度常量。
- Produces: `createShotLifecycleState(): ShotLifecycleState`。
- Produces: `advanceShotLifecycle(state, deltaMs, balls, width, height): ShotLifecycleResult`。

- [ ] **Step 1: 写低速、多球、出界和兜底的失败测试**

```ts
import { describe, expect, it } from 'vitest';
import {
  SHOT_LIFECYCLE,
  advanceShotLifecycle,
  createShotLifecycleState,
} from '../src/game/shotLifecycle';

const stoppedBall = { x: 450, y: 900, speed: 0.1, angularSpeed: 0.01 };
const movingBall = { x: 500, y: 600, speed: 4, angularSpeed: 0.2 };

describe('shot lifecycle', () => {
  it('ends after every in-play ball remains settled for the configured window', () => {
    let state = createShotLifecycleState();
    let result = advanceShotLifecycle(state, 0, [movingBall], 900, 1200);
    for (let elapsed = 0; elapsed < SHOT_LIFECYCLE.minFlightMs; elapsed += SHOT_LIFECYCLE.maxDeltaMs) {
      result = advanceShotLifecycle(result.state, SHOT_LIFECYCLE.maxDeltaMs, [movingBall], 900, 1200);
    }
    for (let settled = 0; settled < 400; settled += SHOT_LIFECYCLE.maxDeltaMs) {
      result = advanceShotLifecycle(result.state, SHOT_LIFECYCLE.maxDeltaMs, [stoppedBall], 900, 1200);
    }
    expect(result.shouldEnd).toBe(false);

    result = advanceShotLifecycle(result.state, 50, [stoppedBall], 900, 1200);
    expect(result.shouldEnd).toBe(true);
    expect(result.reason).toBe('settled');
  });

  it('resets settling when any split ball is still moving', () => {
    let state = advanceShotLifecycle(createShotLifecycleState(), 400, [stoppedBall], 900, 1200).state;
    state = advanceShotLifecycle(state, 100, [stoppedBall, movingBall], 900, 1200).state;
    expect(state.settledMs).toBe(0);
  });

  it('ends immediately when every ball is outside the playable sides or bottom', () => {
    const result = advanceShotLifecycle(
      createShotLifecycleState(),
      16,
      [{ ...movingBall, x: 1100 }, { ...movingBall, y: 1400 }],
      900,
      1200,
    );
    expect(result).toMatchObject({ shouldEnd: true, reason: 'out-of-play' });
  });

  it('rejects non-finite motion and caps a background-frame delta', () => {
    const invalid = { ...stoppedBall, speed: Number.NaN };
    const result = advanceShotLifecycle(createShotLifecycleState(), 60_000, [invalid], 900, 1200);
    expect(result.state.elapsedMs).toBe(SHOT_LIFECYCLE.maxDeltaMs);
    expect(result.shouldEnd).toBe(false);
  });

  it('uses a maximum elapsed fallback for a permanently moving ball', () => {
    let state = createShotLifecycleState();
    let result = advanceShotLifecycle(state, 0, [movingBall], 900, 1200);
    while (!result.shouldEnd) {
      result = advanceShotLifecycle(result.state, SHOT_LIFECYCLE.maxDeltaMs, [movingBall], 900, 1200);
    }
    expect(result.reason).toBe('timeout');
    expect(result.state.elapsedMs).toBe(SHOT_LIFECYCLE.maxFlightMs);
  });
});
```

- [ ] **Step 2: 运行测试并确认缺少模块**

Run: `npm test -- tests/shotLifecycle.test.ts`

Expected: FAIL，提示无法解析 `../src/game/shotLifecycle`。

- [ ] **Step 3: 实现纯回合规则**

```ts
export const SHOT_LIFECYCLE = {
  minFlightMs: 700,
  settleMs: 450,
  maxFlightMs: 7000,
  maxDeltaMs: 100,
  maxSpeed: 0.72,
  maxAngularSpeed: 0.08,
  boundsPadding: 120,
  nextBallDelayMs: 280,
} as const;

export type ShotBallMotion = {
  x: number;
  y: number;
  speed: number;
  angularSpeed: number;
};

export type ShotLifecycleState = {
  elapsedMs: number;
  settledMs: number;
};

export type ShotEndReason = 'settled' | 'out-of-play' | 'timeout';

export type ShotLifecycleResult = {
  state: ShotLifecycleState;
  shouldEnd: boolean;
  reason?: ShotEndReason;
};

export function createShotLifecycleState(): ShotLifecycleState {
  return { elapsedMs: 0, settledMs: 0 };
}

export function advanceShotLifecycle(
  state: ShotLifecycleState,
  deltaMs: number,
  balls: ShotBallMotion[],
  width: number,
  height: number,
): ShotLifecycleResult {
  const stepMs = Math.min(SHOT_LIFECYCLE.maxDeltaMs, Math.max(0, Number.isFinite(deltaMs) ? deltaMs : 0));
  const elapsedMs = Math.min(SHOT_LIFECYCLE.maxFlightMs, state.elapsedMs + stepMs);
  const isOutOfPlay = (ball: ShotBallMotion) =>
    ball.x < -SHOT_LIFECYCLE.boundsPadding ||
    ball.x > width + SHOT_LIFECYCLE.boundsPadding ||
    ball.y > height + SHOT_LIFECYCLE.boundsPadding;

  if (balls.length > 0 && balls.every(isOutOfPlay)) {
    return { state: { elapsedMs, settledMs: state.settledMs }, shouldEnd: true, reason: 'out-of-play' };
  }

  const inPlayBalls = balls.filter((ball) => !isOutOfPlay(ball));
  const allSettled =
    inPlayBalls.length > 0 &&
    inPlayBalls.every(
      (ball) =>
        Number.isFinite(ball.speed) &&
        Number.isFinite(ball.angularSpeed) &&
        ball.speed <= SHOT_LIFECYCLE.maxSpeed &&
        ball.angularSpeed <= SHOT_LIFECYCLE.maxAngularSpeed,
    );
  const settledMs = allSettled ? state.settledMs + stepMs : 0;
  const nextState = { elapsedMs, settledMs };
  if (elapsedMs >= SHOT_LIFECYCLE.maxFlightMs) {
    return { state: nextState, shouldEnd: true, reason: 'timeout' };
  }
  if (elapsedMs >= SHOT_LIFECYCLE.minFlightMs && settledMs >= SHOT_LIFECYCLE.settleMs) {
    return { state: nextState, shouldEnd: true, reason: 'settled' };
  }
  return { state: nextState, shouldEnd: false };
}
```

- [ ] **Step 4: 运行定向测试**

Run: `npm test -- tests/shotLifecycle.test.ts`

Expected: PASS，5 个测试全部通过。

- [ ] **Step 5: 提交回合规则**

```bash
git add src/game/shotLifecycle.ts tests/shotLifecycle.test.ts
git commit -m "新增动态回合结束规则"
```

---

### Task 2: 将动态回合规则接入 Phaser 场景

**Files:**
- Modify: `src/scenes/GameScene.ts`
- Create: `tests/shotLifecycleScene.test.ts`

**Interfaces:**
- Consumes: `SHOT_LIFECYCLE`、`createShotLifecycleState()`、`advanceShotLifecycle()`。
- Produces: `GameScene.update(_time, delta)` 驱动的回合结束流程和受保护的下一球生成。

- [ ] **Step 1: 写场景接入的失败契约测试**

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('dynamic shot lifecycle scene integration', () => {
  it('advances lifecycle from update instead of using the fixed shot timer', () => {
    const source = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8');
    expect(source).toContain('advanceShotLifecycle');
    expect(source).toContain('SHOT_LIFECYCLE.nextBallDelayMs');
    expect(source).not.toContain('delayedCall(5200');
  });

  it('guards delayed respawn against scene exit and level completion', () => {
    const source = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8');
    expect(source).toContain("this.scene.isActive('GameScene')");
    expect(source).toContain('!this.levelEnding');
    expect(source).toContain('!this.shotInFlight');
  });
});
```

- [ ] **Step 2: 运行测试并确认仍存在固定 5200ms 延迟**

Run: `npm test -- tests/shotLifecycleScene.test.ts`

Expected: FAIL，`advanceShotLifecycle` 和 `SHOT_LIFECYCLE.nextBallDelayMs` 不存在于场景源码。

- [ ] **Step 3: 接入每帧回合采样**

在 `GameScene` 中导入回合规则，新增 `shotLifecycle` 状态；`releaseBall()` 重置状态并移除固定延迟。将 `update()` 改为接收 `delta`，先采样全部活动球，再执行目标掉落检查：

```ts
private shotLifecycle = createShotLifecycleState();

update(_time: number, delta: number): void {
  if (this.shotInFlight) {
    const result = advanceShotLifecycle(
      this.shotLifecycle,
      delta,
      Array.from(this.activeBalls, (ball) => ({
        x: ball.x,
        y: ball.y,
        speed: ball.body.speed,
        angularSpeed: ball.body.angularSpeed,
      })),
      APP_WIDTH,
      APP_HEIGHT,
    );
    this.shotLifecycle = result.state;
    this.drawAbilityProgress(result.state.elapsedMs);
    if (result.shouldEnd) {
      this.endShot();
    }
  }

  for (const [id, target] of this.targets) {
    target.label.setPosition(target.sprite.x, target.sprite.y + (target.kind === 'treasure-chest' ? 68 : 55));
    if (target.kind === 'jar' && target.released && isTargetClearedByFall(target.sprite.y)) {
      this.clearTarget(id);
    }
  }
}
```

- [ ] **Step 4: 让结束和下一球生成保持幂等**

`endShot()` 清理活动球后先执行现有结算，再只在场景仍活动、目标未清空且还有球时延迟 280ms 生成：

```ts
this.finishIfNeeded();
if (this.shotsLeft > 0 && this.targets.size > 0 && !this.levelEnding) {
  this.time.delayedCall(SHOT_LIFECYCLE.nextBallDelayMs, () => {
    if (
      this.scene.isActive('GameScene') &&
      !this.levelEnding &&
      !this.shotInFlight &&
      !this.activeBall &&
      this.targets.size > 0
    ) {
      this.spawnBall();
    }
  });
}
```

同时在 `spawnBall()` 开头拒绝 `activeBall`、`shotInFlight` 或 `levelEnding` 状态下重复生成。

- [ ] **Step 5: 运行回合与既有物理测试**

Run: `npm test -- tests/shotLifecycle.test.ts tests/shotLifecycleScene.test.ts tests/gameSceneInput.test.ts tests/matterBodyLifecycle.test.ts tests/fallClearance.test.ts`

Expected: PASS。

- [ ] **Step 6: 提交场景接入**

```bash
git add src/scenes/GameScene.ts tests/shotLifecycleScene.test.ts
git commit -m "接入动态糖果球回合"
```

---

### Task 3: 聚合得分反馈并明确技能按钮

**Files:**
- Modify: `src/scenes/GameScene.ts`
- Modify: `tests/playFeedback.test.ts`
- Modify: `tests/shotAbilities.test.ts`

**Interfaces:**
- Consumes: `shotLifecycle.elapsedMs` 与 `SHOT_LIFECYCLE.maxFlightMs`。
- Produces: 单一聚合得分提示、带优先级顶部消息、技能名称和进度环。

- [ ] **Step 1: 写聚合反馈和技能标签的失败测试**

向现有测试增加源码契约：

```ts
expect(source).toContain('scorePopupPoints');
expect(source).toContain('feedbackProtectedUntil');
expect(source).toContain('abilityButtonLabel');
expect(source).toContain('abilityProgress');
expect(source).toContain("classic: '冲刺'");
expect(source).not.toContain('const comboText = this.add');
```

- [ ] **Step 2: 运行定向测试并确认失败**

Run: `npm test -- tests/playFeedback.test.ts tests/shotAbilities.test.ts`

Expected: FAIL，聚合字段和技能名称尚不存在。

- [ ] **Step 3: 为顶部消息增加优先级保护**

在 `GameScene` 增加 `showFeedback(message, priority, protectMs)`，替换直接的 `feedback.setText()`：

```ts
private feedbackPriority = 0;
private feedbackProtectedUntil = 0;

private showFeedback(message: string, priority = 0, protectMs = 260): void {
  if (!this.feedback || (this.time.now < this.feedbackProtectedUntil && priority < this.feedbackPriority)) {
    return;
  }
  this.feedbackPriority = priority;
  this.feedbackProtectedUntil = this.time.now + protectMs;
  this.feedback.setText(message).setAlpha(1).setScale(0.92);
  this.tweens.killTweensOf(this.feedback);
  this.tweens.add({ targets: this.feedback, scale: 1, duration: 140, ease: 'Back.out' });
}
```

准备和发射使用优先级 0，普通命中为 1，目标清除为 2，糖果狂热为 3。`celebrateImpact()` 的普通庆祝不得覆盖刚显示的目标清除消息。

- [ ] **Step 4: 将得分与连击合并为一个文字对象**

复用 `showScorePop()` 入口，短时间内累加分数并复位消失计时；`showComboText()` 只计算奖金并追加到同一个提示：

```ts
const IMPACT_TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
  fontSize: '30px',
  color: '#ff6f91',
  fontStyle: '900',
  stroke: '#ffffff',
  strokeThickness: 6,
};

private scorePopup?: Phaser.GameObjects.Text;
private scorePopupPoints = 0;
private scorePopupCombo = 0;
private scorePopupTimer?: Phaser.Time.TimerEvent;

private showScorePop(x: number, y: number, points: number, color: number, combo = 0): void {
  if (!this.scorePopup?.active) {
    this.scorePopupPoints = 0;
    this.scorePopupCombo = 0;
    this.scorePopup = this.add.text(x, y, '', IMPACT_TEXT_STYLE).setOrigin(0.5).setDepth(44);
  }
  this.scorePopupPoints += points;
  this.scorePopupCombo = Math.max(this.scorePopupCombo, combo);
  this.scorePopup
    .setPosition(Phaser.Math.Clamp(x, 110, APP_WIDTH - 110), Phaser.Math.Clamp(y, 230, 820))
    .setText(`+${this.scorePopupPoints}${this.scorePopupCombo >= 2 ? `  连击 x${this.scorePopupCombo}` : ''}`)
    .setColor(Phaser.Display.Color.IntegerToColor(color).rgba)
    .setAlpha(1)
    .setScale(0.88);
  this.tweens.killTweensOf(this.scorePopup);
  this.tweens.add({ targets: this.scorePopup, scale: 1.06, y: this.scorePopup.y - 12, duration: 130, ease: 'Back.out' });
  this.scorePopupTimer?.remove(false);
  this.scorePopupTimer = this.time.delayedCall(520, () => this.fadeScorePopup());
}

private fadeScorePopup(): void {
  const popup = this.scorePopup;
  this.scorePopupTimer = undefined;
  if (!popup?.active) {
    return;
  }
  this.tweens.add({
    targets: popup,
    y: popup.y - 54,
    alpha: 0,
    duration: 360,
    ease: 'Sine.in',
    onComplete: () => {
      if (this.scorePopup === popup) {
        popup.destroy();
        this.scorePopup = undefined;
        this.scorePopupPoints = 0;
        this.scorePopupCombo = 0;
      }
    },
  });
}
```

`showComboText()` 调用 `showScorePop(x, y, bonus, 0xff6f91, this.comboCount)`，不再创建 `comboText`。

- [ ] **Step 5: 给技能按钮增加短名称和进度环**

新增技能名称映射和 UI 字段：

```ts
const SHOT_ABILITY_LABEL: Record<ShotType, string> = {
  classic: '冲刺',
  heavy: '坠击',
  bouncy: '跃起',
  blast: '引爆',
  split: '分裂',
};
```

`createAbilityButton()` 在现有圆形图标下方放置 24px 名称，并创建 `abilityProgress` graphics。`showAbilityButton()` 设置名称、恢复交互；`drawAbilityProgress(elapsedMs)` 围绕按钮绘制从 100% 到 0% 的 7px 圆弧：

```ts
private abilityButtonLabel?: Phaser.GameObjects.Text;
private abilityProgress?: Phaser.GameObjects.Graphics;
private abilityButtonHit?: Phaser.GameObjects.Zone;

private drawAbilityProgress(elapsedMs: number): void {
  if (!this.abilityProgress || !this.abilityButton?.visible) {
    return;
  }
  const remaining = 1 - Phaser.Math.Clamp(elapsedMs / SHOT_LIFECYCLE.maxFlightMs, 0, 1);
  this.abilityProgress.clear();
  this.abilityProgress.lineStyle(7, 0xffffff, 0.94);
  this.abilityProgress.beginPath();
  this.abilityProgress.arc(0, 0, 70, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * remaining);
  this.abilityProgress.strokePath();
}

private consumeAbilityButton(): void {
  this.abilityButtonHit?.disableInteractive();
  this.abilityButtonLabel?.setText('已触发');
  if (this.abilityButton) {
    this.tweens.add({ targets: this.abilityButton, scale: 1.1, duration: 90, yoyo: true });
  }
  this.time.delayedCall(180, () => this.hideAbilityButton());
}
```

技能触发后调用 `consumeAbilityButton()`；`showAbilityButton()` 重新设置 `SHOT_ABILITY_LABEL`、恢复 hit zone 交互并绘制完整进度环。

- [ ] **Step 6: 缩小糖果狂热横幅并避免额外得分文字重叠**

将横幅字号从 50px 调整为 42px、位置保持在 HUD 下方；奖励分数继续进入聚合提示。保留粒子和镜头反馈，不新增第二个横幅。

- [ ] **Step 7: 运行反馈和技能测试**

Run: `npm test -- tests/playFeedback.test.ts tests/shotAbilities.test.ts tests/sugarRush.test.ts tests/celebrationFeedback.test.ts`

Expected: PASS。

- [ ] **Step 8: 提交反馈交互**

```bash
git add src/scenes/GameScene.ts tests/playFeedback.test.ts tests/shotAbilities.test.ts
git commit -m "优化命中反馈与飞行技能交互"
```

---

### Task 4: 程序化音效与持久静音

**Files:**
- Create: `src/game/audio.ts`
- Modify: `src/game/save.ts`
- Modify: `src/scenes/BootScene.ts`
- Modify: `src/scenes/MenuScene.ts`
- Modify: `src/scenes/GameScene.ts`
- Modify: `src/scenes/ResultScene.ts`
- Modify: `src/scenes/ui.ts`
- Create: `tests/soundPreference.test.ts`
- Create: `tests/audioIntegration.test.ts`

**Interfaces:**
- Produces: `CandyAudio`、`CandySoundCue`、`setEnabled()`、`play()`。
- Produces: `updateSoundPreference(save, enabled): GameSave`。
- Produces: `addSoundToggle(scene, x, y, enabled, onToggle)`。

- [ ] **Step 1: 写声音偏好和场景接入失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { createDefaultSave } from '../src/game/rules';
import { LEVELS } from '../src/game/levels';
import { updateSoundPreference } from '../src/game/save';

describe('sound preference', () => {
  it('only changes soundEnabled and preserves level progress', () => {
    const save = createDefaultSave(LEVELS);
    const updated = updateSoundPreference(save, false);
    expect(updated.soundEnabled).toBe(false);
    expect(updated.levels).toEqual(save.levels);
    expect(updated.lastUnlockedLevel).toBe(save.lastUnlockedLevel);
  });
});
```

`audioIntegration.test.ts` 读取场景源码，确认 `BootScene` 注册 `CandyAudio`、菜单和游戏使用 `addSoundToggle`、结果页调用 `win`/`lose`，且没有 `.mp3`、`.wav` 或远端 URL。

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('audio scene integration', () => {
  it('shares local synthesized audio and exposes sound toggles', () => {
    const boot = readFileSync(new URL('../src/scenes/BootScene.ts', import.meta.url), 'utf8');
    const menu = readFileSync(new URL('../src/scenes/MenuScene.ts', import.meta.url), 'utf8');
    const game = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8');
    const result = readFileSync(new URL('../src/scenes/ResultScene.ts', import.meta.url), 'utf8');
    const sources = `${boot}\n${menu}\n${game}\n${result}`;

    expect(boot).toContain('new CandyAudio');
    expect(menu).toContain('addSoundToggle');
    expect(game).toContain('addSoundToggle');
    expect(result).toContain("this.audio?.play(this.won ? 'win' : 'lose')");
    expect(sources).not.toMatch(/https?:\/\//);
    expect(sources).not.toMatch(/\.(mp3|wav)/);
  });
});
```

- [ ] **Step 2: 运行测试并确认缺少音效实现**

Run: `npm test -- tests/soundPreference.test.ts tests/audioIntegration.test.ts`

Expected: FAIL，`updateSoundPreference` 和 `CandyAudio` 尚不存在。

- [ ] **Step 3: 实现无资源的 Web Audio 短音效**

`audio.ts` 定义七类 cue 和短音符序列：

```ts
export type CandySoundCue = 'launch' | 'impact' | 'combo' | 'ability' | 'blast' | 'win' | 'lose';

type SoundNote = {
  frequency: number;
  offset: number;
  duration: number;
  volume: number;
  type: OscillatorType;
};

const SOUND_PATTERNS: Record<CandySoundCue, readonly SoundNote[]> = {
  launch: [
    { frequency: 330, offset: 0, duration: 0.08, volume: 0.08, type: 'triangle' },
    { frequency: 494, offset: 0.05, duration: 0.12, volume: 0.1, type: 'triangle' },
  ],
  impact: [{ frequency: 180, offset: 0, duration: 0.08, volume: 0.055, type: 'square' }],
  combo: [
    { frequency: 523, offset: 0, duration: 0.1, volume: 0.07, type: 'sine' },
    { frequency: 659, offset: 0.07, duration: 0.13, volume: 0.08, type: 'sine' },
  ],
  ability: [
    { frequency: 392, offset: 0, duration: 0.1, volume: 0.08, type: 'triangle' },
    { frequency: 784, offset: 0.06, duration: 0.16, volume: 0.07, type: 'sine' },
  ],
  blast: [
    { frequency: 120, offset: 0, duration: 0.22, volume: 0.09, type: 'sawtooth' },
    { frequency: 70, offset: 0.04, duration: 0.3, volume: 0.07, type: 'square' },
  ],
  win: [
    { frequency: 523, offset: 0, duration: 0.14, volume: 0.08, type: 'sine' },
    { frequency: 659, offset: 0.11, duration: 0.14, volume: 0.08, type: 'sine' },
    { frequency: 784, offset: 0.22, duration: 0.22, volume: 0.09, type: 'sine' },
  ],
  lose: [
    { frequency: 330, offset: 0, duration: 0.14, volume: 0.06, type: 'triangle' },
    { frequency: 294, offset: 0.12, duration: 0.14, volume: 0.06, type: 'triangle' },
    { frequency: 247, offset: 0.24, duration: 0.2, volume: 0.055, type: 'triangle' },
  ],
};

export class CandyAudio {
  private context?: AudioContext;
  private lastPlayedAt = new Map<CandySoundCue, number>();

  constructor(private enabled: boolean) {}

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  play(cue: CandySoundCue): void {
    if (!this.enabled) return;
    const now = performance.now();
    const minimumGap = cue === 'impact' ? 55 : cue === 'combo' ? 90 : 0;
    if (now - (this.lastPlayedAt.get(cue) ?? -Infinity) < minimumGap) return;
    this.lastPlayedAt.set(cue, now);
    try {
      this.context ??= new AudioContext();
      if (this.context.state === 'suspended') {
        void this.context.resume().then(() => this.schedule(cue)).catch(() => undefined);
        return;
      }
      this.schedule(cue);
    } catch {
      // Audio is optional; unsupported or restricted contexts stay silent.
    }
  }

  private schedule(cue: CandySoundCue): void {
    const context = this.context;
    if (!context) return;
    const baseTime = context.currentTime + 0.005;
    for (const note of SOUND_PATTERNS[cue]) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const startsAt = baseTime + note.offset;
      const endsAt = startsAt + note.duration;
      oscillator.type = note.type;
      oscillator.frequency.setValueAtTime(note.frequency, startsAt);
      gain.gain.setValueAtTime(0.0001, startsAt);
      gain.gain.exponentialRampToValueAtTime(note.volume, startsAt + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, endsAt);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startsAt);
      oscillator.stop(endsAt + 0.02);
    }
  }
}
```

所有 note 最长低于 500ms。失败只静音，不抛错到游戏流程。

- [ ] **Step 4: 实现偏好更新和共享声音按钮**

`save.ts` 增加：

```ts
export function updateSoundPreference(save: GameSave, soundEnabled: boolean): GameSave {
  return { ...save, soundEnabled };
}
```

`ui.ts` 增加固定 64x58 的 `addSoundToggle()`，使用音符图形和斜线表达开关，不依赖 emoji 字体；返回 `setEnabled()` 供场景即时更新：

```ts
export type SoundToggle = {
  container: Phaser.GameObjects.Container;
  setEnabled: (enabled: boolean) => void;
};

export function addSoundToggle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  enabled: boolean,
  onToggle: (enabled: boolean) => void,
): SoundToggle {
  const background = scene.add.graphics();
  const slash = scene.add.graphics();
  const note = scene.add.text(0, -1, '♪', {
    fontFamily: 'Arial, sans-serif',
    fontSize: '34px',
    color: '#2e4057',
    fontStyle: '900',
  }).setOrigin(0.5);
  const hit = scene.add.zone(0, 0, 64, 58).setInteractive({ useHandCursor: true });
  const container = scene.add.container(x, y, [background, note, slash, hit]);
  let soundEnabled = enabled;

  const draw = () => {
    background.clear().fillStyle(0xffffff, 0.94).fillRoundedRect(-32, -29, 64, 58, 8);
    background.lineStyle(4, 0x2e4057, 0.16).strokeRoundedRect(-32, -29, 64, 58, 8);
    note.setAlpha(soundEnabled ? 1 : 0.42);
    slash.clear();
    if (!soundEnabled) {
      slash.lineStyle(5, 0xff6f91, 0.95).lineBetween(-19, -19, 19, 19);
    }
  };
  hit.on('pointerdown', () => container.setScale(0.94));
  hit.on('pointerup', () => {
    container.setScale(1);
    soundEnabled = !soundEnabled;
    draw();
    onToggle(soundEnabled);
  });
  hit.on('pointerout', () => container.setScale(1));
  draw();
  return {
    container,
    setEnabled: (nextEnabled) => {
      soundEnabled = nextEnabled;
      draw();
    },
  };
}
```

- [ ] **Step 5: 接入所有关键场景**

- `BootScene`：加载 save 后创建 `new CandyAudio(save.soundEnabled)` 并写入 registry 的 `audio`。
- `MenuScene`、`GameScene`：声音按钮切换后调用 `updateSoundPreference()`、`writeSave()`、`audio.setEnabled()` 和按钮 `setEnabled()`。
- `GameScene`：发射、积木命中、连击、技能和爆炸分别播放对应 cue。
- `ResultScene`：创建时按结果播放 `win` 或 `lose`。

- [ ] **Step 6: 运行声音与存档测试**

Run: `npm test -- tests/soundPreference.test.ts tests/audioIntegration.test.ts tests/rules.test.ts tests/pwa.test.ts`

Expected: PASS。

- [ ] **Step 7: 提交本地音效**

```bash
git add src/game/audio.ts src/game/save.ts src/scenes/BootScene.ts src/scenes/MenuScene.ts src/scenes/GameScene.ts src/scenes/ResultScene.ts src/scenes/ui.ts tests/soundPreference.test.ts tests/audioIntegration.test.ts
git commit -m "增加本地糖果音效与静音开关"
```

---

### Task 5: 全量回归、实玩和必要关卡调优

**Files:**
- Modify if evidence requires: `src/game/levels.ts`
- Modify if evidence requires: `tests/levels.test.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: 完整动态回合、反馈和音效流程。
- Produces: 桌面与 iPad 均可连续游玩的发布构建。

- [ ] **Step 1: 运行全量自动化验证**

Run: `npm test`

Expected: PASS，全部 Vitest 用例通过。

Run: `npm run build`

Expected: PASS，TypeScript 无错误并生成 `dist/`。

- [ ] **Step 2: 启动独立预览端口**

Run: `npm run dev -- --port 4194`

Expected: Vite 输出 `http://localhost:4194/`；若端口占用，选择空闲端口并记录最终 URL。

- [ ] **Step 3: 桌面连续实玩 3 关**

在浏览器清理或使用现有本地存档，依次验证：

- 第 1 关有效命中在一帧内出现粒子、聚合得分和音效；球停止后 1.2 秒内下一球可拖动。
- 第 2 关触发炸弹和技能，按钮名称、进度环、已触发状态正确，爆炸反馈不与糖果狂热重叠。
- 第 3 关完成或失败重开后继续发射，结果页只出现一次，下一关按钮正常。
- 额外空射一次，确认球出界后快速生成下一球；分裂球关卡确认任一子球仍运动时不提前结束。

- [ ] **Step 4: 只按实玩证据调整关卡宽容度**

如果第 1-3 关任一关在三次稳定命中后仍无法完成，仅修改该关遮挡目标的材料或位置，并在 `tests/levels.test.ts` 固化对应目标、机关和球数约束；不得全局降低 `BLOCK_DURABILITY` 或宝箱耐久度。修改后重新执行该关和 `npm test -- tests/levels.test.ts`。

- [ ] **Step 5: iPad 视口视觉和交互验证**

使用 834x1194 视口检查菜单、选关、游戏、糖果狂热和结果页截图。确认顶部 HUD、技能按钮、聚合提示不重叠，所有文字在画面内，拖拽与声音按钮触控命中区域稳定。

- [ ] **Step 6: 更新 README 并检查差异**

在 README 玩法说明中加入“球停止后自动进入下一球”“本地音效可静音”，不修改部署和隐私章节的既有口径。

Run: `git diff --check`

Expected: 无输出。

- [ ] **Step 7: 最终提交**

```bash
git add README.md src/game/levels.ts tests/levels.test.ts
git commit -m "完成游戏节奏回归与关卡调优"
```

如果关卡文件没有证据驱动的修改，只提交 README 和实际发生变化的验证相关文件，不创建空提交。

- [ ] **Step 8: 推送并核对远端**

Run: `git push origin main`

Expected: `origin/main` 更新到本轮最后提交，GitHub Pages Actions 开始构建。

Run: `git status --short --branch`

Expected: `## main...origin/main`，工作树干净。
