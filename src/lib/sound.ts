// Web Audio APIで合成するタイプ音（音声ファイル不要）
import { getSettings, type TypeSoundKind } from "./settings";

let ctx: AudioContext | null = null;

function audio(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

let noiseBuf: AudioBuffer | null = null;
function noise(c: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, Math.floor(c.sampleRate * 0.02), c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

/** メカニカル: 低めの「コッ」という打鍵音（ピッチ急降下サイン＋アタックノイズ） */
function mechanical(c: AudioContext, t: number, vol: number): void {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(230 + Math.random() * 40, t); // 単調にならないよう揺らす
  osc.frequency.exponentialRampToValueAtTime(70, t + 0.035);
  gain.gain.setValueAtTime(0.55 * vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.08);
  // 打鍵のカチッというアタック感（ローパスした短いノイズ）
  const nsrc = c.createBufferSource();
  nsrc.buffer = noise(c);
  const ngain = c.createGain();
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 3500;
  ngain.gain.setValueAtTime(0.2 * vol, t);
  ngain.gain.exponentialRampToValueAtTime(0.0001, t + 0.015);
  nsrc.connect(lp).connect(ngain).connect(c.destination);
  nsrc.start(t);
  nsrc.stop(t + 0.02);
}

/** ソフト: 高めで短い、静かなクリック音 */
function soft(c: AudioContext, t: number, vol: number): void {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1000 + Math.random() * 120, t);
  gain.gain.setValueAtTime(0.35 * vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.05);
}

/** ポップ: ピッチが跳ね上がる、はずむような音 */
function pop(c: AudioContext, t: number, vol: number): void {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(320 + Math.random() * 30, t);
  osc.frequency.exponentialRampToValueAtTime(760, t + 0.05);
  gain.gain.setValueAtTime(0.5 * vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.1);
}

/** タイプライター: カチャッと鋭い、昔ながらの打鍵音 */
function typewriter(c: AudioContext, t: number, vol: number): void {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(140 + Math.random() * 20, t);
  gain.gain.setValueAtTime(0.4 * vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.035);
  // カチャッというクリック感を足す高域ノイズ
  const nsrc = c.createBufferSource();
  nsrc.buffer = noise(c);
  const ngain = c.createGain();
  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 1800;
  ngain.gain.setValueAtTime(0.35 * vol, t);
  ngain.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
  nsrc.connect(hp).connect(ngain).connect(c.destination);
  nsrc.start(t);
  nsrc.stop(t + 0.025);
}

/** チャイム: ベルのような、やわらかい二音の余韻 */
function chime(c: AudioContext, t: number, vol: number): void {
  const partials: [number, number][] = [
    [880, 0.32],
    [1320, 0.14],
  ];
  for (const [freq, level] of partials) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq + Math.random() * 8;
    gain.gain.setValueAtTime(level * vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.24);
  }
}

const SOUND_FN: Record<TypeSoundKind, (c: AudioContext, t: number, vol: number) => void> = {
  mechanical,
  soft,
  pop,
  typewriter,
  chime,
};

/** 正打鍵音: 設定中の音色を鳴らす */
export function playType(): void {
  const { typeSound, typeVolume, typeSoundKind } = getSettings();
  if (!typeSound) return;
  try {
    const c = audio();
    SOUND_FN[typeSoundKind](c, c.currentTime, typeVolume);
  } catch {
    // 音が出せない環境では黙って続行
  }
}

/** 指定した音色を試聴する（設定のON/OFFに関わらず鳴らす） */
export function previewTypeSound(kind: TypeSoundKind): void {
  try {
    const c = audio();
    SOUND_FN[kind](c, c.currentTime, getSettings().typeVolume);
  } catch {
    // noop
  }
}

/** ミス音: 低い短いブザー（音色に関わらず共通） */
export function playMiss(): void {
  const { typeSound, typeVolume } = getSettings();
  if (!typeSound) return;
  try {
    const c = audio();
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = 140;
    // 正打鍵音と同じ音量に合わせる
    gain.gain.setValueAtTime(0.55 * typeVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.11);
  } catch {
    // 音が出せない環境では黙って続行
  }
}
