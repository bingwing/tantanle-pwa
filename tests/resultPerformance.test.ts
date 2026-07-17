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
