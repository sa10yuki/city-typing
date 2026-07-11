// japan-topo.json から日本のシルエットを抽出して favicon.svg を生成する
//   node scripts/gen-favicon.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { merge } from "topojson-client";
import { geoMercator, geoPath, geoArea } from "d3-geo";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const topo = JSON.parse(readFileSync(join(root, "src/data/japan-topo.json"), "utf8"));
const obj = topo.objects.munis;

// 全市区町村を合体して国土の外周だけにする（内部の境界線は消える）
const merged = merge(topo, obj.geometries);

// d3-geoは球面幾何なのでリングの巻き方向を正す
const HEMI = Math.PI * 2;
for (const poly of merged.coordinates) {
  poly.forEach((ring, i) => {
    const a = geoArea({ type: "Polygon", coordinates: [ring] });
    if (i === 0 ? a > HEMI : a < HEMI) ring.reverse();
  });
}

const SIZE = 512;
const M = 40;
const projection = geoMercator().fitExtent(
  [
    [M, M],
    [SIZE - M, SIZE - M],
  ],
  merged
);
const path = geoPath(projection);

// ファビコンは小さく表示されるので、見えない離島を捨て、点も間引いて軽量化する
const MIN_AREA = 6; // 投影後のピクセル面積の下限
const TOL = 2.2; // 間引く点間距離（px）

// 投影後にTOL未満の点を捨てるリング簡略化
function simplifyRing(ring) {
  const pts = ring.map(projection);
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = out[out.length - 1];
    const [x, y] = pts[i];
    if (Math.hypot(x - px, y - py) >= TOL) out.push(pts[i]);
  }
  if (out.length < 4) return null; // 潰れたリングは捨てる
  return out;
}

function ringToPath(ring) {
  return (
    "M" +
    ring.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L") +
    "Z"
  );
}

let d = "";
let kept = 0;
for (const poly of merged.coordinates) {
  if (path.area({ type: "Polygon", coordinates: poly }) < MIN_AREA) continue;
  const outer = simplifyRing(poly[0]);
  if (!outer) continue;
  d += ringToPath(outer);
  kept++;
}

const accent = "#6366f1";
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}"><rect width="${SIZE}" height="${SIZE}" rx="96" fill="${accent}"/><path d="${d}" fill="#ffffff" stroke="#ffffff" stroke-width="6" stroke-linejoin="round"/></svg>
`;

writeFileSync(join(root, "public/favicon.svg"), svg);
console.log(
  `favicon.svg written (${(svg.length / 1024).toFixed(1)} KB, ${kept}/${merged.coordinates.length} islands)`
);
