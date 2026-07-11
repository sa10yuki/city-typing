import { useEffect, useState } from "react";
import {
  getActiveVoiceName,
  getJaVoiceNames,
  onVoicesChanged,
  setVoice,
  speakName,
} from "../lib/speech";

// ブラウザのボイス名から分かりやすい表示名に整える
function label(name: string): string {
  // "Microsoft Ayumi - Japanese (Japan)" → "Ayumi"
  const m = name.match(/Microsoft\s+([^\s-]+)/);
  if (m) return m[1];
  // "Google 日本語" などはそのまま
  return name.replace(/\s*\(.*\)$/, "");
}

const SAMPLE = "さっぽろし"; // 試聴用サンプル読み

export default function VoicePicker() {
  const [names, setNames] = useState<string[]>(getJaVoiceNames());
  const [active, setActive] = useState<string>(getActiveVoiceName());

  useEffect(() => {
    // ボイスは非同期で読み込まれることがあるため変更を購読
    const refresh = () => {
      setNames(getJaVoiceNames());
      setActive(getActiveVoiceName());
    };
    refresh();
    return onVoicesChanged(refresh);
  }, []);

  if (names.length === 0) {
    return (
      <div className="voice-picker">
        <span className="voice-label">🔊 読み上げの声</span>
        <span className="voice-none">この端末に日本語の音声が見つかりませんでした</span>
      </div>
    );
  }

  return (
    <div className="voice-picker">
      <span className="voice-label">🔊 読み上げの声</span>
      <select
        className="voice-select"
        value={active}
        onChange={(e) => {
          setVoice(e.target.value);
          setActive(e.target.value);
          speakName(SAMPLE); // 選んだ声で即試聴
        }}
      >
        {names.map((n) => (
          <option key={n} value={n}>
            {label(n)}
          </option>
        ))}
      </select>
      <button className="btn ghost voice-try" onClick={() => speakName(SAMPLE)}>
        ▶ 試聴
      </button>
    </div>
  );
}
