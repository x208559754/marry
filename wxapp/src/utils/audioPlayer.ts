/**
 * 婚礼音乐播放内核：支持标准 HTML5 Audio 播放与基于 Web Audio API 的备用轻柔八音盒卡农合成器
 * 确保护盾级零报错，在弱网或跨域限制下仍能播放唯美浪漫的背景旋律
 */

class WeddingAudioManager {
  private audio: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private synthInterval: number | null = null;
  private currentUrl: string = '';

  constructor() {
    // 延迟初始化，需等待用户手势触发
  }

  private initAudio(url: string) {
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
    this.currentUrl = url;
    this.audio = new Audio(url);
    this.audio.loop = true;
    this.audio.preload = 'auto';

    this.audio.onerror = () => {
      console.warn('Audio URL load failed, switching to soothing ambient synth engine');
      if (this.isPlaying) {
        this.startSynthHarp();
      }
    };
  }

  public async play(url: string): Promise<boolean> {
    this.isPlaying = true;

    // 尝试初始化用户手势 AudioContext
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!this.audioCtx && AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }
    } catch (e) {
      console.warn('Web Audio context resume failed:', e);
    }

    if (!this.audio || this.currentUrl !== url) {
      this.initAudio(url);
    }

    if (this.audio) {
      try {
        await this.audio.play();
        return true;
      } catch (err) {
        console.warn('HTML5 Audio play failed (policy/cors), activating synth harmony:', err);
        this.startSynthHarp();
        return true;
      }
    } else {
      this.startSynthHarp();
      return true;
    }
  }

  public pause() {
    this.isPlaying = false;
    if (this.audio) {
      this.audio.pause();
    }
    this.stopSynthHarp();
  }

  public toggle(url: string): boolean {
    if (this.isPlaying) {
      this.pause();
      return false;
    } else {
      this.play(url);
      return true;
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  // 备用：基于 Web Audio 的浪漫八音盒卡农分解和弦合成器
  private startSynthHarp() {
    this.stopSynthHarp();
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (!this.audioCtx) return;

    // 卡农基础旋律与和弦音 (D, A, Bm, F#m, G, D, G, A)
    const notes = [
      587.33, 440.00, 493.88, 369.99, 392.00, 293.66, 392.00, 440.00, // 高八度旋律
      293.66, 220.00, 246.94, 185.00, 196.00, 146.83, 196.00, 220.00, // 低八度柔和伴奏
    ];
    let noteIndex = 0;

    const playTone = () => {
      if (!this.audioCtx || !this.isPlaying) return;
      try {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        const freq = notes[noteIndex % notes.length];
        noteIndex++;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

        // 柔和水滴八音盒包络
        gain.gain.setValueAtTime(0.001, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.08, this.audioCtx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.9);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.95);
      } catch (e) {
        console.warn('Tone synth error', e);
      }
    };

    playTone();
    this.synthInterval = window.setInterval(playTone, 800);
  }

  private stopSynthHarp() {
    if (this.synthInterval !== null) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
  }
}

export const weddingAudio = new WeddingAudioManager();
