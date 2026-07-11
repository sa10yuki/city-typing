// アプリ設定（タイプ音・読み上げ）の一元管理。localStorageに保存し、Reactから購読できる。
import { useSyncExternalStore } from "react";

export type Layout = "map-left" | "map-right" | "map-top" | "focus";

export interface Settings {
  /** タイプ音・ミス音を鳴らすか */
  typeSound: boolean;
  /** タイプ音の音量 0..1 */
  typeVolume: number;
  /** 市町村名を読み上げるか */
  voiceEnabled: boolean;
  /** 読み上げボイスID（"vv:2" ... / "browser"） */
  voiceId: string;
  /** タイピング画面の地図・お題の配置 */
  layout: Layout;
}

const KEY = "city-typing-settings";
const OLD_VOICE_KEY = "city-typing-voice";

const DEFAULTS: Settings = {
  typeSound: true,
  typeVolume: 0.6,
  voiceEnabled: true,
  voiceId: "vv:2",
  layout: "map-left",
};

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
    // 旧バージョンのボイス選択を引き継ぐ
    const oldVoice = localStorage.getItem(OLD_VOICE_KEY);
    if (oldVoice) return { ...DEFAULTS, voiceId: oldVoice };
  } catch {
    // 壊れていれば初期値
  }
  return { ...DEFAULTS };
}

let state: Settings = load();
const listeners = new Set<() => void>();

export function getSettings(): Settings {
  return state;
}

export function updateSettings(patch: Partial<Settings>): void {
  state = { ...state, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // noop
  }
  for (const l of listeners) l();
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Reactコンポーネントから設定を購読する */
export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings, getSettings);
}
