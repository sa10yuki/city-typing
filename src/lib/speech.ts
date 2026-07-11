// Web Speech APIによる市町村名の読み上げ
// 漢字は地名の読み間違いが多いので、ひらがなの読みを渡して発音させる

let voice: SpeechSynthesisVoice | null = null;

function pickVoice(): void {
  const ja = speechSynthesis.getVoices().filter((v) => v.lang.startsWith("ja"));
  // 女性ボイスを優先（Windows: Nanami/Ayumi/Haruka、macOS: Kyoko など）
  voice =
    ja.find((v) => /nanami|ayumi|haruka|sayaka|kyoko|o-ren|female|女性/i.test(v.name)) ??
    ja[0] ??
    null;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  pickVoice();
  speechSynthesis.addEventListener("voiceschanged", pickVoice);
}

/** 読み（ひらがな）をかわいめの声で読み上げる。直前の読み上げは中断する */
export function speakName(kana: string): void {
  try {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(kana);
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
