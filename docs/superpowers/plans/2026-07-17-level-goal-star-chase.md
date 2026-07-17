# 关卡目标与三星冲刺 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在所有 25 个关卡中增加清晰的目标完成度、实时三星进度和有记忆点的胜负表现总结。

**Architecture:** 新增 `levelProgress.ts` 承载星级进度和结果文案的纯规则，`GameScene` 只维护发射次数并绘制目标/三星 HUD，`ResultScene` 只消费结果数据进行展示。继续复用现有 `starScores`、计分、音效、存档和场景切换，不改变玩法口径。

**Tech Stack:** TypeScript 5、Phaser 3.90、Matter Physics、Vitest 2、Vite 5、Web Audio、PWA/GitHub Pages。

## Global Constraints

- 保持 25 个关卡、星级阈值、计分公式、物理参数、目标耐久度和可用球数不变。
- 保持 `GameSave.version = 1` 和 `tantanle-save-v1`，不迁移旧存档。
- 不增加账号、广告、内购、排行榜、埋点、后端或网络资源。
- 星级跨档后 150ms 内出现视觉反馈；一次跨多档只显示一条最高档位文案。
- 糖果狂热只增加剩余球，不得影响真实发射次数。
- 桌面与 iPad 834x1194 视口中，左侧三星进度和右侧糖果连锁不得重叠。
- 每项行为先运行失败测试，再实现最小代码并重新验证。

---

### Task 1: 星级进度与结果文案纯规则

**Files:**
- Create: `src/game/levelProgress.ts`
- Create: `tests/levelProgress.test.ts`

**Interfaces:**
- Produces: `resolveStarProgress(starScores, score, previousStars): StarProgress`。
- Produces: `resolveResultSummary(input): ResultSummary`。
- Consumes: 关卡现有 `[number, number, number]` 星级阈值，不依赖 Phaser。

- [ ] **Step 1: 写星级边界和结果总结失败测试**

```ts
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
```

- [ ] **Step 2: 运行测试并确认模块缺失**

Run: `npm test -- tests/levelProgress.test.ts`

Expected: FAIL，提示无法解析 `../src/game/levelProgress`。

- [ ] **Step 3: 实现纯规则**

```ts
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
```

- [ ] **Step 4: 运行纯规则测试**

Run: `npm test -- tests/levelProgress.test.ts`

Expected: PASS，3 个测试全部通过。

- [ ] **Step 5: 提交纯规则**

```bash
git add src/game/levelProgress.ts tests/levelProgress.test.ts
git commit -m "新增关卡星级与表现规则"
```

---

### Task 2: 游戏 HUD 目标与三星进度

**Files:**
- Modify: `src/scenes/GameScene.ts`
- Create: `tests/levelGoalHud.test.ts`

**Interfaces:**
- Consumes: `resolveStarProgress()`。
- Produces: `shotsUsed`、`earnedStars`、目标文字、三星进度轨道和跨星动画。
- Produces for Task 3: `finish()` 传递真实发射次数和目标完成数据。

