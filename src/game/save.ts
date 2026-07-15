import { STORAGE_KEY } from './config';
import { createDefaultSave } from './rules';
import type { GameSave, LevelDefinition } from './types';

export function loadSave(storage: Storage, levels: LevelDefinition[]): GameSave {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    return createDefaultSave(levels);
  }

  try {
    const parsed = JSON.parse(raw) as GameSave;
    if (parsed.version !== 1 || typeof parsed.levels !== 'object') {
      return createDefaultSave(levels);
    }
    const defaults = createDefaultSave(levels);
    return {
      ...defaults,
      ...parsed,
      levels: {
        ...defaults.levels,
        ...parsed.levels,
      },
    };
  } catch (error) {
    console.warn('Failed to parse tantanle save, using defaults.', error);
    return createDefaultSave(levels);
  }
}

export function writeSave(storage: Storage, save: GameSave): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(save));
}

export function updateSoundPreference(save: GameSave, soundEnabled: boolean): GameSave {
  return { ...save, soundEnabled };
}
