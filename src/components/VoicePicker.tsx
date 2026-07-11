import { useState } from "react";
import { getSelectedVoice, previewVoice, setSelectedVoice, VOICE_OPTIONS } from "../lib/speech";

export default function VoicePicker() {
  const [selected, setSelected] = useState<string>(getSelectedVoice());

  return (
    <div className="voice-picker">
      <span className="voice-label">🎙️ 読み上げの声</span>
      <select
        className="voice-select"
        value={selected}
        onChange={(e) => {
          const id = e.target.value;
          setSelectedVoice(id);
          setSelected(id);
          previewVoice(id); // 選んだ声で即試聴
        }}
      >
        {VOICE_OPTIONS.map((v) => (
          <option key={v.id} value={v.id}>
            {v.label}
          </option>
        ))}
      </select>
      <button className="btn ghost voice-try" onClick={() => previewVoice(selected)}>
        ▶ 試聴
      </button>
    </div>
  );
}
