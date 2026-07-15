# Level Settle and Stable Interaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let existing level structures settle naturally before play, then freeze them so the first interaction is stable and only player-triggered impacts can cause clearance.

**Architecture:** `GameScene` owns a short preparation phase because Matter bodies and input lifecycle already live there. Blocks, targets, and hazards start dynamic for 650ms, then the scene freezes their settled bodies and spawns the first ball. Each target records whether player-triggered impact released it; only released jars use fall clearance, while treasure chests remain durability-only targets.

**Tech Stack:** TypeScript, Phaser 3 Matter physics, Vite, Vitest.

---

## File Map

- `src/scenes/GameScene.ts`: preparation state, Matter settle/freeze transition, target release state, fall-clearance guard, and player feedback.
- `tests/stableStartScene.test.ts`: source-level integration contract for the preparation transition and retained body configuration.
- `tests/fallClearance.test.ts`: source-level integration contract for released jar clearance.
- `tests/treasureChest.test.ts`: regression contract that fall clearance excludes treasure chests.
- `specs/022-level-settle/spec.md`: confirmed behavior and acceptance criteria; no implementation edits expected.
- `docs/superpowers/specs/2026-07-15-level-settle-design.md`: confirmed architecture; no implementation edits expected.

### Task 1: Settle the Matter world before enabling input

**Files:**
- Modify: `tests/stableStartScene.test.ts`
- Modify: `src/scenes/GameScene.ts`

- [ ] **Step 1: Replace the obsolete static-at-creation assertions with a failing preparation-phase test**

```ts
it('settles destructible bodies before freezing the world and spawning the first ball', () => {
  const gameSource = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8');

  expect(gameSource).toContain('const WORLD_SETTLE_MS = 650;');
  expect(gameSource).toContain('private worldReady = false;');
  expect(gameSource).toContain('this.feedback?.setText(\'糖果塔准备中\');');
  expect(gameSource).toContain('private settleWorldAndSpawnBall(): void');
  expect(gameSource).toContain('this.time.delayedCall(WORLD_SETTLE_MS');
  expect(gameSource).toContain("isStatic: false,\n        label: `block:${block.id}`,");
  expect(gameSource).toContain("isStatic: false,\n        label: `target:${target.id}`,");
  expect(gameSource).toContain('block.sprite.setStatic(true)');
  expect(gameSource).toContain('target.sprite.setStatic(true)');
  expect(gameSource).toContain('hazard.setStatic(true)');
  expect(gameSource).toContain('this.worldReady = true;\n      this.spawnBall();');
  expect(gameSource).toContain('if (!this.worldReady || this.shotInFlight || !this.activeBall)');
  expect(gameSource).toContain('this.worldReady && isTargetClearedByFall(target.sprite.y)');
  expect(gameSource).not.toContain('this.bindShotInput();\n    this.spawnBall();');
});

it('keeps complete Matter options when rebuilding body shapes', () => {
  const gameSource = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8');

  expect(gameSource).toContain('sprite.setRectangle(block.width, block.height, blockBody);');
  expect(gameSource).toContain('sprite.setCircle(33, targetBody);');
  expect(gameSource).toContain('ball.setCircle(34, ballBody);');
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/stableStartScene.test.ts`

Expected: FAIL because `WORLD_SETTLE_MS`, `worldReady`, and `settleWorldAndSpawnBall` do not exist and `create()` still calls `spawnBall()` immediately.

- [ ] **Step 3: Add the preparation state and defer the first ball**

Add the scene constant and state:

```ts
const WORLD_SETTLE_MS = 650;

export class GameScene extends Phaser.Scene {
  private worldReady = false;
}
```

Reset the state in `init()`:

```ts
this.worldReady = false;
```

Change `create()` so the scene starts preparation instead of spawning immediately:

```ts
this.createWorld();
this.createSlingshot();
this.bindShotInput();
this.feedback?.setText('糖果塔准备中');
this.settleWorldAndSpawnBall();
```

Use the state as an explicit interaction and clearance guard:

```ts
private startDraggingBall(pointer: Phaser.Input.Pointer): void {
  if (!this.worldReady || this.shotInFlight || !this.activeBall) {
    return;
  }
}

if (this.worldReady && isTargetClearedByFall(target.sprite.y)) {
  this.clearTarget(id);
}
```

The `update()` guard is temporary but necessary for the first independently working commit. Task 2 replaces it with the stricter released-jar condition.

- [ ] **Step 4: Create dynamic destructible bodies during the settle window**

Keep each existing body configuration object and change only these three values:

```ts
const blockBody = {
  density: MATERIAL_DENSITY[block.material],
  friction: 0.78,
  frictionAir: 0.012,
  restitution: block.material === 'jelly' ? 0.42 : 0.16,
  isStatic: false,
  label: `block:${block.id}`,
};

const targetBody = {
  density: isTreasureChest ? 0.0022 : 0.0012,
  friction: isTreasureChest ? 0.72 : 0.55,
  frictionAir: 0.01,
  restitution: isTreasureChest ? 0.16 : 0.24,
  isStatic: false,
  label: `target:${target.id}`,
};

const bombBody = {
  density: 0.001,
  friction: 0.45,
  frictionAir: 0.01,
  restitution: 0.38,
  isStatic: false,
  label: `hazard:${hazard.id}`,
};
```

Do not change star, bumper, portal, ground, or ball static configuration.

- [ ] **Step 5: Freeze settled structures and spawn the ball**

Add a scene method after `createWorld()`:

```ts
private settleWorldAndSpawnBall(): void {
  this.time.delayedCall(WORLD_SETTLE_MS, () => {
    if (!this.scene.isActive('GameScene') || this.levelEnding) {
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
  });
}
```

