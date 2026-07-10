import { useMemo } from "react";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import { geoArea, geoMercator, geoPath } from "d3-geo";
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
}

export default function MuniMap({ prefId, width, height, getFill, onClickMuni, getTitle }: MuniMapProps) {
  const { paths } = useMemo(() => {
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
    const paths = features
      .map((f: Feature<Geometry, MuniProps>) => ({
        d: pathGen(f) ?? "",
        code: f.properties.c,
      }))
      .filter((p) => p.d !== "");
    return { paths };
  }, [prefId, width, height]);

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
    </svg>
  );
}
