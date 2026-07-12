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

const W = 900;
const H = 720;
const MIN_SCALE = 1;
const MAX_SCALE = 12;

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

  // viewBox方式のズーム: 中心(cx,cy)とscaleで管理（ベクターのまま拡大＝クッキリ）
  const [view, setView] = useState({ cx: W / 2, cy: H / 2, scale: 1 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mx: number; my: number; cx: number; cy: number } | null>(null);

  const vw = W / view.scale;
  const vh = H / view.scale;
  const viewBox = `${view.cx - vw / 2} ${view.cy - vh / 2} ${vw} ${vh}`;

  // 中心・scaleを枠内に収める
  const clamp = (cx: number, cy: number, scale: number) => {
    const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
    const w = W / s;
    const h = H / s;
    return {
      scale: s,
      cx: Math.min(W - w / 2, Math.max(w / 2, cx)),
      cy: Math.min(H - h / 2, Math.max(h / 2, cy)),
    };
  };

  // 画面座標(mx,my)を軸に factor 倍ズームする
  const zoomAt = (mx: number, my: number, factor: number) => {
    setView((v) => {
      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect) return v;
      const fx = (mx - rect.left) / rect.width; // 0..1
      const fy = (my - rect.top) / rect.height;
      const cvw = W / v.scale;
      const cvh = H / v.scale;
      // カーソル位置のユーザー座標
      const ux = v.cx - cvw / 2 + fx * cvw;
      const uy = v.cy - cvh / 2 + fy * cvh;
      const ns = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor));
      const nvw = W / ns;
      const nvh = H / ns;
      // カーソル位置を固定したまま新しい中心を求める
      const ncx = ux + (0.5 - fx) * nvw;
      const ncy = uy + (0.5 - fy) * nvh;
      return clamp(ncx, ncy, ns);
    });
  };

  const zoomCenter = (factor: number) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (rect) zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
  };
  const reset = () => setView({ cx: W / 2, cy: H / 2, scale: 1 });

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.2 : 1 / 1.2);
  };
  const onDown = (e: React.MouseEvent) => {
    if (view.scale <= 1) return;
    drag.current = { mx: e.clientX, my: e.clientY, cx: view.cx, cy: view.cy };
  };
  const onMove = (e: React.MouseEvent) => {
    if (!drag.current) return;
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dxUser = ((e.clientX - drag.current.mx) / rect.width) * vw;
    const dyUser = ((e.clientY - drag.current.my) / rect.height) * vh;
    setView((v) => clamp(drag.current!.cx - dxUser, drag.current!.cy - dyUser, v.scale));
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
        🔊 市区町村をクリックで読み上げ ／ 🔍 マウス位置を中心にホイールや ＋−ボタンで拡大縮小（拡大中はドラッグで移動）
      </p>

      <div className="atlas-map">
        <div className="atlas-zoom">
          <button onClick={() => zoomCenter(1.5)} aria-label="拡大">
            ＋
          </button>
          <button onClick={() => zoomCenter(1 / 1.5)} aria-label="縮小">
            －
          </button>
          <button onClick={reset} aria-label="リセット" className="atlas-zoom-reset">
            ⟳
          </button>
        </div>
        <div
          className="atlas-viewport"
          ref={viewportRef}
          onWheel={onWheel}
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          style={{ cursor: view.scale > 1 ? (drag.current ? "grabbing" : "grab") : "default" }}
        >
          <MuniMap
            prefId={prefId}
            width={W}
            height={H}
            viewBox={viewBox}
            getFill={getFill}
            getTitle={getTitle}
            labels
            getLabel={getLabel}
            labelScale={view.scale}
            onClickMuni={(code) => {
              const m = muniByCode.get(code);
              if (m) speakMuni(m.c, m.k);
            }}
          />
        </div>
      </div>
    </div>
  );
}
