import { useCallback } from "react";
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
        <button className="btn primary" onClick={() => onPlay(prefId)}>
          この県で遊ぶ
        </button>
      </header>

      <p className="atlas-hint">🔊 市区町村をクリックすると名前を読み上げるよ</p>

      <div className="atlas-map">
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
  );
}
