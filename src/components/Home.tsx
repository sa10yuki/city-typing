import { useCallback, useMemo } from "react";
import { munisByPref, muniByCode, prefs, TOTAL_MUNIS } from "../lib/data";
import { formatMs, type SaveData } from "../lib/storage";
import MuniMap from "./MuniMap";

interface Props {
  save: SaveData;
  onSelectPref: (prefId: number) => void;
}

const COLOR_CLEARED = "#6366f1";
const COLOR_IDLE = "#e2e8f0";
const COLOR_NULL = "#f1f5f9";

export default function Home({ save, onSelectPref }: Props) {
  const clearedCount = Object.keys(save.cleared).length;
  const pct = ((clearedCount / TOTAL_MUNIS) * 100).toFixed(1);

  const getFill = useCallback(
    (code: string | null) => {
      if (!code) return COLOR_NULL;
      return save.cleared[code] ? COLOR_CLEARED : COLOR_IDLE;
    },
    [save.cleared]
  );

  const getTitle = useCallback((code: string) => {
    const m = muniByCode.get(code);
    return m ? `${m.n}（${m.k}）` : undefined;
  }, []);

  const weak = useMemo(() => {
    return Object.entries(save.muniStats)
      .filter(([, s]) => s.miss > 0)
      .sort((a, b) => b[1].miss - a[1].miss)
      .slice(0, 10);
  }, [save.muniStats]);

  return (
    <div className="home">
      <header className="home-header">
        <h1>市町村タイピング</h1>
        <p className="subtitle">全国1,741市区町村 タイピング制覇の旅</p>
        <div className="progress-wrap">
          <div className="progress-text">
            全国制覇率 <strong>{pct}%</strong>（{clearedCount.toLocaleString()} / {TOTAL_MUNIS.toLocaleString()}）
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </header>

      <div className="home-body">
        <div className="home-map">
          <MuniMap
            width={520}
            height={560}
            getFill={getFill}
            getTitle={getTitle}
            onClickMuni={(code) => onSelectPref(Number(code.slice(0, 2)))}
          />
          <p className="map-hint">地図をクリックしても都道府県を選べるよ</p>
        </div>

        <div className="pref-list">
          {prefs.map((p) => {
            const list = munisByPref.get(p.id) ?? [];
            const cleared = list.filter((m) => save.cleared[m.c]).length;
            const best = save.prefBest[p.id];
            const done = cleared === list.length && list.length > 0;
            return (
              <button
                key={p.id}
                className={`pref-card${done ? " done" : ""}`}
                onClick={() => onSelectPref(p.id)}
              >
                <span className="pref-name">{p.name}</span>
                <span className="pref-progress">
                  {cleared}/{list.length}
                </span>
                <span className="pref-best">{best ? formatMs(best) : "--:--.--"}</span>
              </button>
            );
          })}
        </div>
      </div>

      {weak.length > 0 && (
        <div className="weak-list">
          <h3>苦手地名 TOP10</h3>
          <ul>
            {weak.map(([code, s]) => {
              const m = muniByCode.get(code);
              if (!m) return null;
              return (
                <li key={code}>
                  <span className="mn">{m.n}</span>
                  <span className="mk">{m.k}</span>
                  <span className="mm">累計ミス {s.miss}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
