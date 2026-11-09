// Web Audio로 자체곡을 실시간 합성. 1초 앞까지만 미리 예약해 노드가 쌓이지 않게 한다.
import { freq, type Song, type Ev } from '../core/music.ts';

export class Synth {
  ctx: AudioContext;
  out: GainNode;
  private comp: DynamicsCompressorNode;
  private delay: DelayNode;
  private noise: AudioBuffer;
  private song: Song | null = null;
  private start = 0;
  private idx = 0;
  private skip: Set<number> = new Set();
  private until = Infinity;
  analyser: AnalyserNode;
  private bins: Uint8Array<ArrayBuffer>;
  volume = 0.8;

  constructor() {
    this.ctx = new AudioContext({ latencyHint: 'interactive' });
    this.comp = this.ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14; this.comp.ratio.value = 4;
    this.out = this.ctx.createGain();
    this.out.gain.value = this.volume;
    this.comp.connect(this.out).connect(this.ctx.destination);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256; this.analyser.smoothingTimeConstant = 0.75;
    this.out.connect(this.analyser);
    this.bins = new Uint8Array(this.analyser.frequencyBinCount);
    // 가벼운 울림 (메아리)
    this.delay = this.ctx.createDelay(1);
    this.delay.delayTime.value = 0.28;
    const fb = this.ctx.createGain(); fb.gain.value = 0.28;
    const wet = this.ctx.createGain(); wet.gain.value = 0.22;
    this.delay.connect(fb).connect(this.delay);
    this.delay.connect(wet).connect(this.comp);
    const len = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  /** 오디오 출력 지연(초) — 판정에서 뺀다 */
  latency(): number {
    return (this.ctx.outputLatency || 0) + (this.ctx.baseLatency || 0);
  }

  async resume(): Promise<void> {
    if (this.ctx.state !== 'running') await this.ctx.resume();
  }

  /** delay초 뒤에 곡 시작. 돌려주는 값: 곡 0초의 ctx 시각.
   *  skip: 반주에서 뺄 소리(노트가 된 소리 — 칠 때 난다), from/until: 박 단위 구간(미리듣기) */
  play(song: Song, delay = 2.0, opt: { skip?: Set<number>; from?: number; until?: number; volume?: number } = {}): number {
    this.song = song;
    this.skip = opt.skip ?? new Set();
    const from = opt.from ?? 0;
    this.until = opt.until ?? Infinity;
    this.idx = song.events.findIndex((e) => e.t >= from - 1e-6);
    if (this.idx < 0) this.idx = song.events.length;
    this.start = this.ctx.currentTime + delay - from * (60 / song.bpm);
    this.out.gain.cancelScheduledValues(this.ctx.currentTime);
    this.out.gain.setValueAtTime(this.volume * (opt.volume ?? 1), this.ctx.currentTime);
    this.off = null;
    this.pump();
    return this.start;
  }

  stop(): void {
    this.song = null;
    this.out.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    setTimeout(() => { if (!this.song) { this.out.gain.cancelScheduledValues(this.ctx.currentTime); this.out.gain.value = this.volume; } }, 200);
  }

  /** 곡 시간(초) */
  time(perfMs = performance.now()): number {
    // 스피커에서 지금 나오는 소리의 시각 = 출력 시각표(getOutputTimestamp)로 화면 시계와 이어 붙인다.
    // 값이 조금씩 흔들리므로 둘의 차이(off)를 천천히 따라가게 해서 노트가 매끄럽게 내려오게 한다.
    const c = this.ctx;
    if (c.state !== 'running') return this.frozen;
    const ts = c.getOutputTimestamp ? c.getOutputTimestamp() : null;
    let off: number;
    if (ts && ts.performanceTime && ts.contextTime !== undefined) off = ts.contextTime - ts.performanceTime / 1000;
    else off = c.currentTime - this.latency() - performance.now() / 1000;
    if (this.off === null || Math.abs(off - this.off) > 0.05) this.off = off;
    else this.off += (off - this.off) * 0.02;
    this.frozen = perfMs / 1000 + this.off - this.start;
    return this.frozen;
  }
  private off: number | null = null;
  private frozen = 0;

  /** 판정 맞추기용 박자 소리: delay초 뒤부터 bpm으로 n번. 돌려주는 값: 한 박 길이 */
  metronome(bpm: number, n: number, delay = 1.5): number {
    this.song = null;
    this.start = this.ctx.currentTime + delay;
    this.off = null;
    const spb = 60 / bpm;
    for (let i = 0; i < n; i++) {
      const at = this.start + i * spb;
      const g = this.ctx.createGain(); g.connect(this.comp);
      const o = this.osc('square', i % 4 === 0 ? 1760 : 1320, at, at + 0.05, g);
      void o;
      g.gain.setValueAtTime(0.25, at); g.gain.exponentialRampToValueAtTime(0.001, at + 0.05);
    }
    return spb;
  }

  /** 타격음: 누른 순간 바로 (톡·딱·착·쿵) */
  tick(kind: string, vol = 0.6): void {
    const c = this.ctx, at = c.currentTime;
    if (c.state !== 'running' || kind === 'off' || vol <= 0) return;
    const g = c.createGain(); g.connect(this.comp);
    if (kind === 'tok') {        // 나무 두드리는 소리
      const o = this.osc('sine', 1400, at, at + 0.06, g);
      o.frequency.setValueAtTime(1400, at); o.frequency.exponentialRampToValueAtTime(700, at + 0.04);
      g.gain.setValueAtTime(0.5 * vol, at); g.gain.exponentialRampToValueAtTime(0.001, at + 0.05);
    } else if (kind === 'tak') { // 테두리 치는 소리
      const o = this.osc('triangle', 1900, at, at + 0.04, g);
      void o;
      g.gain.setValueAtTime(0.35 * vol, at); g.gain.exponentialRampToValueAtTime(0.001, at + 0.03);
      this.noiseHit(at, 'bandpass', 3200, 0.03, 0.5 * vol);
    } else if (kind === 'chak') { // 닫힌 심벌
      g.disconnect();
      this.noiseHit(at, 'highpass', 6500, 0.045, 0.45 * vol);
    } else if (kind === 'kung') { // 작은 북
      const o = this.osc('sine', 200, at, at + 0.1, g);
      o.frequency.setValueAtTime(200, at); o.frequency.exponentialRampToValueAtTime(60, at + 0.08);
      g.gain.setValueAtTime(0.8 * vol, at); g.gain.exponentialRampToValueAtTime(0.001, at + 0.1);
    }
  }
  private noiseHit(at: number, type: BiquadFilterType, f: number, len: number, peak: number): void {
    const src = this.ctx.createBufferSource(); src.buffer = this.noise;
    const fl = this.ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f;
    const g = this.ctx.createGain();
    src.connect(fl).connect(g).connect(this.comp);
    g.gain.setValueAtTime(peak, at); g.gain.exponentialRampToValueAtTime(0.001, at + len);
    src.start(at, Math.random() * 0.5); src.stop(at + len + 0.02);
  }

  /** 곡이 아직 나오는 중인지 (미리듣기 반복용) */
  playing(): boolean {
    const s = this.song;
    if (!s) return false;
    const end = Math.min(this.until, s.beats) * (60 / s.bpm);
    return this.time() < end + 0.5;
  }

  /** 키음: 노트를 친 순간 그 노트의 소리를 낸다 */
  keysound(ev: number): void {
    const s = this.song;
    if (!s || !s.events[ev]) return;
    this.voice(s.events[ev], this.ctx.currentTime + 0.005, 60 / s.bpm, s);
  }

  /** 소리 크기 막대 (0~1) n개 */
  spectrum(n: number): number[] {
    this.analyser.getByteFrequencyData(this.bins);
    const out: number[] = [];
    const usable = Math.floor(this.bins.length * 0.7);
    for (let i = 0; i < n; i++) {
      const a = Math.floor(Math.pow(i / n, 1.6) * usable), b = Math.max(a + 1, Math.floor(Math.pow((i + 1) / n, 1.6) * usable));
      let m = 0;
      for (let k = a; k < b; k++) m = Math.max(m, this.bins[k]);
      out.push(m / 255);
    }
    return out;
  }

  pump(): void {
    const s = this.song;
    if (!s) return;
    const spb = 60 / s.bpm;
    const horizon = this.ctx.currentTime + 1.0;
    while (this.idx < s.events.length) {
      const e = s.events[this.idx];
      const at = this.start + e.t * spb;
      if (at > horizon || e.t >= this.until) break;
      if (at >= this.ctx.currentTime - 0.05 && !this.skip.has(this.idx)) this.voice(e, at, spb, s);
      this.idx++;
    }
  }

  private env(g: GainNode, at: number, a: number, peak: number, d: number, sus: number, end: number, r: number): void {
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(peak, at + a);
    g.gain.linearRampToValueAtTime(peak * sus, at + a + d);
    g.gain.setValueAtTime(peak * sus, Math.max(at + a + d, end));
    g.gain.linearRampToValueAtTime(0, Math.max(at + a + d, end) + r);
  }

  private osc(type: OscillatorType, f: number, at: number, end: number, dest: AudioNode, detune = 0): OscillatorNode {
    const o = this.ctx.createOscillator();
    o.type = type; o.frequency.value = f; o.detune.value = detune;
    o.connect(dest); o.start(at); o.stop(end + 0.3);
    return o;
  }

  private voice(e: Ev, at: number, spb: number, s: Song): void {
    const c = this.ctx;
    const end = at + e.dur * spb * 0.95;
    switch (e.part) {
      case 'lead': {
        const g = c.createGain(); const f = c.createBiquadFilter();
        f.type = 'lowpass'; f.Q.value = 4;
        f.frequency.setValueAtTime(900, at); f.frequency.linearRampToValueAtTime(3800, at + 0.03); f.frequency.exponentialRampToValueAtTime(1600, at + 0.25);
        f.connect(g).connect(this.comp); g.connect(this.delay);
        this.env(g, at, 0.01, 0.16 * e.vel, 0.12, 0.7, end, 0.08);
        this.osc(s.lead === 'saw' ? 'sawtooth' : s.lead, freq(e.pitch), at, end, f, -6);
        this.osc(s.lead === 'saw' ? 'sawtooth' : s.lead === 'triangle' ? 'sine' : s.lead, freq(e.pitch), at, end, f, 7);
        break;
      }
      case 'bass': {
        const g = c.createGain(); const f = c.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = 600;
        f.connect(g).connect(this.comp);
        this.env(g, at, 0.005, 0.22 * e.vel, 0.08, 0.6, end, 0.04);
        this.osc('sawtooth', freq(e.pitch), at, end, f);
        this.osc('sine', freq(e.pitch), at, end, f);
        break;
      }
      case 'pad': {
        const g = c.createGain(); const f = c.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = 1400;
        f.connect(g).connect(this.comp);
        this.env(g, at, 0.3, 0.035, 0.4, 0.8, end, 0.4);
        this.osc('sawtooth', freq(e.pitch), at, end, f, -10);
        this.osc('sawtooth', freq(e.pitch), at, end, f, 10);
        break;
      }
      case 'arp': {
        const g = c.createGain();
        g.connect(this.comp); g.connect(this.delay);
        this.env(g, at, 0.003, 0.05, 0.08, 0.2, end, 0.05);
        this.osc('square', freq(e.pitch), at, end, g);
        break;
      }
      case 'kick': {
        const g = c.createGain(); g.connect(this.comp);
        const o = this.osc('sine', 150, at, at + 0.3, g);
        o.frequency.setValueAtTime(150, at); o.frequency.exponentialRampToValueAtTime(42, at + 0.15);
        g.gain.setValueAtTime(0.9, at); g.gain.exponentialRampToValueAtTime(0.001, at + 0.3);
        break;
      }
      case 'snare': case 'hat': {
        const src = c.createBufferSource(); src.buffer = this.noise;
        const f = c.createBiquadFilter();
        f.type = e.part === 'snare' ? 'bandpass' : 'highpass';
        f.frequency.value = e.part === 'snare' ? 1800 : 7000;
        const g = c.createGain();
        src.connect(f).connect(g).connect(this.comp);
        const len = e.part === 'snare' ? 0.16 : 0.04;
        g.gain.setValueAtTime(e.part === 'snare' ? 0.45 : 0.12, at); g.gain.exponentialRampToValueAtTime(0.001, at + len);
        src.start(at, Math.random() * 0.5); src.stop(at + len + 0.02);
        if (e.part === 'snare') {
          const tg = c.createGain(); tg.connect(this.comp);
          const o = this.osc('triangle', 220, at, at + 0.1, tg);
          o.frequency.exponentialRampToValueAtTime(120, at + 0.08);
          tg.gain.setValueAtTime(0.25, at); tg.gain.exponentialRampToValueAtTime(0.001, at + 0.1);
        }
        break;
      }
    }
  }
}

/** 짧은 효과음 (Kenney UI 소리) */
export class Sfx {
  private bufs = new Map<string, AudioBuffer>();
  constructor(private synth: Synth, base: string) {
    for (const n of ['tap-a', 'tap-b', 'click-a', 'switch-a']) {
      fetch(`${base}assets/sfx/${n}.ogg`).then((r) => r.arrayBuffer()).then((b) => synth.ctx.decodeAudioData(b)).then((a) => this.bufs.set(n, a)).catch(() => {});
    }
  }
  play(n: string, vol = 0.5): void {
    const b = this.bufs.get(n);
    if (!b) return;
    const s = this.synth.ctx.createBufferSource(); s.buffer = b;
    const g = this.synth.ctx.createGain(); g.gain.value = vol;
    s.connect(g).connect(this.synth.ctx.destination);
    s.start();
  }
}
