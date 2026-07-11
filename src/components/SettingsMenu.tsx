import { useEffect, useRef, useState } from "react";
import { updateSettings, useSettings, type Layout } from "../lib/settings";
import { previewVoice, VOICE_OPTIONS } from "../lib/speech";

const LAYOUTS: { id: Layout; label: string; icon: string }[] = [
  { id: "map-left", label: "地図 左", icon: "◧" },
  { id: "map-right", label: "地図 右", icon: "◨" },
  { id: "map-top", label: "地図 上", icon: "⬒" },
  { id: "focus", label: "地図なし", icon: "▢" },
];

export default function SettingsMenu() {
  const s = useSettings();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 外側クリックで閉じる
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="settings" ref={ref}>
      <button
        className="settings-gear"
        aria-label="設定"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        ⚙
      </button>

      {open && (
        <div className="settings-panel" role="dialog" aria-label="設定">
          <h3>設定</h3>

          <section>
            <label className="row">
              <span>タイプ音</span>
              <input
                type="checkbox"
                checked={s.typeSound}
                onChange={(e) => updateSettings({ typeSound: e.target.checked })}
              />
            </label>
            <label className="row sub">
              <span>音量</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={s.typeVolume}
                disabled={!s.typeSound}
                onChange={(e) => updateSettings({ typeVolume: Number(e.target.value) })}
              />
            </label>
          </section>

          <section>
            <label className="row">
              <span>市町村名の読み上げ</span>
              <input
                type="checkbox"
                checked={s.voiceEnabled}
                onChange={(e) => updateSettings({ voiceEnabled: e.target.checked })}
              />
            </label>
            <div className="row sub">
              <span>声</span>
              <div className="voice-controls">
                <select
                  value={s.voiceId}
                  disabled={!s.voiceEnabled}
                  onChange={(e) => {
                    updateSettings({ voiceId: e.target.value });
                    previewVoice(e.target.value);
                  }}
                >
                  {VOICE_OPTIONS.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
                <button
                  className="btn ghost try"
                  disabled={!s.voiceEnabled}
                  onClick={() => previewVoice(s.voiceId)}
                >
                  ▶
                </button>
              </div>
            </div>
          </section>

          <section>
            <div className="row">
              <span>タイピング画面の配置</span>
            </div>
            <div className="layout-grid">
              {LAYOUTS.map((l) => (
                <button
                  key={l.id}
                  className={`layout-opt${s.layout === l.id ? " active" : ""}`}
                  onClick={() => updateSettings({ layout: l.id })}
                >
                  <span className="layout-icon">{l.icon}</span>
                  <span className="layout-label">{l.label}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
