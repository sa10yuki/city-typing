import { useCallback, useRef, useState } from "react";
import Home from "./components/Home";
import PlayScreen, { type MuniResult, type RunResult } from "./components/PlayScreen";
import ResultScreen from "./components/ResultScreen";
import SettingsMenu from "./components/SettingsMenu";
import PrefAtlas from "./components/PrefAtlas";
import { loadSave, persistSave, type SaveData } from "./lib/storage";

type View =
  | { t: "home" }
  | { t: "atlas"; prefId: number }
  | { t: "play"; prefId: number; runKey: number }
  | { t: "result"; result: RunResult; isBest: boolean; best?: number };

export default function App() {
  const [save, setSave] = useState<SaveData>(loadSave);
  const [view, setView] = useState<View>({ t: "home" });
  const runKeyRef = useRef(0);

  const update = useCallback((updater: (d: SaveData) => SaveData) => {
    setSave((prev) => {
      const next = updater(prev);
      persistSave(next);
      return next;
    });
  }, []);

  const handleMuniCleared = useCallback(
    (r: MuniResult) => {
      update((d) => {
        const stat = d.muniStats[r.code] ?? { miss: 0, clears: 0, totalMs: 0 };
        // ノーミスで打ち切ったときだけ制覇。ミスがあれば制覇にならず、
        // 既に制覇済みでもその回で制覇が外れる。
        const cleared = { ...d.cleared };
        if (r.miss === 0) {
          cleared[r.code] = 1;
        } else {
          delete cleared[r.code];
        }
        return {
          ...d,
          cleared,
          muniStats: {
            ...d.muniStats,
            [r.code]: {
              miss: stat.miss + r.miss,
              clears: stat.clears + (r.miss === 0 ? 1 : 0),
              totalMs: stat.totalMs + r.ms,
            },
          },
        };
      });
    },
    [update]
  );

  const handleFinish = useCallback(
    (r: RunResult) => {
      const prevBest = save.prefBest[r.prefId];
      // ベストタイムは全市町村ノーミスで打ち切ったときのみ記録
      const perfect = r.miss === 0;
      const isBest = perfect && (prevBest === undefined || r.totalMs < prevBest);
      if (isBest) {
        update((d) => ({
          ...d,
          prefBest: { ...d.prefBest, [r.prefId]: r.totalMs },
        }));
      }
      setView({ t: "result", result: r, isBest, best: isBest ? r.totalMs : prevBest });
    },
    [save.prefBest, update]
  );

  const startPlay = useCallback((prefId: number) => {
    runKeyRef.current += 1;
    setView({ t: "play", prefId, runKey: runKeyRef.current });
  }, []);

  const openAtlas = useCallback((prefId: number) => {
    setView({ t: "atlas", prefId });
  }, []);

  return (
    <div className="app">
      <SettingsMenu />
      {view.t === "home" && <Home save={save} onSelectPref={startPlay} onOpenAtlas={openAtlas} />}
      {view.t === "atlas" && (
        <PrefAtlas
          prefId={view.prefId}
          onBack={() => setView({ t: "home" })}
          onPlay={startPlay}
        />
      )}
      {view.t === "play" && (
        <PlayScreen
          key={view.runKey}
          prefId={view.prefId}
          clearedAll={save.cleared}
          onMuniCleared={handleMuniCleared}
          onFinish={handleFinish}
          onQuit={() => setView({ t: "home" })}
        />
      )}
      {view.t === "result" && (
        <ResultScreen
          result={view.result}
          isBest={view.isBest}
          best={view.best}
          onRetry={() => startPlay(view.result.prefId)}
          onHome={() => setView({ t: "home" })}
        />
      )}
    </div>
  );
}
