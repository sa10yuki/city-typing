// Web Speech APIによる市町村名の読み上げ
// 漢字は地名の読み間違いが多いので、ひらがなの読みを渡して発音させる

const VOICE_KEY = "city-typing-voice";

let selectedName: string =
  typeof localStorage !== "undefined" ? (localStorage.getItem(VOICE_KEY) ?? "") : "";

function jaVoices(): SpeechSynthesisVoice[] {
  if (!("speechSynthesis" in window)) return [];
  return speechSynthesis.getVoices().filter((v) => v.lang.startsWith("ja"));
}

/** 選択可能な日本語ボイス名の一覧（読み込み前は空のことがある） */
export function getJaVoiceNames(): string[] {
  return jaVoices().map((v) => v.name);
}

/** ボイス一覧が変わったら通知を受ける（非同期読み込み対応） */
export function onVoicesChanged(cb: () => void): () => void {
  if (!("speechSynthesis" in window)) return () => {};
  speechSynthesis.addEventListener("voiceschanged", cb);
  return () => speechSynthesis.removeEventListener("voiceschanged", cb);
}

export function setVoice(name: string): void {
  selectedName = name;
  try {
    localStorage.setItem(VOICE_KEY, name);
  } catch {
    // noop
  }
}

/** 現在使われるボイス名（未選択時はおすすめ順の自動選択） */
export function getActiveVoiceName(): string {
  return resolveVoice()?.name ?? "";
}

function resolveVoice(): SpeechSynthesisVoice | null {
  const vs = jaVoices();
  if (selectedName) {
    const v = vs.find((v) => v.name === selectedName);
    if (v) return v;
  }
  // かわいい寄りの女性ボイスを優先
  const prefer = ["nanami", "ayumi", "sayaka", "google 日本語", "haruka", "kyoko"];
  for (const p of prefer) {
    const v = vs.find((v) => v.name.toLowerCase().includes(p));
    if (v) return v;
  }
  return vs[0] ?? null;
}

/** 読み（ひらがな）をかわいめの声で読み上げる。直前の読み上げは中断する */
export function speakName(kana: string): void {
  try {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(kana);
    const voice = resolveVoice();
    if (voice) u.voice = voice;
    u.lang = "ja-JP";
    u.pitch = 1.3; // 高めでかわいく
    u.rate = 1.1;
    u.volume = 0.9;
    speechSynthesis.speak(u);
  } catch {
    // 読み上げできない環境では黙って続行
  }
}

/** 読み上げを止める（画面離脱時など） */
export function stopSpeech(): void {
  try {
    if ("speechSynthesis" in window) speechSynthesis.cancel();
  } catch {
    // noop
  }
}
