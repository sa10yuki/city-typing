// アプリの更新情報。新しいものを配列の先頭に追加していく。
export interface UpdateEntry {
  date: string; // 表示用 "YYYY/M/D"
  text: string;
}

export const UPDATES: UpdateEntry[] = [
  { date: "2026/7/19", text: "ミス音の種類も5つから選べるようになりました" },
  { date: "2026/7/19", text: "タイプ音の種類を5つから選べるようになりました" },
  { date: "2026/7/19", text: "タイピング画面の地図・市町村名・キーボードの大きさを調整できるようになりました" },
];
