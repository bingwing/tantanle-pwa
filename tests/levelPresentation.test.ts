import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('level presentation', () => {
  it('shows an unlocked level name together with its number', () => {
    const source = readFileSync(new URL('../src/scenes/LevelScene.ts', import.meta.url), 'utf8');
    const buttonSource = readFileSync(new URL('../src/scenes/ui.ts', import.meta.url), 'utf8');

    expect(source).toContain('`${level.id}\\n${level.name}`');
    expect(buttonSource).toContain("align: 'center'");
  });
});
