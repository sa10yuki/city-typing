import { useCallback, useEffect, useState } from "react";
import { munisByPref, muniByCode, prefName, prefs, TOTAL_MUNIS } from "../lib/data";
import { useSettings } from "../lib/settings";
import { formatDate, formatMs, type SaveData } from "../lib/storage";
import { UPDATES } from "../lib/updates";
import MuniMap from "./MuniMap";

interface Props {
  save: SaveData;
  onSelectPref: (prefId: number) => void;
  onOpenAtlas: (prefId: number) => void;
}

const COLOR_NULL = "#f1f5f9";

// 都道府県ごとの色相（黄金角でばらけさせる）。制覇済みは濃く、未制覇は薄く塗る
function prefHue(prefId: number): number {
  return (prefId * 137.5) % 360;
}

export default function Home({ save, onSelectPref, onOpenAtlas }: Props) {
  const { gameMode } = useSettings();
  const clearedCount = Object.keys(save.cleared).length;
  const pct = ((clearedCount / TOTAL_MUNIS) * 100).toFixed(1);

  // 日本スコア = 記録済み都道府県のベストタイム合計
  const bestEntries = Object.values(save.prefBest);
  const totalScore = bestEntries.reduce((a, b) => a + b.ms, 0);
  const recordedPrefs = bestEntries.length;

  const [hoverPref, setHoverPref] = useState<number | null>(null);
  const [menu, setMenu] = useState<{ prefId: number; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("mousedown", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [menu]);

  const getFill = useCallback(
    (code: string | null) => {
      if (!code) return COLOR_NULL;
      const pid = Number(code.slice(0, 2));
      const h = prefHue(pid);
      const hovered = pid === hoverPref;
      const cleared = !!save.cleared[code];
      // 制覇済みは濃くくっきり。ホバー中の県はさらに強調
      if (cleared) return hovered ? `hsl(${h} 85% 34%)` : `hsl(${h} 72% 42%)`;
      return hovered ? `hsl(${h} 65% 78%)` : `hsl(${h} 40% 90%)`;
    },
    [save.cleared, hoverPref]
  );

  const getTitle = useCallback((code: string) => {
    const m = muniByCode.get(code);
    return m ? `${m.n}（${m.k}）` : undefined;
  }, []);

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
        <div className="japan-score">
          <span className="score-label">🏆 日本スコア（全県ベスト合計）</span>
          <span className="score-value">{formatMs(totalScore)}</span>
          <span className="score-sub">{recordedPrefs} / 47 県 記録済み</span>
        </div>
        <p className="settings-hint">
          右上の<b>⚙設定</b>から、読み上げの声・音量、タイプ音、画面レイアウト、キーボード表示、記録の消去ができるよ。
        </p>
      </header>

      <div className="updates">
        <h2>📢 更新情報</h2>
        <ul>
          {UPDATES.slice(0, 5).map((u, i) => (
            <li key={i}>
              <span className="update-date">{u.date}</span>
              <span className="update-text">{u.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rules">
        <h2>遊び方</h2>
        <ul>
          <li>都道府県を選ぶと、県内の全市区町村がランダムに出題される<b>タイムアタック</b>。</li>
          <li>表示された市町村名を<b>ローマ字で入力</b>。「し」は si / shi など複数の打ち方でOK。</li>
          <li>末尾の「市・町・村・区」は<b>打たなくてOK</b>（名前の右に読みだけ表示）。</li>
          <li>
            <b>ミスタイプするとその市町村はその回では制覇にならないよ。</b>
            {gameMode === "hard" ? (
              <> 既に制覇済みでも<b>ミスすると制覇が外れる（現在: HARDモード）</b>。ノーミスで打ち切れ！</>
            ) : (
              <> ただし<b>一度制覇した市町村はミスしても外れない（現在: EASYモード）</b>。</>
            )}{" "}
            モードは設定で切り替えられるよ。
          </li>
          <li>
            <b>ノーミス</b>で都道府県内の市町村を全部打ち切ると<b>ベストタイム</b>を記録。ベストタイムは一度記録したら消えないよ。全国1,741市区町村の完全制覇を目指そう🗾
          </li>
          <li>
            各県の<b>地図</b>ボタンで、その県の市区町村を地図帳のように一覧できるよ（クリックで読み上げ・拡大縮小もOK）。
          </li>
        </ul>
      </div>

      <div className="home-body">
        <div className="home-map">
          <MuniMap
            width={560}
            height={600}
            getFill={getFill}
            getTitle={getTitle}
            onHoverPref={setHoverPref}
            onClickMuni={(code, e) =>
              setMenu({ prefId: Number(code.slice(0, 2)), x: e.clientX, y: e.clientY })
            }
          />
          <p className="map-hint">地図の都道府県をクリックすると選べるよ</p>
        </div>

        <div className="pref-list">
          {prefs.map((p) => {
            const list = munisByPref.get(p.id) ?? [];
            const cleared = list.filter((m) => save.cleared[m.c]).length;
            const best = save.prefBest[p.id];
            const done = cleared === list.length && list.length > 0;
            return (
              <div key={p.id} className={`pref-card${done ? " done" : ""}`}>
                <button className="pref-card-main" onClick={() => onSelectPref(p.id)}>
                  <span className="pref-name">{p.name}</span>
                  <span className="pref-progress">
                    {cleared}/{list.length}
                  </span>
                  <span className="pref-best">{best ? formatMs(best.ms) : "--:--.--"}</span>
                  {best?.date && (
                    <span className="pref-best-date" title={`記録日: ${formatDate(best.date)}`}>
                      {formatDate(best.date)}
                    </span>
                  )}
                </button>
                <button
                  className="pref-atlas-btn"
                  title={`${p.name}の市区町村を地図で見る`}
                  onClick={() => onOpenAtlas(p.id)}
                >
                  地図
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {menu && (
        <div
          className="pref-menu"
          style={{ left: menu.x, top: menu.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="pref-menu-title">{prefName(menu.prefId)}</div>
          <button
            onClick={() => {
              setMenu(null);
              onSelectPref(menu.prefId);
            }}
          >
            ⌨️ タイピングする
          </button>
          <button
            onClick={() => {
              setMenu(null);
              onOpenAtlas(menu.prefId);
            }}
          >
            🗺 市区町村の一覧を見る
          </button>
        </div>
      )}

      <footer className="credits">
        <p>
          読み上げ音声:{" "}
          <a href="https://voicevox.hiroshiba.jp/" target="_blank" rel="noopener noreferrer">
            VOICEVOX
          </a>{" "}
          （VOICEVOX:四国めたん／VOICEVOX:ずんだもん／VOICEVOX:春日部つむぎ／VOICEVOX:冥鳴ひまり／VOICEVOX:No.7）
        </p>
        <p>
          地形: 国土地理院（色別標高図・陰影起伏図）／湖沼・行政区域: 国土数値情報（国土交通省）
        </p>
      </footer>
    </div>
  );
}
