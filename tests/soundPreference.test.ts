import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/game/levels';
import { createDefaultSave } from '../src/game/rules';
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
