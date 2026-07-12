// タイピングの運指ガイド。指ごとに色分けし、次に打つキーを光らせる。

interface Props {
  /** 次に打つキー（小文字1文字 / "-"）。無ければ何も光らない */
  nextKey: string;
}

// 指の識別子と色（左手=暖色、右手=寒色）
const FINGERS: Record<string, string> = {
  LP: "#ef4444", // 左小指
  LR: "#f97316", // 左薬指
  LM: "#eab308", // 左中指
  LI: "#84cc16", // 左人差し指
  RI: "#22c55e", // 右人差し指
  RM: "#06b6d4", // 右中指
  RR: "#3b82f6", // 右薬指
  RP: "#8b5cf6", // 右小指
};

// キー → 担当指
const KEY_FINGER: Record<string, keyof typeof FINGERS> = {
  "1": "LP", q: "LP", a: "LP", z: "LP",
  "2": "LR", w: "LR", s: "LR", x: "LR",
  "3": "LM", e: "LM", d: "LM", c: "LM",
  "4": "LI", "5": "LI", r: "LI", t: "LI", f: "LI", g: "LI", v: "LI", b: "LI",
  "6": "RI", "7": "RI", y: "RI", u: "RI", h: "RI", j: "RI", n: "RI", m: "RI",
  "8": "RM", i: "RM", k: "RM",
  "9": "RR", o: "RR", l: "RR",
  "0": "RP", "-": "RP", p: "RP",
};

const ROWS: string[][] = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-"],
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

// 各行の左インデント（キーボードらしいずらし）
const ROW_INDENT = [0, 0, 0.5, 1];

export default function KeyboardMap({ nextKey }: Props) {
  const next = nextKey.toLowerCase();
  return (
    <div className="kbd" aria-hidden="true">
      {ROWS.map((row, ri) => (
        <div className="kbd-row" key={ri} style={{ paddingLeft: `${ROW_INDENT[ri] * 2.4}rem` }}>
          {row.map((k) => {
            const finger = KEY_FINGER[k];
            const color = finger ? FINGERS[finger] : "#cbd5e1";
            const active = k === next;
            return (
              <span
                key={k}
                className={`kbd-key${active ? " active" : ""}`}
                style={{
                  // 通常は指色を薄く、次キーは指色でくっきり光らせる
                  background: active ? color : `${color}22`,
                  borderColor: active ? color : `${color}66`,
                  color: active ? "#fff" : "var(--text)",
                  boxShadow: active ? `0 0 0 3px ${color}55, 0 0 12px ${color}` : undefined,
                }}
              >
                {k.toUpperCase()}
              </span>
            );
          })}
        </div>
      ))}
      <div className="kbd-row">
        <span
          className={`kbd-key kbd-space${next === " " ? " active" : ""}`}
        >
          space
        </span>
      </div>
    </div>
  );
}
