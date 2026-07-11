// localStorage への進捗保存

export interface MuniStat {
  /** 累計ミス数 */
  miss: number;
  /** クリア回数 */
  clears: number;
  /** 累計所要時間(ms) */
  totalMs: number;
}

export interface SaveData {
  /** クリア済み市区町村コード */
  cleared: Record<string, 1>;
  /** 都道府県ID → ベストタイム(ms) */
  prefBest: Record<string, number>;
  /** 市区町村コード → 統計 */
  muniStats: Record<string, MuniStat>;
}

const KEY = "city-typing-save-v1";

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw) as Partial<SaveData>;
      return {
        cleared: d.cleared ?? {},
        prefBest: d.prefBest ?? {},
        muniStats: d.muniStats ?? {},
      };
    }
  } catch {
    // 壊れたデータは初期化
  }
  return { cleared: {}, prefBest: {}, muniStats: {} };
}

export function persistSave(d: SaveData): void {
  localStorage.setItem(KEY, JSON.stringify(d));
}

/** これまでの記録（制覇・ベストタイム・統計）をすべて削除する。設定は残す */
export function clearRecords(): void {
  localStorage.removeItem(KEY);
}

export function formatMs(ms: number): string {
  const t = Math.floor(ms);
  const m = Math.floor(t / 60000);
  const s = Math.floor((t % 60000) / 1000);
  const cs = Math.floor((t % 1000) / 10);
  return `${m}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

/** 秒未満を出さない表示（プレイ中のカウンター用） */
export function formatMsCoarse(ms: number): string {
  const t = Math.floor(ms);
  const m = Math.floor(t / 60000);
  const s = Math.floor((t % 60000) / 1000);
  return `${m}:${String(s).padStart(2, "0")}`;
}
