# 汽水岛彩虹分裂球 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a controllable fifth split shot and a forgiving five-level Soda Island chapter without regressing existing single-ball mechanics.

**Architecture:** Rules own deterministic shot sequencing, ability parameters, and velocity fan-out. GameScene owns Matter bodies and per-shot lifecycle, using a set for all flying balls while keeping the original ball as the drag/ability anchor. Level data and LevelScene add the fourth chapter only.

**Tech Stack:** TypeScript, Phaser 3 Matter physics, Vite, Vitest, Playwright.

## Global Constraints

- Keep game storage at `version: 1`; old local progress must merge with new levels.
- Do not add APIs, accounts, ads, analytics, payment, or dependencies.
- Preserve existing `classic`, `heavy`, `bouncy`, `blast`, portals, targets, blocks, bombs, bumpers, and sugar rush behavior.
- Split balls use both color and a three-way shape cue.
- Push the completed iteration to `origin/main` after all verification passes.

---

### Task 1: Define split-shot rules

**Files:**
- Modify: `src/game/types.ts`
- Modify: `src/game/rules.ts`
- Create: `tests/splitShot.test.ts`

**Interfaces:**
- Produces: `ShotType` including `'split'`.
- Produces: `resolveSplitShotVelocities(velocity: { x: number; y: number }, spreadDegrees: number): Array<{ x: number; y: number }>`.
- Produces: `resolveShotAbility('split')` with kind `'split'` and `splitSpreadDegrees: 20`.

- [ ] **Step 1: Write the failing rules tests**

```ts
expect(getShotTypeForIndex(4)).toBe('split');
expect(resolveShotAbility('split').kind).toBe('split');
expect(resolveSplitShotVelocities({ x: 12, y: 0 }, 20)).toHaveLength(3);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/splitShot.test.ts`

Expected: failure because `split` and `resolveSplitShotVelocities` do not exist.

- [ ] **Step 3: Implement the minimum rules**

```ts
const SHOT_SEQUENCE: ShotType[] = ['classic', 'heavy', 'bouncy', 'blast', 'split'];

export function resolveSplitShotVelocities(velocity: { x: number; y: number }, spreadDegrees: number) {
  return [-spreadDegrees, 0, spreadDegrees].map((degrees) => {
    const angle = (degrees * Math.PI) / 180;
    return {
      x: velocity.x * Math.cos(angle) - velocity.y * Math.sin(angle),
      y: velocity.x * Math.sin(angle) + velocity.y * Math.cos(angle),
    };
  });
}
```

- [ ] **Step 4: Run focused tests**

Run: `npm test -- tests/splitShot.test.ts tests/shotTypes.test.ts tests/shotAbilities.test.ts`

Expected: all selected tests pass.

### Task 2: Add split ball texture and multi-ball scene lifecycle

**Files:**
- Modify: `src/scenes/BootScene.ts`
- Modify: `src/scenes/GameScene.ts`
- Modify: `tests/shotTypes.test.ts`
- Create: `tests/splitShotScene.test.ts`

**Interfaces:**
- Consumes: `resolveSplitShotVelocities`, split ability data, and `ShotType`.
- Produces: `splitActiveBall(): void` and `activeBalls: Set<MatterImage>` behavior.

- [ ] **Step 1: Write failing scene connection tests**

```ts
expect(bootSource).toContain("'candy-ball-split'");
expect(gameSource).toContain('private activeBalls = new Set<MatterImage>()');
expect(gameSource).toContain('splitActiveBall');
expect(gameSource).toContain('resolveSplitShotVelocities');
expect(gameSource).toContain("kind: 'split'");
```

- [ ] **Step 2: Run the scene test to verify it fails**

Run: `npm test -- tests/splitShotScene.test.ts`

Expected: failure because the texture, set, and split method are absent.

- [ ] **Step 3: Implement the minimum scene behavior**

```ts
private splitActiveBall(): void {
  if (!this.activeBall) return;
  const velocities = resolveSplitShotVelocities(this.activeBall.body.velocity, 20);
  this.activeBall.setVelocity(velocities[1].x, velocities[1].y);
  for (const velocity of [velocities[0], velocities[2]]) {
    const clone = this.matter.add.image(this.activeBall.x, this.activeBall.y + (velocity.y < 0 ? -16 : 16), 'candy-ball-split') as MatterImage;
    clone.setCircle(31);
    clone.body.label = 'ball';
    clone.setVelocity(velocity.x, velocity.y);
    this.activeBalls.add(clone);
  }
}
```