- [ ] **Step 1: 写 HUD 与发射计数失败契约测试**

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('level goal and star chase HUD', () => {
  it('tracks real shots and renders accessible goal progress', () => {
    const source = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8');

    expect(source).toContain('private shotsUsed = 0;');
    expect(source).toContain('this.shotsUsed += 1;');
    expect(source).toContain('objectiveText');
    expect(source).toContain('starProgressGraphics');
    expect(source).toContain('resolveStarProgress');
    expect(source).toContain('progress.milestoneText');
    expect(source).toContain('目标 ${this.targetsCleared}/${this.level.targets.length}');
    expect(source).toContain('shotsUsed: this.shotsUsed');
    expect(source).toContain('targetsCleared: this.targetsCleared');
    expect(source).toContain('totalTargets: this.level.targets.length');
  });

  it('does not derive real shot count from sugar-rush extra balls', () => {
    const source = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8');
    const sugarRush = source.slice(source.indexOf('private triggerSugarRush'), source.indexOf('private showScorePop'));

    expect(sugarRush).toContain('this.shotsLeft += reward.extraShots;');
    expect(sugarRush).not.toContain('shotsUsed');
  });
});
```

- [ ] **Step 2: 运行契约测试并确认缺少 HUD 状态**

Run: `npm test -- tests/levelGoalHud.test.ts`

Expected: FAIL，`shotsUsed`、`objectiveText` 和 `starProgressGraphics` 尚不存在。

- [ ] **Step 3: 新增运行时状态和 HUD 对象**

在 `GameScene` 增加并在 `init()` 重置：

```ts
private shotsUsed = 0;
private earnedStars = 0;
private objectiveText?: Phaser.GameObjects.Text;
private starProgressGraphics?: Phaser.GameObjects.Graphics;
private starProgressStars: Phaser.GameObjects.Text[] = [];
```

在 `releaseBall()` 通过最小拉力判断后执行 `this.shotsUsed += 1`。在 `addHud()` 中创建：

```ts
this.objectiveText = this.add.text(34, 142, '', {
  fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
  fontSize: '21px',
  color: '#2e4057',
  fontStyle: '900',
  stroke: '#ffffff',
  strokeThickness: 4,
}).setDepth(31);
this.starProgressGraphics = this.add.graphics().setDepth(30);
this.starProgressStars = [0, 1, 2].map(() => this.add.text(0, 0, '☆', {
  fontFamily: 'Arial, sans-serif',
  fontSize: '30px',
  color: '#ffcf4d',
  fontStyle: '900',
  stroke: '#2e4057',
  strokeThickness: 4,
}).setOrigin(0.5).setDepth(32));
```

- [ ] **Step 4: 绘制不依赖颜色的三星进度**

新增常量：

```ts
const STAR_PROGRESS_METER = {
  x: 34,
  y: 202,
  width: 360,
  height: 24,
} as const;
```

新增 `drawStarProgress()`：用白色底轨、深色轮廓、黄色填充和 12px 间隔斜纹绘制进度；三颗星的位置按 `starScores[index] / starScores[2]` 计算，已获得显示 `★`，未获得显示 `☆`。文字位置固定在轨道中心，不因分数变化改变布局。

```ts
private drawStarProgress(): void {
  if (!this.starProgressGraphics) return;
  const progress = resolveStarProgress(this.level.starScores, this.score, this.earnedStars);
  const { x, y, width, height } = STAR_PROGRESS_METER;
  const fillWidth = width * progress.ratio;
  this.objectiveText?.setText(`目标 ${this.targetsCleared}/${this.level.targets.length}  ·  三星冲刺`);
  this.starProgressGraphics.clear();
  this.starProgressGraphics.fillStyle(0xffffff, 0.94);
  this.starProgressGraphics.fillRoundedRect(x, y, width, height, 7);
  this.starProgressGraphics.fillStyle(0xffcf4d, 1);
  this.starProgressGraphics.fillRoundedRect(x, y, fillWidth, height, 7);
  this.starProgressGraphics.lineStyle(3, 0xffffff, 0.76);
  for (let stripe = 10; stripe < fillWidth; stripe += 14) {
    this.starProgressGraphics.lineBetween(x + stripe - 6, y + height - 4, x + stripe + 4, y + 4);
  }
  this.starProgressGraphics.lineStyle(4, 0x2e4057, 0.82);
  this.starProgressGraphics.strokeRoundedRect(x, y, width, height, 7);

  this.level.starScores.forEach((threshold, index) => {
    const markerX = x + (threshold / this.level.starScores[2]) * width;
    this.starProgressStars[index]?.setPosition(markerX, y + height / 2).setText(index < progress.stars ? '★' : '☆');
  });

  if (progress.newlyEarned > 0 && progress.milestoneText) {
    const previousStars = this.earnedStars;
    this.earnedStars = progress.stars;
    this.showFeedback(progress.milestoneText, 2, 700);
    this.audio?.play('combo');
    for (let index = previousStars; index < progress.stars; index += 1) {
      const star = this.starProgressStars[index];
      if (star) this.tweens.add({ targets: star, scale: 1.45, duration: 140, yoyo: true, ease: 'Back.out' });
    }
  }
}
```

`refreshHud()` 最后调用 `drawStarProgress()`。无新星时同步 `earnedStars = Math.max(earnedStars, progress.stars)`，避免场景恢复时重复动画。

- [ ] **Step 5: 传递结果页所需运行时数据**

`finish()` 在写存档前读取旧最佳分数，并向 `ResultScene` 传递：

```ts
const save = this.registry.get('save') as GameSave;
const previousBestScore = save.levels[this.level.id]?.bestScore ?? 0;
const isNewBest = won && this.score > previousBestScore;
let bestScore = previousBestScore;
if (won) {
  const updatedSave = updateLevelProgress(save, LEVELS, this.level.id, this.score, stars);
  bestScore = updatedSave.levels[this.level.id]?.bestScore ?? this.score;
  this.registry.set('save', updatedSave);
  writeSave(window.localStorage, updatedSave);
}
this.scene.start('ResultScene', {
  levelId: this.level.id,
  won,
  score: this.score,
  stars,
  shotsUsed: this.shotsUsed,
  targetsCleared: this.targetsCleared,
  totalTargets: this.level.targets.length,
  isNewBest,
  bestScore,
});
```

- [ ] **Step 6: 运行 HUD、回合与反馈测试**

Run: `npm test -- tests/levelGoalHud.test.ts tests/interactionFlow.test.ts tests/shotLifecycleScene.test.ts tests/playFeedback.test.ts tests/sugarRush.test.ts`

Expected: PASS。

- [ ] **Step 7: 提交游戏 HUD**

```bash
git add src/scenes/GameScene.ts tests/levelGoalHud.test.ts
git commit -m "增加关卡目标与三星冲刺 HUD"
```

---

### Task 3: 结果页表现总结

**Files:**
- Modify: `src/scenes/ResultScene.ts`
- Create: `tests/resultPerformance.test.ts`

**Interfaces:**
- Consumes: `resolveResultSummary()` 和 Task 2 传递的 `shotsUsed`、目标进度、新纪录、最佳分数。
- Produces: 胜利勋章、新纪录、失败剩余目标和历史最佳展示。

- [ ] **Step 1: 写结果页数据与文案失败契约测试**

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('result performance presentation', () => {
  it('renders shot achievement, record, and failure gap from scene data', () => {
    const source = readFileSync(new URL('../src/scenes/ResultScene.ts', import.meta.url), 'utf8');

    expect(source).toContain('resolveResultSummary');
    expect(source).toContain('private shotsUsed = 0;');
    expect(source).toContain('private targetsCleared = 0;');
    expect(source).toContain('private totalTargets = 0;');
    expect(source).toContain('private isNewBest = false;');
    expect(source).toContain('private bestScore = 0;');
    expect(source).toContain("this.won ? '甜甜胜利' : '差一点'");
    expect(source).toContain('summary.performanceText');
    expect(source).toContain('summary.recordText');
  });
});
```

