const SOUND_PROFILES = Object.freeze({
  default: [660, 880],
  soft: [520, 660],
  success: [660, 880, 1040],
  warning: [740, 587],
  critical: [880, 660, 880],
  special: [784, 988, 1175]
});

export class NotificationSoundService {
  constructor() {
    this.context = null;
    this.pending = [];
    this.nextStartAt = 0;
  }

  unlock() {
    if (typeof window === 'undefined') return false;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;
    try {
      if (!this.context) this.context = new AudioContextClass();
      if (this.context.state === 'suspended') {
        this.context.resume().then(() => this.flush()).catch(() => {});
      } else {
        this.flush();
      }
      return true;
    } catch {
      return false;
    }
  }

  clearPending() {
    this.pending = [];
  }

  play(profile = 'default') {
    const normalized = Object.hasOwn(SOUND_PROFILES, profile) ? profile : 'default';
    if (!this.context || this.context.state !== 'running') {
      this.pending.push(normalized);
      this.pending = this.pending.slice(-5);
      if (this.context?.state === 'suspended') {
        this.context.resume().then(() => this.flush()).catch(() => {});
      }
      return false;
    }
    this.schedule(normalized);
    return true;
  }

  flush() {
    if (!this.context || this.context.state !== 'running') return;
    const queued = this.pending.splice(0);
    queued.forEach(profile => this.schedule(profile));
  }

  schedule(profile) {
    const context = this.context;
    if (!context || context.state !== 'running') return;
    const frequencies = SOUND_PROFILES[profile] || SOUND_PROFILES.default;
    const startAt = Math.max(context.currentTime + 0.015, this.nextStartAt);
    const step = 0.105;
    frequencies.forEach((frequency, index) => {
      const start = startAt + index * step;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.075, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.095);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.1);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    });
    this.nextStartAt = startAt + frequencies.length * step;
  }
}

export const notificationSoundService = new NotificationSoundService();
