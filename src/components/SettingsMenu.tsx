import { useEffect, useRef, useState } from "react";
import { updateSettings, useSettings, type GameMode, type Layout, type TypeSoundKind } from "../lib/settings";
import { previewVoice, VOICE_OPTIONS } from "../lib/speech";
import { previewTypeSound } from "../lib/sound";
import { clearRecords } from "../lib/storage";

const LAYOUTS: { id: Layout; label: string; icon: string }[] = [
  { id: "map-left", label: "地図 左", icon: "◧" },
  { id: "map-right", label: "地図 右", icon: "◨" },
  { id: "map-top", label: "地図 上", icon: "⬒" },
  { id: "focus", label: "地図なし", icon: "▢" },
];

const GAME_MODES: { id: GameMode; label: string; desc: string }[] = [
  { id: "hard", label: "HARD", desc: "制覇済みでもミスすると外れる" },
  { id: "easy", label: "EASY", desc: "一度制覇したら外れない" },
];

const TYPE_SOUND_KINDS: { id: TypeSoundKind; label: string }[] = [
  { id: "mechanical", label: "メカニカル" },
  { id: "soft", label: "ソフト" },
  { id: "pop", label: "ポップ" },
  { id: "typewriter", label: "タイプライター" },
  { id: "chime", label: "チャイム" },
];

export default function SettingsMenu() {
  const s = useSettings();
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 外側クリックで閉じる
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirmReset(false);
      }
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
        <span className="gear-icon">⚙</span>
        <span className="gear-text">設定</span>
      </button>

      {open && (
        <div className="settings-panel" role="dialog" aria-label="設定">
          <h3>設定</h3>

          <section>
            <div className="row">
              <span>ゲームモード</span>
            </div>
            <div className="mode-grid">
              {GAME_MODES.map((m) => (
                <button
                  key={m.id}
                  className={`mode-opt${s.gameMode === m.id ? " active" : ""}`}
                  onClick={() => updateSettings({ gameMode: m.id })}
                >
                  <span className="mode-label">{m.label}</span>
                  <span className="mode-desc">{m.desc}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <label className="row">
              <span>タイプ音</span>
              <input
                type="checkbox"
                checked={s.typeSound}
                onChange={(e) => updateSettings({ typeSound: e.target.checked })}
              />
            </label>
            <div className="row sub">
              <span>音色</span>
              <div className="voice-controls">
                <select
                  value={s.typeSoundKind}
                  disabled={!s.typeSound}
                  onChange={(e) => {
                    const kind = e.target.value as TypeSoundKind;
                    updateSettings({ typeSoundKind: kind });
                    previewTypeSound(kind);
                  }}
                >
                  {TYPE_SOUND_KINDS.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.label}
                    </option>
                  ))}
                </select>
                <button
                  className="btn ghost try"
                  disabled={!s.typeSound}
                  onClick={() => previewTypeSound(s.typeSoundKind)}
                >
                  ▶
                </button>
              </div>
            </div>
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
            <label className="row sub">
              <span>音量</span>
              <input
                type="range"
                min={0}
                max={1.6}
                step={0.05}
                value={s.voiceVolume}
                disabled={!s.voiceEnabled}
                onChange={(e) => updateSettings({ voiceVolume: Number(e.target.value) })}
              />
            </label>
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
            <label className="row" style={{ marginTop: 10 }}>
              <span>キーボードマップを表示</span>
              <input
                type="checkbox"
                checked={s.showKeyboard}
                onChange={(e) => updateSettings({ showKeyboard: e.target.checked })}
              />
            </label>
          </section>

          <section>
            <div className="row">
              <span>各エリアの大きさ</span>
              <button
                className="size-reset"
                onClick={() => updateSettings({ mapSize: 1, questionSize: 1, keyboardSize: 1 })}
              >
                リセット
              </button>
            </div>
            <label className="row sub">
              <span>地図</span>
              <span className="size-controls">
                <input
                  type="range"
                  min={0.6}
                  max={1.5}
                  step={0.05}
                  value={s.mapSize}
                  onChange={(e) => updateSettings({ mapSize: Number(e.target.value) })}
                />
                <span className="size-value">{Math.round(s.mapSize * 100)}%</span>
              </span>
            </label>
            <label className="row sub">
              <span>市町村名</span>
              <span className="size-controls">
                <input
                  type="range"
                  min={0.6}
                  max={1.5}
                  step={0.05}
                  value={s.questionSize}
                  onChange={(e) => updateSettings({ questionSize: Number(e.target.value) })}
                />
                <span className="size-value">{Math.round(s.questionSize * 100)}%</span>
              </span>
            </label>
            <label className="row sub">
              <span>キーボード</span>
              <span className="size-controls">
                <input
                  type="range"
                  min={0.6}
                  max={1.5}
                  step={0.05}
                  value={s.keyboardSize}
                  disabled={!s.showKeyboard}
                  onChange={(e) => updateSettings({ keyboardSize: Number(e.target.value) })}
                />
                <span className="size-value">{Math.round(s.keyboardSize * 100)}%</span>
              </span>
            </label>
          </section>

          <section>
            {!confirmReset ? (
              <button className="reset-btn" onClick={() => setConfirmReset(true)}>
                これまでの記録を全て消す
              </button>
            ) : (
              <div className="reset-confirm">
                <p>制覇・ベストタイムが全て消えます。本当に消していい？</p>
                <div className="reset-actions">
                  <button
                    className="reset-btn danger"
                    onClick={() => {
                      clearRecords();
                      location.reload();
                    }}
                  >
                    はい、消す
                  </button>
                  <button className="btn ghost" onClick={() => setConfirmReset(false)}>
                    キャンセル
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