- [ ] **Step 2: 运行测试并确认结果页尚未消费新数据**

Run: `npm test -- tests/resultPerformance.test.ts`

Expected: FAIL，`resolveResultSummary` 和新运行时字段不存在。

- [ ] **Step 3: 扩展 ResultScene 数据并生成表现总结**

```ts
import { resolveResultSummary } from '../game/levelProgress';

private shotsUsed = 0;
private targetsCleared = 0;
private totalTargets = 0;
private isNewBest = false;
private bestScore = 0;
```

`init()` 接收并赋值所有字段：

```ts
init(data: {
  levelId: number;
  won: boolean;
  score: number;
  stars: number;
  shotsUsed: number;
  targetsCleared: number;
  totalTargets: number;
  isNewBest: boolean;
  bestScore: number;
}): void {
  this.levelId = data.levelId;
  this.won = data.won;
  this.score = data.score;
  this.stars = data.stars;
  this.shotsUsed = data.shotsUsed;
  this.targetsCleared = data.targetsCleared;
  this.totalTargets = data.totalTargets;
  this.isNewBest = data.isNewBest;
  this.bestScore = data.bestScore;
  this.nextLevelId = LEVELS.find((level) => level.id === this.levelId + 1)?.id;
}
```

`create()` 调用：

```ts
const summary = resolveResultSummary({
  won: this.won,
  shotsUsed: this.shotsUsed,
  targetsCleared: this.targetsCleared,
  totalTargets: this.totalTargets,
  isNewBest: this.isNewBest,
});
```

