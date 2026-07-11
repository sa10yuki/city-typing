import { useId, useMemo } from "react";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import { geoArea, geoMercator, geoPath } from "d3-geo";
import { tile as d3tile } from "d3-tile";
import type { FeatureCollection, Feature, Geometry, Position } from "geojson";
import topoRaw from "../data/japan-topo.json";

interface MuniProps {
  c: string | null;
}

const topo = topoRaw as unknown as Topology<{ munis: GeometryCollection<MuniProps> }>;
const fc = feature(topo, topo.objects.munis) as FeatureCollection<Geometry, MuniProps>;

// d3-geoは球面幾何でポリゴンを解釈するため、リングの巻き方向が逆だと
// 「地球全体からくり抜いた図形」扱いになり描画が壊れる。ここで巻き直す。
{
  const HEMISPHERE = Math.PI * 2;
  const ringArea = (ring: Position[]) =>
    geoArea({ type: "Polygon", coordinates: [ring] });
  for (const f of fc.features) {
    const g = f.geometry;
    const polys: Position[][][] =
      g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
    for (const poly of polys) {
      poly.forEach((ring, i) => {
        const a = ringArea(ring);
        // 外周リングは面積が半球未満、穴リングは半球超になる向きが正
        if (i === 0 ? a > HEMISPHERE : a < HEMISPHERE) ring.reverse();
      });
    }
  }
}

export interface MuniMapProps {
  /** 指定すると当該都道府県のみ描画（1-47） */
  prefId?: number;
  width: number;
  height: number;
  /** 市区町村コード→塗り色 */
  getFill: (code: string | null) => string;
  onClickMuni?: (code: string) => void;
  /** ポリゴンにtitle（市区町村名）を付けるための解決関数 */
  getTitle?: (code: string) => string | undefined;
  /** 強調表示する市区町村コード（出題中のお題など） */
  highlightCode?: string;
  /** 地形（陰影起伏）をうっすら重ねるか */
  terrain?: boolean;
}

interface PathEntry {
  d: string;
  code: string | null;
  f: Feature<Geometry, MuniProps>;
}

export default function MuniMap({
  prefId,
  width,
  height,
  getFill,
  onClickMuni,
  getTitle,
  highlightCode,
  terrain = false,
}: MuniMapProps) {
  const clipId = useId();
  const { paths, pathGen, tiles, tileScale, tileTranslate } = useMemo(() => {
    const pp = prefId ? String(prefId).padStart(2, "0") : null;
    const features = pp
      ? fc.features.filter((f) => f.properties.c?.startsWith(pp))
      : fc.features;
    const sub: FeatureCollection<Geometry, MuniProps> = { type: "FeatureCollection", features };
    const pad = 8;
    const projection = geoMercator().fitExtent(
      [
        [pad, pad],
        [width - pad, height - pad],
      ],
      sub
    );
    const pathGen = geoPath(projection);
    const paths: PathEntry[] = features
      .map((f) => ({ d: pathGen(f) ?? "", code: f.properties.c, f }))
      .filter((p) => p.d !== "");

    // 陰影起伏タイルの配置（Webメルカトルのスケール・平行移動をd3-tileで算出）
    const t = d3tile()
      .size([width, height])
      .scale(projection.scale() * 2 * Math.PI)
      .translate(projection([0, 0]) as [number, number])();
    return {
      paths,
      pathGen,
      tiles: t as unknown as [number, number, number][],
      tileScale: (t as unknown as { scale: number }).scale,
      tileTranslate: (t as unknown as { translate: [number, number] }).translate,
    };
  }, [prefId, width, height]);

  // 出題中の市区町村: 縁取り＋最大ポリゴン中心にパルスリング
  const highlight = useMemo(() => {
    if (!highlightCode) return null;
    const items = paths.filter((p) => p.code === highlightCode);
    if (items.length === 0) return null;
    let biggest = items[0];
    let maxArea = -1;
    for (const it of items) {
      const a = pathGen.area(it.f);
      if (a > maxArea) {
        maxArea = a;
        biggest = it;
      }
    }
    const [cx, cy] = pathGen.centroid(biggest.f);
    return { items, cx, cy };
  }, [paths, pathGen, highlightCode]);

  const [tx, ty] = tileTranslate;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="muni-map"
      role="img"
      aria-label={prefId ? "都道府県地図" : "日本地図"}
    >
      {paths.map((p, i) => (
        <path
          key={`${p.code ?? "x"}-${i}`}
          d={p.d}
          fill={getFill(p.code)}
          stroke="#cbd5e1"
          strokeWidth={0.4}
          style={onClickMuni && p.code ? { cursor: "pointer" } : undefined}
          onClick={p.code && onClickMuni ? () => onClickMuni(p.code!) : undefined}
        >
          {p.code && getTitle?.(p.code) ? <title>{getTitle(p.code)}</title> : null}
        </path>
      ))}

      {terrain && (
        <>
          <clipPath id={clipId}>
            {paths.map((p, i) => (
              <path key={i} d={p.d} />
            ))}
          </clipPath>
          {/* 地形（陰影起伏）は行政区域の形でくり抜いて内側だけに表示する */}
          <g clipPath={`url(#${clipId})`} pointerEvents="none">
            {tiles.map(([x, y, z]) => (
              <image
                key={`${z}-${x}-${y}`}
                href={`https://cyberjapandata.gsi.go.jp/xyz/hillshademap/${z}/${x}/${y}.png`}
                x={(x + tx) * tileScale}
                y={(y + ty) * tileScale}
                width={tileScale}
                height={tileScale}
                opacity={0.4}
                style={{ mixBlendMode: "multiply" }}
              />
            ))}
          </g>
        </>
      )}

      {highlight && (
        <g pointerEvents="none">
          {highlight.items.map((p, i) => (
            <path key={i} d={p.d} fill="none" stroke="#d97706" strokeWidth={1.8} />
          ))}
          <circle cx={highlight.cx} cy={highlight.cy} r={3} fill="#d97706" />
          <circle cx={highlight.cx} cy={highlight.cy} fill="none" stroke="#d97706" strokeWidth={2}>
            <animate attributeName="r" values="4;18" dur="1.1s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.9;0" dur="1.1s" repeatCount="indefinite" />
          </circle>
        </g>
      )}
    </svg>
  );
}
