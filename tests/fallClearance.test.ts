import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('fallen target clearance', () => {
  it('keeps checking fallen targets after the shot timer ends', () => {
    const source = readFileSync(new URL('../src/scenes/GameScene.ts', import.meta.url), 'utf8');

    expect(source).not.toContain('!this.shotInFlight || this.targets.size === 0');
    expect(source).toContain('this.finishIfNeeded();');
  });
});
