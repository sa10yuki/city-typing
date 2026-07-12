// localStorage への進捗保存

export interface MuniStat {
  /** 累計ミス数 */
  miss: number;
  /** クリア回数 */
  clears: number;
  /** 累計所要時間(ms) */
  totalMs: number;
}

export interface PrefBest {
  /** ベストタイム(ms) */
  ms: number;
  /** 記録した日付 (YYYY-MM-DD)。日付機能追加以前の記録は空文字 */
  date: string;
}

export interface SaveData {
  /** クリア済み市区町村コード */
  cleared: Record<string, 1>;
  /** 都道府県ID → ベストタイム */
  prefBest: Record<string, PrefBest>;
  /** 市区町村コード → 統計 */
  muniStats: Record<string, MuniStat>;
}

const KEY = "city-typing-save-v1";

// 旧形式（数値そのもの）を新形式に引き上げる
function migratePrefBest(raw: unknown): Record<string, PrefBest> {
  const out: Record<string, PrefBest> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "number") {
      out[k] = { ms: v, date: "" };
    } else if (v && typeof v === "object" && "ms" in v) {
      const o = v as { ms: number; date?: string };
      out[k] = { ms: o.ms, date: o.date ?? "" };
    }
  }
  return out;
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw) as Partial<SaveData>;
      return {
        cleared: d.cleared ?? {},
        prefBest: migratePrefBest(d.prefBest),
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

/** 秒未満を出さない表示(プレイ中のカウンター用) */
export function formatMsCoarse(ms: number): string {
  const t = Math.floor(ms);
  const m = Math.floor(t / 60000);
  const s = Math.floor((t % 60000) / 1000);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** 今日の日付を YYYY-MM-DD で返す */
export function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** ISO日付(YYYY-MM-DD)を "YYYY/M/D" 表示に変換。空文字はそのまま空文字 */
export function formatDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${y}/${Number(m)}/${Number(d)}`;
}
