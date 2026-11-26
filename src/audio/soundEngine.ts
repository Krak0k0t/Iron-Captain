import type { ArenaTheme } from '../game/types';

export type MusicMood = 'title' | ArenaTheme | 'victory';

interface ThemePattern {
  tempoMs: number;
  notes: number[];
  bass: number[];
  wave: OscillatorType;
  cutoff: number;
}

const THEME_PATTERNS: Record<MusicMood, ThemePattern> = {
  title: {
    tempoMs: 420,
    notes: [220, 261.63, 329.63, 392, 329.63, 293.66, 261.63, 246.94],
    bass: [110, 110, 87.31, 98],
    wave: 'triangle',
    cutoff: 950,
  },
  basement: {
    tempoMs: 360,
    notes: [196, 233.08, 261.63, 293.66, 261.63, 233.08, 196, 174.61],
    bass: [98, 98, 87.31, 73.42],
    wave: 'sawtooth',
    cutoff: 720,
  },
  port_gravel: {
    tempoMs: 320,
    notes: [246.94, 293.66, 369.99, 440, 392, 329.63, 293.66, 246.94],
    bass: [123.47, 110, 98, 110],
    wave: 'triangle',
    cutoff: 1150,
  },
  ring_masts: {
    tempoMs: 250,
    notes: [293.66, 349.23, 440, 523.25, 440, 392, 349.23, 329.63],
    bass: [146.83, 130.81, 116.54, 130.81],
    wave: 'sawtooth',
    cutoff: 1450,
  },
  abyssal_archive: {
    tempoMs: 480,
    notes: [174.61, 207.65, 261.63, 311.13, 261.63, 207.65, 196, 155.56],
    bass: [87.31, 77.78, 65.41, 77.78],
    wave: 'sine',
    cutoff: 640,
  },
  zero_mooring: {
    tempoMs: 240,
    notes: [329.63, 392, 493.88, 587.33, 659.25, 587.33, 493.88, 392],
    bass: [164.81, 146.83, 130.81, 146.83],
    wave: 'sawtooth',
    cutoff: 1650,
  },
  victory: {
    tempoMs: 380,
    notes: [261.63, 329.63, 392, 523.25, 493.88, 392, 329.63, 392],
    bass: [130.81, 164.81, 196, 130.81],
    wave: 'triangle',
    cutoff: 1300,
  },
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private musicBusA: GainNode | null = null;
  private musicBusB: GainNode | null = null;
  private activeBus: 'A' | 'B' = 'A';

  private currentMood: MusicMood = 'title';
  private stepIndex = 0;
  private musicTimer: number | null = null;
  private ambientStarted = false;
  private muted = false;

  private musicVol = 0.45;
  private sfxVol = 0.65;
  private ambientVol = 0.35;
  private lastSliderSfxAt = 0;
  private noiseBuffer: AudioBuffer | null = null;

  public unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 1;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVol;
      this.sfxGain.connect(this.masterGain);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = this.ambientVol;
      this.ambientGain.connect(this.masterGain);

      this.musicBusA = this.ctx.createGain();
      this.musicBusA.gain.value = this.musicVol;
      this.musicBusA.connect(this.masterGain);

      this.musicBusB = this.ctx.createGain();
      this.musicBusB.gain.value = 0;
      this.musicBusB.connect(this.masterGain);

      // Shared 1-second white noise buffer (zero runtime GC across all SFX)
      const len = this.ctx.sampleRate;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buf;
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    this.startAmbient();
    this.startMusicLoop();
  }

  public setVolumes(music: number, sfx: number, ambient: number): void {
    this.musicVol = Math.max(0, Math.min(1, music));
    this.sfxVol = Math.max(0, Math.min(1, sfx));
    this.ambientVol = Math.max(0, Math.min(1, ambient));
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.sfxGain) this.sfxGain.gain.setTargetAtTime(this.sfxVol, now, 0.05);
    if (this.ambientGain) this.ambientGain.gain.setTargetAtTime(this.ambientVol, now, 0.08);
    const active = this.activeBus === 'A' ? this.musicBusA : this.musicBusB;
    if (active) active.gain.setTargetAtTime(this.musicVol, now, 0.08);
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 1, this.ctx.currentTime, 0.05);
    }
    return this.muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  /**
   * Adaptive 2.5-second smooth crossfade between location music moods.
   */
  public setMusicMood(mood: MusicMood): void {
    if (this.currentMood === mood) return;
    this.currentMood = mood;
    if (!this.ctx || !this.musicBusA || !this.musicBusB) return;

    const now = this.ctx.currentTime;
    const fadeSec = 2.5;
    const incoming = this.activeBus === 'A' ? this.musicBusB : this.musicBusA;
    const outgoing = this.activeBus === 'A' ? this.musicBusA : this.musicBusB;

    outgoing.gain.cancelScheduledValues(now);
    outgoing.gain.setValueAtTime(outgoing.gain.value, now);
    outgoing.gain.linearRampToValueAtTime(0.0001, now + fadeSec);

    incoming.gain.cancelScheduledValues(now);
    incoming.gain.setValueAtTime(Math.max(0.0001, incoming.gain.value), now);
    incoming.gain.linearRampToValueAtTime(this.musicVol, now + fadeSec);

    this.activeBus = this.activeBus === 'A' ? 'B' : 'A';
  }

  private startAmbient(): void {
    if (this.ambientStarted || !this.ctx || !this.ambientGain) return;
    this.ambientStarted = true;
    // Generate continuous filtered harbor wind & water lap noise buffer
    const bufferSize = this.ctx.sampleRate * 3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 2.8;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 260;
    filter.Q.value = 0.7;

    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.14;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 110;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const amp = this.ctx.createGain();
    amp.gain.value = 0.18;

    noise.connect(filter);
    filter.connect(amp);
    amp.connect(this.ambientGain);
    noise.start();
    lfo.start();
  }

  private startMusicLoop(): void {
    if (this.musicTimer !== null || !this.ctx) return;
    const scheduleNext = () => {
      if (!this.ctx) return;
      const pattern = THEME_PATTERNS[this.currentMood];
      if (this.ctx.state === 'running' && !this.muted) {
        this.playThemeStep(pattern);
      }
      this.musicTimer = window.setTimeout(scheduleNext, pattern.tempoMs);
    };
    scheduleNext();
  }

  private playThemeStep(pattern: ThemePattern): void {
    if (!this.ctx) return;
    const bus = this.activeBus === 'A' ? this.musicBusA : this.musicBusB;
    if (!bus) return;

    const now = this.ctx.currentTime;
    const idx = this.stepIndex % pattern.notes.length;
    const noteFreq = pattern.notes[idx];
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const env = this.ctx.createGain();

    osc.type = pattern.wave;
    osc.frequency.setValueAtTime(noteFreq, now);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(pattern.cutoff, now);

    env.gain.setValueAtTime(0.0001, now);
    env.gain.exponentialRampToValueAtTime(0.11, now + 0.04);
    env.gain.exponentialRampToValueAtTime(0.0001, now + pattern.tempoMs / 1000 * 1.45);

    osc.connect(filter);
    filter.connect(env);
    env.connect(bus);
    osc.start(now);
    osc.stop(now + pattern.tempoMs / 1000 * 1.5);

    if (idx % 2 === 0) {
      const bassFreq = pattern.bass[(this.stepIndex >> 1) % pattern.bass.length];
      const bassOsc = this.ctx.createOscillator();
      const bassEnv = this.ctx.createGain();
      bassOsc.type = 'triangle';
      bassOsc.frequency.setValueAtTime(bassFreq, now);
      bassEnv.gain.setValueAtTime(0.0001, now);
      bassEnv.gain.exponentialRampToValueAtTime(0.15, now + 0.03);
      bassEnv.gain.exponentialRampToValueAtTime(0.0001, now + (pattern.tempoMs / 1000) * 1.9);
      bassOsc.connect(bassEnv);
      bassEnv.connect(bus);
      bassOsc.start(now);
      bassOsc.stop(now + (pattern.tempoMs / 1000) * 2.0);
    }

    this.stepIndex += 1;
  }

  public playUiClick(soft = false): void {
    this.unlock();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = soft ? 'sine' : 'triangle';
    const base = soft ? 520 : 680;
    osc.frequency.setValueAtTime(base * (0.94 + Math.random() * 0.12), now);
    osc.frequency.exponentialRampToValueAtTime(soft ? 320 : 410, now + 0.06);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playSliderRustle(): void {
    const nowMs = performance.now();
    if (nowMs - this.lastSliderSfxAt < 65) return;
    this.lastSliderSfxAt = nowMs;
    this.unlock();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280 + Math.random() * 90, now);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  public playStartHorn(): void {
    this.unlock();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    [110, 164.81, 220].forEach((freq) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(520, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.14);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.95);
    });
  }

  private playNoiseBurst(durationSec: number, filterFreq: number, peakGain: number, delaySec = 0): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime + delaySec;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.playbackRate.value = 0.85 + Math.random() * 0.35;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFreq, now);
    filter.Q.value = 1.4;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(peakGain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(now);
    src.stop(now + durationSec + 0.02);
  }

  public playCraneImpact(): void {
    this.unlock();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(155, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.44);
    gain.gain.setValueAtTime(0.46, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.46);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.48);

    // Metallic girder ring + hydraulic steam exhaust
    const ring = this.ctx.createOscillator();
    const ringGain = this.ctx.createGain();
    ring.type = 'triangle';
    ring.frequency.setValueAtTime(560, now);
    ring.frequency.exponentialRampToValueAtTime(280, now + 0.36);
    ringGain.gain.setValueAtTime(0.2, now);
    ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.37);
    ring.connect(ringGain);
    ringGain.connect(this.sfxGain);
    ring.start(now);
    ring.stop(now + 0.39);
    this.playNoiseBurst(0.24, 1400, 0.22, 0.02);
  }

  public playGrapple(): void {
    this.unlock();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.11);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.22);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.23);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.25);
    this.playNoiseBurst(0.14, 2200, 0.12);
  }

  public playSlam(): void {
    this.unlock();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(44, now + 0.34);
    gain.gain.setValueAtTime(0.36, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.38);
    this.playNoiseBurst(0.2, 850, 0.18);
  }

  public playJump(): void {
    this.unlock();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(175 * (0.94 + Math.random() * 0.12), now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.13);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.15);
    // Hydraulic boot piston hiss
    this.playNoiseBurst(0.09, 1800, 0.08);
  }

  public playHeavyLand(): void {
    this.unlock();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(115 * (0.94 + Math.random() * 0.12), now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.11);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.13);
    this.playNoiseBurst(0.07, 480, 0.1);
  }

  public playRelaySwitch(): void {
    this.unlock();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    // Mechanical relay latch + hydraulic hiss
    const clack = this.ctx.createOscillator();
    const clackGain = this.ctx.createGain();
    clack.type = 'square';
    clack.frequency.setValueAtTime(320, now);
    clack.frequency.setValueAtTime(640, now + 0.045);
    clackGain.gain.setValueAtTime(0.14, now);
    clackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    clack.connect(clackGain);
    clackGain.connect(this.sfxGain);
    clack.start(now);
    clack.stop(now + 0.13);
    this.playNoiseBurst(0.15, 2100, 0.12, 0.03);
  }

  public playHurt(): void {
    this.unlock();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.18);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playInteractChime(): void {
    this.unlock();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      gain.gain.setValueAtTime(0.14, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.24);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.26);
    });
  }

  public playGauntletSwing(comboStep: number, hit = false): void {
    this.unlock();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const pitchBase = 180 + comboStep * 45;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = hit ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(pitchBase * (0.95 + Math.random() * 0.1), now);
    osc.frequency.exponentialRampToValueAtTime(hit ? 65 : 95, now + 0.12);
    gain.gain.setValueAtTime(hit ? 0.24 : 0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.14);
    this.playNoiseBurst(0.08, hit ? 950 : 1900, hit ? 0.16 : 0.08);
  }

  public playDash(): void {
    this.unlock();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.18);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
    this.playNoiseBurst(0.16, 2400, 0.14);
  }

  public playEnemyTelegraph(): void {
    this.unlock();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.14);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playPickup(): void {
    this.unlock();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    [587.33, 880].forEach((f, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.05);
      gain.gain.setValueAtTime(0.13, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.18);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.2);
    });
  }
}

export const soundEngine = new SoundEngine();
