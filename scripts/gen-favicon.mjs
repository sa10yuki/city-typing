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
const M = 40; // ストロークで太る分を見込んだ余白

// 主要4島だけ残す（沖縄など離島は省く）。面積で順位付けして選ぶ
const KEEP_ISLANDS = 4;
const mainPolys = merged.coordinates
  .map((poly) => ({ poly, area: geoArea({ type: "Polygon", coordinates: poly }) }))
  .sort((a, b) => b.area - a.area)
  .slice(0, KEEP_ISLANDS)
  .map((x) => x.poly);
const main = { type: "MultiPolygon", coordinates: mainPolys };

// 枠決めは「残す4島だけ」で行う（離島を含めると空白ができ上寄りに見える）
const projection = geoMercator().fitExtent(
  [
    [M, M],
    [SIZE - M, SIZE - M],
  ],
  main
);

const TOL = 2.5; // 間引く点間距離（px）

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
for (const poly of mainPolys) {
  const outer = simplifyRing(poly[0]);
  if (!outer) continue;
  d += ringToPath(outer);
  kept++;
}

// 白フィル＋太い白ストロークで土地をぷっくりデフォルメ（小さくても潰れにくい）
const accent = "#6366f1";
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}"><rect width="${SIZE}" height="${SIZE}" rx="96" fill="${accent}"/><path d="${d}" fill="#ffffff" stroke="#ffffff" stroke-width="30" stroke-linejoin="round" stroke-linecap="round"/></svg>
`;

writeFileSync(join(root, "public/favicon.svg"), svg);
console.log(
  `favicon.svg written (${(svg.length / 1024).toFixed(1)} KB, ${kept}/${merged.coordinates.length} islands)`
);
