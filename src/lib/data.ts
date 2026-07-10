import raw from "../data/municipalities.json";

export interface Pref {
  id: number;
  name: string;
}

export interface Muni {
  /** 5桁の市区町村コード */
  c: string;
  /** 正式名（例: 札幌市） */
  n: string;
  /** 正式読み（例: さっぽろし） */
  k: string;
  /** 出題用の名前・接尾辞なし（例: 札幌） */
  b: string;
  /** 出題用の読み・接尾辞なし（例: さっぽろ） */
  bk: string;
  /** 都道府県ID 1-47 */
  p: number;
}

export const prefs = raw.prefs as Pref[];
export const munis = raw.munis as Muni[];

export const TOTAL_MUNIS = munis.length;

export const munisByPref: Map<number, Muni[]> = new Map();
for (const m of munis) {
  const list = munisByPref.get(m.p);
  if (list) list.push(m);
  else munisByPref.set(m.p, [m]);
}

export const muniByCode: Map<string, Muni> = new Map(munis.map((m) => [m.c, m]));

export function prefName(id: number): string {
  return prefs.find((p) => p.id === id)?.name ?? "";
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
