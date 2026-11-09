// 유튜브 IFrame 플레이어 (API 키 필요 없음). 영상은 화면에 보이게 두고, 재생 시각으로 노트를 맞춘다.
declare global {
  interface Window { YT: any; onYouTubeIframeAPIReady?: () => void }
}

let loading: Promise<void> | null = null;
export function loadApi(): Promise<void> {
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    window.onYouTubeIframeAPIReady = () => resolve();
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = () => reject(new Error('유튜브 플레이어를 불러오지 못했습니다'));
    document.head.appendChild(s);
  });
  return loading;
}

export class YtClock {
  player: any = null;
  ready = false;
  error = '';
  private base = 0;      // 마지막으로 읽은 영상 시각
  private baseAt = 0;    // 그때의 performance.now()
  private playing = false;

  async open(id: string, holder: HTMLElement): Promise<void> {
    await loadApi();
    this.ready = false; this.error = '';
    try { this.player?.destroy?.(); } catch { /* */ }
    this.player = null; this.playing = false;
    holder.innerHTML = '<div id="ytp"></div>';
    await new Promise<void>((resolve) => {
      this.player = new window.YT.Player('ytp', {
        videoId: id, width: '100%', height: '100%',
        playerVars: { controls: 0, disablekb: 1, modestbranding: 1, rel: 0, playsinline: 1 },
        events: {
          onReady: () => { this.ready = true; resolve(); },
          onError: (e: any) => { this.error = e.data === 101 || e.data === 150 ? '이 영상은 다른 사이트에서 재생할 수 없게 막혀 있습니다' : '영상을 불러오지 못했습니다'; resolve(); },
          onStateChange: (e: any) => { this.playing = e.data === 1; this.sync(); },
        },
      });
    });
  }

  title(): string {
    try { return this.player?.getVideoData()?.title ?? ''; } catch { return ''; }
  }
  duration(): number {
    try { return this.player?.getDuration() ?? 0; } catch { return 0; }
  }
  play(from = 0): void { this.lastOut = -Infinity; this.player?.seekTo(from, true); this.player?.playVideo(); }
  pause(): void { this.player?.pauseVideo(); }
  isPlaying(): boolean { return this.playing; }

  private sync(): void {
    try { this.base = this.player.getCurrentTime(); this.baseAt = performance.now(); } catch { /* */ }
  }

  /** 부드러운 현재 시각: 플레이어 값은 띄엄띄엄 바뀌므로 그 사이를 시계로 채우고, 차이는 조금씩 따라간다.
   *  perfMs(performance.now 기준)를 주면 그 순간의 영상 시각 (키를 누른 순간으로 판정하기 위해) */
  time(perfMs = performance.now()): number {
    if (!this.player) return 0;
    let raw = 0;
    try { raw = this.player.getCurrentTime(); } catch { return 0; }
    const now = performance.now();
    if (!this.playing) { this.base = raw; this.baseAt = now; this.lastOut = raw; return raw; }
    const est = this.base + (now - this.baseAt) / 1000;
    // 플레이어 값은 띄엄띄엄(브라우저에 따라 0.25초씩) 바뀌므로, 값이 바뀐 순간에만 비교해서 살살 따라간다.
    // 크게 어긋날 때(앞으로 건너뛰기·멈췄다 다시)만 바로 맞춘다. 시계는 뒤로 가지 않게.
    if (raw !== this.lastRaw) {
      const err = raw - est;
      if (Math.abs(err) > 0.5) { this.base = raw; this.baseAt = now; this.lastOut = -Infinity; }
      else { this.base = est + err * 0.3; this.baseAt = now; }
    }
    this.lastRaw = raw;
    const t = this.base + (perfMs - this.baseAt) / 1000;
    if (perfMs >= now && t < this.lastOut) return this.lastOut;
    if (perfMs >= now) this.lastOut = t;
    return t;
  }
  private lastRaw = -1;
  private lastOut = -1;
}
