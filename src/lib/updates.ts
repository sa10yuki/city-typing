// アプリの更新情報。新しいものを配列の先頭に追加していく。
export interface UpdateEntry {
  date: string; // 表示用 "YYYY/M/D"
  text: string;
}

export const UPDATES: UpdateEntry[] = [
  { date: "2026/7/13", text: "ゲームモードがHARDとEASYで切り替えられるようになりました" },
];
