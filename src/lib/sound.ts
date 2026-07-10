// Web Audio APIで合成するタイプ音（音声ファイル不要）

let ctx: AudioContext | null = null;

function audio(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** 正打鍵音: 高めの短いクリック */
export function playType(): void {
  try {
    const c = audio();
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "triangle";
    osc.frequency.value = 1500 + Math.random() * 250; // 単調にならないよう揺らす
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  } catch {
    // 音が出せない環境では黙って続行
  }
}

/** ミス音: 低い短いブザー */
export function playMiss(): void {
  try {
    const c = audio();
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = 140;
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.11);
  } catch {
    // 音が出せない環境では黙って続行
  }
}
