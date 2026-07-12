import { useCallback, useRef, useState } from "react";
import { munisByPref, muniByCode, prefName } from "../lib/data";
import { speakMuni, stopSpeech } from "../lib/speech";
import MuniMap from "./MuniMap";

interface Props {
  prefId: number;
  onBack: () => void;
  onPlay: (prefId: number) => void;
}

// 市区町村コードから淡い色を作る（地図帳風の塗り分け）
function tint(code: string): string {
  const n = Number(code);
  const h = (n * 47) % 360;
  return `hsl(${h} 55% 88%)`;
}

const MIN_SCALE = 1;
const MAX_SCALE = 6;

export default function PrefAtlas({ prefId, onBack, onPlay }: Props) {
  const list = munisByPref.get(prefId) ?? [];

  const getFill = useCallback((code: string | null) => {
    if (!code) return "#eef2f6";
    return tint(code);
  }, []);
  const getLabel = useCallback((code: string) => muniByCode.get(code)?.b, []);
  const getTitle = useCallback((code: string) => {
    const m = muniByCode.get(code);
    return m ? `${m.n}（${m.k}）` : undefined;
  }, []);

  // ズーム・パン
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const zoomBy = (factor: number) => {
    setScale((s) => {
      const ns = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s * factor));
      if (ns === MIN_SCALE) setPos({ x: 0, y: 0 }); // 等倍に戻したら中央へ
      return ns;
    });
  };
  const reset = () => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15);
  };
  const onDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
  };
  const onMove = (e: React.MouseEvent) => {
    if (!drag.current) return;
    setPos({ x: drag.current.px + (e.clientX - drag.current.x), y: drag.current.py + (e.clientY - drag.current.y) });
  };
  const endDrag = () => {
    drag.current = null;
  };

  return (
    <div className="atlas">
      <header className="atlas-header">
        <button
          className="btn-back"
          onClick={() => {
            stopSpeech();
            onBack();
          }}
        >
          <span className="back-arrow">←</span> 戻る
        </button>
        <h2>
          {prefName(prefId)} <span className="atlas-count">全{list.length}市区町村</span>
        </h2>
        <button className="btn primary atlas-play" onClick={() => onPlay(prefId)}>
          この県で遊ぶ
        </button>
      </header>

      <p className="atlas-hint">
        🔊 市区町村をクリックで読み上げ ／ 🔍 マウスホイールや ＋−ボタンで拡大縮小（拡大中はドラッグで移動）
      </p>

      <div className="atlas-map">
        <div className="atlas-zoom">
          <button onClick={() => zoomBy(1.4)} aria-label="拡大">
            ＋
          </button>
          <button onClick={() => zoomBy(1 / 1.4)} aria-label="縮小">
            －
          </button>
          <button onClick={reset} aria-label="リセット" className="atlas-zoom-reset">
            ⟳
          </button>
        </div>
        <div
          className="atlas-viewport"
          onWheel={onWheel}
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          style={{ cursor: scale > 1 ? (drag.current ? "grabbing" : "grab") : "default" }}
        >
          <div
            className="atlas-stage"
            style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})` }}
          >
            <MuniMap
              prefId={prefId}
              width={900}
              height={720}
              getFill={getFill}
              getTitle={getTitle}
              labels
              getLabel={getLabel}
              onClickMuni={(code) => {
                const m = muniByCode.get(code);
                if (m) speakMuni(m.c, m.k);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
