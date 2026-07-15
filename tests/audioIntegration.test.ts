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
