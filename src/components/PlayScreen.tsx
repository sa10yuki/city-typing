import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { munisByPref, prefName, shuffle, type Muni } from "../lib/data";
import { TypingChallenge } from "../lib/romaji";
import { formatMs } from "../lib/storage";
import MuniMap from "./MuniMap";

export interface MuniResult {
  code: string;
  ms: number;
  miss: number;
}

export interface RunResult {
  prefId: number;
  totalMs: number;
  keys: number;
  miss: number;
  perMuni: MuniResult[];
}

interface Props {
  prefId: number;
  clearedAll: Record<string, 1>;
  onMuniCleared: (r: MuniResult) => void;
  onFinish: (r: RunResult) => void;
  onQuit: () => void;
}

const COLOR_CLEARED = "#6366f1";
const COLOR_RUN = "#22c55e";
const COLOR_CURRENT = "#f59e0b";
const COLOR_IDLE = "#e2e8f0";

export default function PlayScreen({ prefId, clearedAll, onMuniCleared, onFinish, onQuit }: Props) {
  const queue = useMemo<Muni[]>(() => shuffle(munisByPref.get(prefId) ?? []), [prefId]);
  // ゲーム進行はすべてrefで持つ（高速連打時にレンダー待ちの古いstateを掴まないため）
  const idxRef = useRef(0);
  const challengeRef = useRef<TypingChallenge | null>(null);
  const startTimeRef = useRef(0);
  const qStartRef = useRef(0);
  const missTotalRef = useRef(0);
  const keysRef = useRef(0);
  const qMissRef = useRef(0);
  const perMuniRef = useRef<MuniResult[]>([]);
  const runClearedRef = useRef<Set<string>>(new Set());
  const finishedRef = useRef(false);

  // 表示用state（refの内容を反映するためのトリガ）
  const [, setTick] = useState(0);
  const [started, setStarted] = useState(false);
  const [missFlash, setMissFlash] = useState(false);

  if (challengeRef.current === null && queue.length > 0) {
    challengeRef.current = new TypingChallenge(queue[0].k);
  }

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onQuit();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const ch = e.key.length === 1 ? e.key.toLowerCase() : "";
      if (!/^[a-z-]$/.test(ch)) return;
      e.preventDefault();

      if (finishedRef.current) return;
      const challenge = challengeRef.current;
      const current = queue[idxRef.current];
      if (!challenge || !current) return;

      const now = performance.now();
      if (startTimeRef.current === 0) {
        startTimeRef.current = now;
        qStartRef.current = now;
        setStarted(true);
      }

      const res = challenge.input(ch);
      if (res === "miss") {
        missTotalRef.current += 1;
        qMissRef.current += 1;
        setMissFlash(true);
        window.setTimeout(() => setMissFlash(false), 120);
        setTick((t) => t + 1);
        return;
      }
      keysRef.current += 1;
      if (res === "done") {
        const r: MuniResult = {
          code: current.c,
          ms: now - qStartRef.current,
          miss: qMissRef.current,
        };
        perMuniRef.current.push(r);
        runClearedRef.current.add(current.c);
        onMuniCleared(r);
        idxRef.current += 1;
        qMissRef.current = 0;
        qStartRef.current = now;
        const next = queue[idxRef.current];
        if (next) {
          challengeRef.current = new TypingChallenge(next.k);
        } else {
          finishedRef.current = true;
          onFinish({
            prefId,
            totalMs: now - startTimeRef.current,
            keys: keysRef.current,
            miss: missTotalRef.current,
            perMuni: perMuniRef.current,
          });
          return;
        }
      }
      setTick((t) => t + 1);
    },
    [queue, prefId, onMuniCleared, onFinish, onQuit]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  const idx = idxRef.current;
  const current = queue[idx];
  const challenge = challengeRef.current;
  const kanaDone = challenge?.kanaDone ?? 0;
  const curLen = challenge?.currentKana.length ?? 0;

  const getFill = useCallback(
    (code: string | null) => {
      if (!code) return COLOR_IDLE;
      if (current && code === current.c) return COLOR_CURRENT;
      if (runClearedRef.current.has(code)) return COLOR_RUN;
      if (clearedAll[code]) return COLOR_CLEARED;
      return COLOR_IDLE;
    },
    [current, clearedAll]
  );

  return (
    <div className="play">
      <header className="play-header">
        <button className="btn ghost" onClick={onQuit}>
          ← やめる (Esc)
        </button>
        <h2>{prefName(prefId)} タイムアタック</h2>
        <div className="play-meta">
          <span className="counter">
            {Math.min(idx + 1, queue.length)} / {queue.length}
          </span>
          <Timer started={started} startTime={startTimeRef.current} />
          <span className="miss-count">ミス {missTotalRef.current}</span>
        </div>
      </header>

      <div className="play-body">
        <div className="play-map">
          <MuniMap prefId={prefId} width={380} height={380} getFill={getFill} />
        </div>

        <div className={`question-card${missFlash ? " miss-flash" : ""}`}>
          {!started && <p className="hint">キーを打つとスタート！</p>}
          {current && (
            <>
              <div className="q-name">{current.n}</div>
              <div className="q-kana">
                <span className="kana-done">{current.k.slice(0, kanaDone)}</span>
                <span className="kana-current">{current.k.slice(kanaDone, kanaDone + curLen)}</span>
                <span className="kana-rest">{current.k.slice(kanaDone + curLen)}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Timer({ started, startTime }: { started: boolean; startTime: number }) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!started) return;
    const id = window.setInterval(() => setNow(performance.now()), 47);
    return () => window.clearInterval(id);
  }, [started]);
  return <span className="timer">{formatMs(started ? Math.max(0, now - startTime) : 0)}</span>;
}
