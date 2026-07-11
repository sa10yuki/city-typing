// Web Audio APIで合成するタイプ音（音声ファイル不要）
import { getSettings } from "./settings";

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

/** 正打鍵音: 低めの「コッ」という打鍵音（ピッチ急降下サイン＋アタックノイズ） */
export function playType(): void {
  const { typeSound, typeVolume } = getSettings();
  if (!typeSound) return;
  try {
    const c = audio();
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(230 + Math.random() * 40, t); // 単調にならないよう揺らす
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.035);
    gain.gain.setValueAtTime(0.55 * typeVolume, t);
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
    ngain.gain.setValueAtTime(0.2 * typeVolume, t);
    ngain.gain.exponentialRampToValueAtTime(0.0001, t + 0.015);
    nsrc.connect(lp).connect(ngain).connect(c.destination);
    nsrc.start(t);
    nsrc.stop(t + 0.02);
  } catch {
    // 音が出せない環境では黙って続行
  }
}

/** ミス音: 低い短いブザー */
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
    gain.gain.setValueAtTime(0.16 * typeVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.11);
  } catch {
    // 音が出せない環境では黙って続行
  }
}
