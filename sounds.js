export class SoundManager {
  constructor() {
    this.ctx = null;
  }

  _ensureCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playCard() {
    this._ensureCtx();
    this.playTone(440, 0.1, 'triangle', 0.08);
  }

  playDraw() {
    this._ensureCtx();
    this.playTone(220, 0.15, 'sine', 0.08);
    setTimeout(() => this.playTone(330, 0.1, 'sine', 0.05), 50);
  }

  playSpecial() {
    this._ensureCtx();
    this.playTone(550, 0.1, 'square', 0.04);
    setTimeout(() => this.playTone(660, 0.1, 'square', 0.04), 80);
    setTimeout(() => this.playTone(880, 0.2, 'square', 0.04), 160);
  }

  playWild() {
    this._ensureCtx();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(now + 0.3);
  }

  playWin() {
    this._ensureCtx();
    const freqs = [523, 659, 784, 1047];
    freqs.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.25, 'triangle', 0.1), i * 120);
    });
  }

  playTone(freq, duration, type = 'sine', volume = 0.08) {
    this._ensureCtx();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(now + duration);
  }
}
