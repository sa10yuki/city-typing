// 市町村名の読み上げ
// VOICEVOXで事前生成した音声（public/voice/<styleId>/<code>.opus）を優先再生し、
// 無い場合や「ブラウザ標準」選択時はWeb Speech APIにフォールバックする。
import { getSettings } from "./settings";

export interface VoiceOption {
  id: string; // "vv:2" or "browser"
  label: string;
  credit?: string; // 例: VOICEVOX:四国めたん
}

// アプリに組み込むVOICEVOXキャラ（生成スクリプトのVOICESと一致させる）
export const VOICEVOX_VOICES = [
  { styleId: 2, char: "四国めたん" },
  { styleId: 3, char: "ずんだもん" },
  { styleId: 8, char: "春日部つむぎ" },
  { styleId: 14, char: "冥鳴ひまり" },
  { styleId: 29, char: "No.7" },
] as const;

export const VOICE_OPTIONS: VoiceOption[] = [
  ...VOICEVOX_VOICES.map((v) => ({
    id: `vv:${v.styleId}`,
    label: v.char,
    credit: `VOICEVOX:${v.char}`,
  })),
  { id: "browser", label: "ブラウザ標準（オフライン）" },
];

const BASE = import.meta.env.BASE_URL; // 通常 "/"
const VOICE_DIR = `${BASE}voice`;
const SAMPLE_CODE = "01100"; // 試聴用（札幌市）

let currentAudio: HTMLAudioElement | null = null;

// 音量100%超の増幅のためWeb Audioのゲインを経由する
let actx: AudioContext | null = null;
const sourceCache = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();
function audioCtx(): AudioContext | null {
  try {
    if (!actx) actx = new AudioContext();
    if (actx.state === "suspended") void actx.resume();
    return actx;
  } catch {
    return null;
  }
}

function stopAudio(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}

/** VOICEVOX音声を再生。失敗時は fallback() を一度だけ呼ぶ */
function playClip(styleId: string, code: string, fallback: () => void): void {
  const audio = new Audio(`${VOICE_DIR}/${styleId}/${code}.opus`);
  const vol = getSettings().voiceVolume;
  // 100%超はWeb Audioのゲインで増幅（対応しない環境は素のvolume・上限1.0）
  const c = audioCtx();
  if (c) {
    try {
      let src = sourceCache.get(audio);
      if (!src) {
        src = c.createMediaElementSource(audio);
        sourceCache.set(audio, src);
        const gain = c.createGain();
        gain.gain.value = vol;
        src.connect(gain).connect(c.destination);
      }
    } catch {
      audio.volume = Math.min(1, vol);
    }
  } else {
    audio.volume = Math.min(1, vol);
  }
  currentAudio = audio;
  let fellBack = false;
  const goFallback = () => {
    if (fellBack) return;
    fellBack = true;
    fallback();
  };
  audio.addEventListener("error", goFallback);
  audio.play().catch(goFallback);
}

function speakTTS(kana: string): void {
  try {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(kana);
    const ja = speechSynthesis.getVoices().find((v) => v.lang.startsWith("ja"));
    if (ja) u.voice = ja;
    u.lang = "ja-JP";
    u.pitch = 1.3;
    u.rate = 1.1;
    u.volume = Math.min(1, getSettings().voiceVolume);
    speechSynthesis.speak(u);
  } catch {
    // noop
  }
}

/** 市区町村の読みを再生する（code=5桁コード, kana=フォールバック用の読み） */
export function speakMuni(code: string, kana: string): void {
  const { voiceEnabled, voiceId } = getSettings();
  if (!voiceEnabled) return;
  stopSpeech();
  if (voiceId.startsWith("vv:")) {
    playClip(voiceId.slice(3), code, () => speakTTS(kana));
  } else {
    speakTTS(kana);
  }
}

/** 指定ボイスの試聴（札幌市を読む）。ブラウザ標準は固定文言 */
export function previewVoice(voiceId: string): void {
  stopSpeech();
  if (voiceId.startsWith("vv:")) {
    playClip(voiceId.slice(3), SAMPLE_CODE, () => speakTTS("さっぽろし"));
  } else {
    speakTTS("さっぽろし");
  }
}

/** 読み上げ・再生を止める */
export function stopSpeech(): void {
  stopAudio();
  try {
    if ("speechSynthesis" in window) speechSynthesis.cancel();
  } catch {
    // noop
  }
}
