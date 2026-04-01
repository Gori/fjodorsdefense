'use client';

type SoundName =
  | 'start'
  | 'deploy'
  | 'select'
  | 'place'
  | 'fireRapid'
  | 'fireSlow'
  | 'fireLaser'
  | 'fireBomb'
  | 'enemyDown'
  | 'lifeLost'
  | 'waveClear'
  | 'victory'
  | 'gameOver';

const COOLDOWNS: Partial<Record<SoundName, number>> = {
  fireRapid: 75,
  fireSlow: 160,
  fireLaser: 45,
  fireBomb: 260,
  enemyDown: 70,
  select: 40,
  place: 90,
};

class RetroSfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private unlocked = false;
  private lastPlayed = new Map<SoundName, number>();

  init() {
    if (typeof window === 'undefined') return;
    if (this.ctx) return;

    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const master = ctx.createGain();
    const compressor = ctx.createDynamicsCompressor();

    master.gain.value = 0.17;
    compressor.threshold.value = -24;
    compressor.knee.value = 18;
    compressor.ratio.value = 8;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.18;

    master.connect(compressor);
    compressor.connect(ctx.destination);

    this.ctx = ctx;
    this.master = master;
    this.compressor = compressor;
    this.noiseBuffer = this.createNoiseBuffer(ctx);
  }

  unlock = () => {
    this.init();
    const ctx = this.ctx;
    if (!ctx) return;
    this.unlocked = true;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
  };

  play(name: SoundName, intensity = 1) {
    this.init();
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.unlocked) return;

    const nowMs = performance.now();
    const cooldown = COOLDOWNS[name] ?? 0;
    const last = this.lastPlayed.get(name) ?? -Infinity;
    if (nowMs - last < cooldown) return;
    this.lastPlayed.set(name, nowMs);

    const t = ctx.currentTime + 0.002;
    const amt = Math.max(0.25, Math.min(1.5, intensity));

    switch (name) {
      case 'start':
        this.tone(t, 196, 0.08, 0.03, 'square', 0.22);
        this.tone(t + 0.055, 247, 0.08, 0.03, 'square', 0.17);
        this.tone(t + 0.11, 294, 0.14, 0.04, 'triangle', 0.14);
        break;
      case 'deploy':
        this.tone(t, 220, 0.06, 0.025, 'square', 0.12);
        this.tone(t + 0.04, 330, 0.09, 0.03, 'triangle', 0.1);
        break;
      case 'select':
        this.tone(t, 540, 0.04, 0.015, 'square', 0.08 * amt);
        this.tone(t + 0.018, 720, 0.05, 0.02, 'triangle', 0.05 * amt);
        break;
      case 'place':
        this.tone(t, 180, 0.08, 0.01, 'square', 0.11 * amt, 120);
        this.noise(t, 0.055, 0.025 * amt, 900, 0.8);
        break;
      case 'fireRapid':
        this.tone(t, 640, 0.03, 0.004, 'square', 0.025 * amt, 1800);
        break;
      case 'fireSlow':
        this.tone(t, 420, 0.07, 0.015, 'triangle', 0.03 * amt, 900, 260);
        break;
      case 'fireLaser':
        this.tone(t, 1180, 0.028, 0.002, 'sawtooth', 0.02 * amt, 2400, 860);
        break;
      case 'fireBomb':
        this.tone(t, 140, 0.12, 0.008, 'triangle', 0.05 * amt, 320, 95);
        this.noise(t + 0.01, 0.09, 0.025 * amt, 480, 1.1);
        break;
      case 'enemyDown':
        this.tone(t, 520, 0.05, 0.01, 'triangle', 0.035 * amt, 1400, 320);
        break;
      case 'lifeLost':
        this.tone(t, 210, 0.14, 0.02, 'square', 0.08, 500, 140);
        this.tone(t + 0.045, 160, 0.18, 0.025, 'triangle', 0.07, 320, 90);
        break;
      case 'waveClear':
        this.tone(t, 440, 0.09, 0.02, 'square', 0.08);
        this.tone(t + 0.075, 554, 0.1, 0.025, 'square', 0.065);
        this.tone(t + 0.15, 659, 0.16, 0.03, 'triangle', 0.06);
        break;
      case 'victory':
        this.tone(t, 392, 0.1, 0.02, 'square', 0.08);
        this.tone(t + 0.08, 494, 0.12, 0.025, 'square', 0.075);
        this.tone(t + 0.16, 587, 0.14, 0.025, 'triangle', 0.07);
        this.tone(t + 0.24, 784, 0.24, 0.03, 'triangle', 0.065);
        break;
      case 'gameOver':
        this.tone(t, 220, 0.14, 0.025, 'square', 0.085, 520, 180);
        this.tone(t + 0.08, 174, 0.18, 0.03, 'triangle', 0.075, 360, 110);
        this.noise(t + 0.05, 0.12, 0.018, 260, 1.2);
        break;
    }
  }

  private tone(
    time: number,
    frequency: number,
    duration: number,
    attack: number,
    type: OscillatorType,
    gainAmount: number,
    lowpassHz = 2200,
    endFrequency?: number,
  ) {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, time);
    if (endFrequency && endFrequency !== frequency) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), time + duration);
    }

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(lowpassHz, time);
    filter.Q.value = 0.8;

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(gainAmount, time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  private noise(
    time: number,
    duration: number,
    gainAmount: number,
    lowpassHz: number,
    playbackRate: number,
  ) {
    const ctx = this.ctx;
    const master = this.master;
    const buffer = this.noiseBuffer;
    if (!ctx || !master || !buffer) return;

    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    source.buffer = buffer;
    source.playbackRate.setValueAtTime(playbackRate, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(lowpassHz, time);
    filter.Q.value = 0.6;

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(gainAmount, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    source.start(time);
    source.stop(time + duration + 0.02);
  }

  private createNoiseBuffer(ctx: AudioContext) {
    const length = Math.max(1, Math.floor(ctx.sampleRate * 0.35));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      channel[i] = (Math.random() * 2 - 1) * (1 - i / length) * 0.9;
    }
    return buffer;
  }
}

export const retroSfx = new RetroSfx();

export function unlockRetroSfx() {
  retroSfx.unlock();
}

export function playRetroSfx(name: SoundName, intensity?: number) {
  retroSfx.play(name, intensity);
}