- [ ] **Step 4: 更新结果布局**

- 标题失败文案从“再来一次”改为“差一点”。
- 分数行改为 `分数 ${score}  ·  最佳 ${bestScore}`。
- 在 y=555 显示 34px 的 `summary.performanceText`，使用粉色、白色描边和轻微回弹。
- `summary.recordText` 存在时在 y=610 显示 26px 黄色深色描边文字。
- 胜利按钮移动到 y=730、830、930；失败按钮移动到 y=730、830，保持触控尺寸不变。

表现文案只展示结果，不增加教学段落或额外弹窗。

- [ ] **Step 5: 运行结果页与进度测试**

Run: `npm test -- tests/resultPerformance.test.ts tests/levelProgress.test.ts tests/interactionFlow.test.ts tests/rules.test.ts`

Expected: PASS。

- [ ] **Step 6: 提交结果页**

```bash
git add src/scenes/ResultScene.ts tests/resultPerformance.test.ts
git commit -m "增强胜负表现与新纪录反馈"
```

---

### Task 4: 全量回归与发布验证

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: 完整目标、三星和结果闭环。
- Produces: 可在桌面、iPad 和 GitHub Pages 发布构建中验收的版本。

- [ ] **Step 1: 更新 README 玩法说明**

在现有“自动进入下一球”段落后增加：

```md
每关会实时显示目标完成度和三星进度；达到星级线会立即点亮星星，结果页会记录一发制胜、过关发数和本关新纪录。
```

- [ ] **Step 2: 运行全量自动化验证**

Run: `npm test`

Expected: PASS，全部 Vitest 用例通过。

Run: `npm run build`

Expected: PASS，TypeScript 无错误并生成 `dist/`。

Run: `git diff --check`

Expected: 无输出。

- [ ] **Step 3: 桌面连续实玩前 3 关**

启动 `npm run dev -- --port 4194`，在浏览器验证：

- 第 1 关一发通关显示“一发制胜”，若超过旧最高分显示“本关新纪录”。
- 第 2 关触发炸弹后，星级可以一次跨多档但只出现一条庆祝文案。
- 第 3 关第一发未通关时，下一球正常生成且目标/三星进度保留。
- 故意失败一次，结果页显示正确的剩余目标数并可重玩。

- [ ] **Step 4: iPad 视口检查**

使用 834x1194 纵向视口截图菜单、关卡页、游戏 HUD 和结果页。确认：

- 左侧目标/三星进度不与右侧糖果连锁、声音和选关按钮重叠。
- 星级标记、斜纹和明暗状态无需依赖红绿色区分。
- 表现文案、最佳分数和按钮全部在画面内。

- [ ] **Step 5: 最终提交并推送**

```bash
git add README.md
git commit -m "补充三星冲刺玩法说明"
git push origin main
git status --short --branch
```

Expected: `## main...origin/main`，工作树干净，GitHub Pages Actions 开始部署。