- [ ] **Step 4: Route collision effects through the actual ball**

```ts
const ballBody = pair.bodyA.label === 'ball' ? pair.bodyA : pair.bodyB;
const ball = ballBody.gameObject as MatterImage | undefined;
if (ball && this.activeBalls.has(ball)) {
  this.triggerBumper(bumperId, ball);
  this.triggerPortal(portalId, ball);
}
```

- [ ] **Step 5: Clean up all active balls at shot end**

```ts
for (const ball of this.activeBalls) {
  this.tweens.killTweensOf(ball);
  ball.destroy();
}
this.activeBalls.clear();
```

- [ ] **Step 6: Run focused tests**

Run: `npm test -- tests/splitShot.test.ts tests/splitShotScene.test.ts tests/shotTypes.test.ts tests/portalElements.test.ts`

Expected: all selected tests pass.

### Task 3: Add Soda Island levels and chapter navigation

**Files:**
- Modify: `src/game/levels.ts`
- Modify: `src/scenes/LevelScene.ts`
- Modify: `tests/levels.test.ts`
- Modify: `tests/portalElements.test.ts`

**Interfaces:**
- Produces: levels 21–25, each with at least eight shots.
- Produces: `LEVEL_CHAPTERS` entry `{ name: '汽水岛', firstLevel: 21, lastLevel: 25 }`.

- [ ] **Step 1: Write failing chapter tests**

```ts
expect(LEVELS).toHaveLength(25);
for (const level of LEVELS.slice(20)) {
  expect(level.shots).toBeGreaterThanOrEqual(8);
}
expect(levelSource).toContain('汽水岛');
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/levels.test.ts tests/portalElements.test.ts`

Expected: failure because only 20 levels and three chapters exist.

- [ ] **Step 3: Author levels 21–25 and add the fourth chapter**

```ts
{
  id: 21,
  name: '三球初见',
  shots: 9,
  targets: [
    { id: 'jar-left', x: 650, y: 670 },
    { id: 'jar-right', x: 830, y: 610 },
  ],
}
{
  id: 25,
  name: '汽水嘉年华',
  shots: 12,
  targets: [
    { id: 'chest-1', x: 650, y: 620, kind: 'treasure-chest', durability: 3 },
    { id: 'jar-1', x: 770, y: 520 },
    { id: 'jar-2', x: 850, y: 670 },
  ],
}
const LEVEL_CHAPTERS = [
  { name: '甜甜岛', firstLevel: 1, lastLevel: 10 },
  { name: '彩虹岛', firstLevel: 11, lastLevel: 15 },
  { name: '宝藏岛', firstLevel: 16, lastLevel: 20 },
  { name: '汽水岛', firstLevel: 21, lastLevel: 25 },
] as const;
```

- [ ] **Step 4: Run focused tests**

Run: `npm test -- tests/levels.test.ts tests/portalElements.test.ts`

Expected: all selected tests pass.

### Task 4: Document, verify, and publish

**Files:**
- Modify: `README.md`
- Modify: `specs/021-soda-island-split/spec.md`
- Modify: `docs/superpowers/specs/2026-07-14-soda-island-split-design.md`

- [ ] **Step 1: Update the player-facing README summary**

```md
当前包含 25 个关卡，新增“汽水岛”章节和可主动分裂为三球的彩虹分裂球。
```

- [ ] **Step 2: Run all automated verification**

Run: `npm test && npm run build && git diff --check`

Expected: test suite and build exit 0; diff check has no output.

- [ ] **Step 3: Run browser verification with isolated progress**

Run: start `npm run dev -- --port 4194`, unlock level 21 through a new browser context, fire the fifth shot, activate the split ability, and capture a screenshot.

Expected: three visible balls, no page or console errors, chapter 4 layout fits iPad portrait.

- [ ] **Step 4: Commit and push**

```bash
git add README.md src/game src/scenes tests specs/021-soda-island-split docs/superpowers
git commit -m "新增汽水岛彩虹分裂球"
git push origin main
```