The existing `spawnBall()` feedback (`<球名>准备好`) replaces the preparation message when ready.

- [ ] **Step 6: Run the focused test and verify GREEN**

Run: `npm test -- tests/stableStartScene.test.ts`

Expected: PASS with 2 tests.

- [ ] **Step 7: Run the current interaction and body-label regressions**

Run: `npm test -- tests/gameSceneInput.test.ts tests/interactionFlow.test.ts tests/matterLabels.test.ts tests/stableStartScene.test.ts`

Expected: all selected tests pass.

- [ ] **Step 8: Commit the preparation phase**

```bash
git add src/scenes/GameScene.ts tests/stableStartScene.test.ts
git commit -m "修复关卡开局悬空"
```

### Task 2: Restrict fall clearance to released jars

**Files:**
- Modify: `tests/fallClearance.test.ts`
- Modify: `tests/treasureChest.test.ts`
- Modify: `src/scenes/GameScene.ts`

- [ ] **Step 1: Write failing target lifecycle assertions**

Replace `tests/fallClearance.test.ts` with:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('fallen target clearance', () => {
  it('only clears jars that player-triggered physics released', () => {
    const source = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8');

    expect(source).toContain('released: boolean;');
    expect(source).toContain('released: false,');
    expect(source).toContain("target.kind === 'jar' && target.released && isTargetClearedByFall(target.sprite.y)");
    expect(source).toContain('target.released = true;\n        target.sprite.setStatic(false);');
  });
});
```

Extend the chest scene test in `tests/treasureChest.test.ts`:

```ts
expect(gameSource).toContain("target.kind === 'jar' && target.released");
expect(gameSource).not.toContain("target.kind === 'treasure-chest' && target.released && isTargetClearedByFall");
```

- [ ] **Step 2: Run target tests and verify RED**

Run: `npm test -- tests/fallClearance.test.ts tests/treasureChest.test.ts`

Expected: FAIL because `TargetState` has no `released` state and `update()` clears every fallen target.

- [ ] **Step 3: Track whether a target was released by player action**

Extend `TargetState`:

```ts
type TargetState = {
  sprite: MatterImage;
  label: Phaser.GameObjects.Text;
  kind: TargetKind;
  durability: number;
  hits: number;
  released: boolean;
};
```

Initialize it with each target:

```ts
this.targets.set(target.id, {
  sprite,
  label,
  kind,
  durability: Math.max(1, target.durability ?? (isTreasureChest ? 3 : 1)),
  hits: 0,
  released: false,
});
```

- [ ] **Step 4: Guard fall clearance and mark local releases**

Change `update()`:

```ts
if (target.kind === 'jar' && target.released && isTargetClearedByFall(target.sprite.y)) {
  this.clearTarget(id);
}
```

Change the target branch in `releaseImpactArea()`:

```ts
for (const target of this.targets.values()) {
  if (Phaser.Math.Distance.Between(x, y, target.sprite.x, target.sprite.y) <= radius) {
    target.released = true;
    target.sprite.setStatic(false);
  }
}
```

- [ ] **Step 5: Run target tests and verify GREEN**

Run: `npm test -- tests/fallClearance.test.ts tests/treasureChest.test.ts tests/targetLabelLifecycle.test.ts`

Expected: all selected tests pass.

- [ ] **Step 6: Commit target lifecycle protection**

```bash
git add src/scenes/GameScene.ts tests/fallClearance.test.ts tests/treasureChest.test.ts
git commit -m "修复目标掉落结算"
```

### Task 3: Verify the complete player interaction

**Files:**
- Modify only if verification finds a reproducible defect in the confirmed scope.

- [ ] **Step 1: Run all automated verification**

Run: `npm test`

Expected: 24 test files plus the updated assertions pass with zero failed tests.

Run: `npm run build`

Expected: TypeScript checking and Vite production build exit 0.

Run: `git diff --check`

Expected: no output.

- [ ] **Step 2: Start or reuse the local Vite server**

Run: `npm run dev -- --port 4194`

Expected: `http://localhost:4194/` responds and no duplicate server is started if the port is already occupied.

- [ ] **Step 3: Browser-test level 7 on desktop**

Verify in this order:

1. Enter level 7 and observe “糖果塔准备中” before the first ball appears.
2. After 650ms, confirm tower feet and target have fallen onto visible supports and remain stable.
3. Wait at least one second without firing; confirm the scene does not transition to results.
4. Fire away from the tower; after the shot ends, confirm untouched blocks remain frozen.
5. Fire into the tower; confirm only nearby blocks and jars begin moving and effects still render.
6. Confirm browser console has no errors or warnings.

- [ ] **Step 4: Browser-test iPad portrait layout**

Use an 834 x 1194 viewport. Confirm preparation feedback, HUD, tower, slingshot, and skill button fit without overlap. Reset the temporary viewport afterward.

- [ ] **Step 5: Fix only reproducible in-scope defects with RED-GREEN tests**

For each defect found in Steps 3-4:

1. Record exact reproduction steps and identify the responsible state transition.
2. Add the smallest failing Vitest assertion that detects the defect.
3. Run the focused test and confirm the expected failure.
4. Implement one root-cause fix.
5. Re-run focused tests, then `npm test` and `npm run build`.

Do not add sounds, new levels, new shot types, or unrelated `GameScene` refactors in this task.

- [ ] **Step 6: Push the verified version**

```bash
git status --short
git push origin main
```

Expected: the worktree is clean and `origin/main` points to the latest verified commit.
