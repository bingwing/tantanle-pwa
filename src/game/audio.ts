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
    if (!this.enabled) {
      return;
    }

    const now = performance.now();
    const minimumGap = cue === 'impact' ? 55 : cue === 'combo' ? 90 : 0;
    if (now - (this.lastPlayedAt.get(cue) ?? -Infinity) < minimumGap) {
      return;
    }
    this.lastPlayedAt.set(cue, now);

    try {
      const AudioContextConstructor =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextConstructor) {
        return;
      }
      this.context ??= new AudioContextConstructor();
      if (this.context.state === 'suspended') {
        void this.context
          .resume()
          .then(() => this.schedule(cue))
          .catch(() => undefined);
        return;
      }
      this.schedule(cue);
    } catch {
      // Audio is optional; unsupported or restricted contexts stay silent.
    }
  }

  private schedule(cue: CandySoundCue): void {
    const context = this.context;
    if (!context) {
      return;
    }

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
