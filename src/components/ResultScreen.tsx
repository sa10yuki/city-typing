import { muniByCode, prefName } from "../lib/data";
import { formatMs } from "../lib/storage";
import type { RunResult } from "./PlayScreen";

interface Props {
  result: RunResult;
  isBest: boolean;
  best: number;
  onRetry: () => void;
  onHome: () => void;
}

export default function ResultScreen({ result, isBest, best, onRetry, onHome }: Props) {
  const minutes = result.totalMs / 60000;
  const kpm = minutes > 0 ? Math.round(result.keys / minutes) : 0;
  const acc =
    result.keys + result.miss > 0
      ? ((result.keys / (result.keys + result.miss)) * 100).toFixed(1)
      : "100.0";

  const missed = [...result.perMuni].filter((m) => m.miss > 0).sort((a, b) => b.miss - a.miss);
  const clean = result.perMuni.filter((m) => m.miss === 0).length;
  const total = result.perMuni.length;
  const perfect = clean === total;

  return (
    <div className="result">
      <h2>
        {prefName(result.prefId)}
        {perfect ? " 完全制覇！🎉" : " クリア！🏁"}
      </h2>
      <div className="result-time">
        <span className="big-time">{formatMs(result.totalMs)}</span>
        {isBest ? (
          <span className="badge best">ベスト更新！</span>
        ) : (
          <span className="badge">ベスト {formatMs(best)}</span>
        )}
      </div>
      <div className="result-stats">
        <div className="stat">
          <span className="stat-value">{kpm}</span>
          <span className="stat-label">KPM（打鍵/分）</span>
        </div>
        <div className="stat">
          <span className="stat-value">{acc}%</span>
          <span className="stat-label">正確率</span>
        </div>
        <div className="stat">
          <span className="stat-value">{result.miss}</span>
          <span className="stat-label">ミス</span>
        </div>
        <div className="stat">
          <span className="stat-value">
            {clean}/{total}
          </span>
          <span className="stat-label">制覇（ノーミス）</span>
        </div>
      </div>

      {missed.length > 0 && (
        <div className="result-missed">
          <h3>ミスした地名</h3>
          <ul>
            {missed.slice(0, 10).map((m) => {
              const muni = muniByCode.get(m.code);
              return (
                <li key={m.code}>
                  <span className="mn">{muni?.n}</span>
                  <span className="mk">{muni?.k}</span>
                  <span className="mm">ミス {m.miss}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="result-actions">
        <button className="btn primary" onClick={onRetry}>
          もう一回
        </button>
        <button className="btn" onClick={onHome}>
          地図にもどる
        </button>
      </div>
    </div>
  );
}
