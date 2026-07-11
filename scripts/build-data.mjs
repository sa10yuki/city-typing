// rawdata/ の元データからアプリ用の静的データを生成する
//   node scripts/build-data.mjs
// 出力:
//   src/data/municipalities.json  … 市区町村リスト（読み付き）
//   src/data/japan-topo.json      … 市区町村境界TopoJSON（プロパティ削減済み）
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { read as shpRead } from "shapefile";
import { geoArea } from "d3-geo";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));

const gov = read("rawdata/localgovjp.json");
const topo = read("rawdata/japan-muni-topo.json");

// ---- 市区町村リスト（政令市の行政区は除外。特別区は含む） ----
// 行政区の行は city が「札幌市 中央区」のようにスペース区切りになっている
const muniRows = gov.filter((r) => !r.city.includes(" "));

const prefs = [];
const prefByName = new Map();
for (const r of gov) {
  const id = Number(r.pid);
  if (!prefByName.has(r.pref)) {
    const p = { id, name: r.pref };
    prefs.push(p);
    prefByName.set(r.pref, p);
  }
}
prefs.sort((a, b) => a.id - b.id);

// 接尾辞（市・町・村・区）を漢字と読みの両方から取り除く
// 町=まち/ちょう、村=むら/そん は自治体ごとに読みが違うため末尾照合で判定する
const SUFFIX_KANA = { 市: ["し"], 町: ["ちょう", "まち"], 村: ["むら", "そん"], 区: ["く"] };
function stripSuffix(name, kana) {
  const last = name.at(-1);
  const cands = SUFFIX_KANA[last];
  if (cands) {
    for (const s of cands) {
      if (kana.endsWith(s)) {
        return { b: name.slice(0, -1), bk: kana.slice(0, -s.length) };
      }
    }
  }
  console.warn(`接尾辞を除去できない: ${name} = ${kana}`);
  return { b: name, bk: kana };
}

const munis = muniRows.map((r) => {
  const n = r.city;
  const k = r.citykana.replace(/\s+/g, "");
  const { b, bk } = stripSuffix(n, k);
  return {
    c: r.lgcode.slice(0, 5), // 5桁コード（チェックディジット除く）
    n, // 正式名（例: 札幌市）
    k, // 正式読み（例: さっぽろし）
    b, // 出題用の名前（例: 札幌）
    bk, // 出題用の読み（例: さっぽろ）
    p: Number(r.pid),
  };
});

// 読みに想定外の文字が入っていないか検査（ローマ字エンジンの対応範囲チェック）
const kanaOk =
  /^[ぁ-んー]+$/;
const bad = munis.filter((m) => !kanaOk.test(m.k) || !kanaOk.test(m.bk));
if (bad.length) {
  console.warn("想定外の読み文字:", bad.map((m) => `${m.n}=${m.k}`).join(", "));
}

console.log(`municipalities: ${munis.length}`);
const byPref = new Map();
for (const m of munis) byPref.set(m.p, (byPref.get(m.p) ?? 0) + 1);

// ---- 地図TopoJSON: プロパティを {c: 市区町村コード} だけに削る ----
// 政令市の行政区ポリゴンは親の市コードに割り当てる（区単位では出題しない）
const muniByCode = new Map(munis.map((m) => [m.c, m]));
const cityCodeByPrefAndName = new Map(
  munis.map((m) => [`${prefByName.get(prefs[m.p - 1].name).name}|${m.n}`, m.c])
);

const objName = Object.keys(topo.objects)[0];
const geoms = topo.objects[objName].geometries;
let unmatched = [];
for (const g of geoms) {
  const p = g.properties;
  let code = null;
  if (muniByCode.has(p.N03_007)) {
    code = p.N03_007;
  } else if (p.N03_003 && p.N03_003.endsWith("市")) {
    // 行政区: 「札幌市」など親の市を同一都道府県内で探す
    code = cityCodeByPrefAndName.get(`${p.N03_001}|${p.N03_003}`) ?? null;
  }
  if (code === null) unmatched.push(`${p.N03_001} ${p.N03_003 ?? ""}${p.N03_004 ?? ""} (${p.N03_007})`);
  g.properties = { c: code };
}
if (unmatched.length) {
  console.log(`unmatched polygons (北方領土・所属未定地など): ${unmatched.length}`);
  for (const u of unmatched) console.log("  " + u);
}

topo.objects.munis = topo.objects[objName];
if (objName !== "munis") delete topo.objects[objName];

// ---- 湖沼（国土数値情報 W09 シェープファイル → 主要湖沼のGeoJSON） ----
function roundCoords(coords) {
  if (typeof coords[0] === "number") return coords.map((v) => Math.round(v * 1e4) / 1e4);
  return coords.map(roundCoords);
}

const shp = await shpRead(
  join(root, "rawdata/W09/W09-05-g_Lake.shp"),
  join(root, "rawdata/W09/W09-05-g_Lake.dbf")
);
const KM2 = 6371 * 6371; // ステラジアン→km²
const MIN_LAKE_KM2 = 2;
const EPS_DEG = 0.002; // 約200m間隔に間引く（県地図の1px未満）

function decimateRing(ring) {
  const out = [ring[0]];
  for (let i = 1; i < ring.length - 1; i++) {
    const [px, py] = out[out.length - 1];
    const [x, y] = ring[i];
    if (Math.abs(x - px) > EPS_DEG || Math.abs(y - py) > EPS_DEG) out.push(ring[i]);
  }
  out.push(ring[ring.length - 1]);
  return out.length >= 4 ? out : null;
}

function decimatePolygon(poly) {
  const rings = poly.map(decimateRing).filter(Boolean);
  return rings.length > 0 ? rings : null;
}

const lakes = { type: "FeatureCollection", features: [] };
for (const f of shp.features) {
  if (!f.geometry) continue;
  // 巻き方向が逆だと球面の残り全体の面積になるため小さい方を採用
  const a = geoArea(f.geometry);
  const km2 = Math.min(a, 4 * Math.PI - a) * KM2;
  if (km2 < MIN_LAKE_KM2) continue;
  const g = f.geometry;
  let coordinates;
  if (g.type === "Polygon") {
    coordinates = decimatePolygon(g.coordinates);
  } else if (g.type === "MultiPolygon") {
    coordinates = g.coordinates.map(decimatePolygon).filter(Boolean);
    if (coordinates.length === 0) coordinates = null;
  }
  if (!coordinates) continue;
  lakes.features.push({
    type: "Feature",
    properties: {},
    geometry: { type: g.type, coordinates: roundCoords(coordinates) },
  });
}
console.log(`lakes (>= ${MIN_LAKE_KM2}km2): ${lakes.features.length}`);

mkdirSync(join(root, "src/data"), { recursive: true });
writeFileSync(join(root, "src/data/water.json"), JSON.stringify({ lakes }));
writeFileSync(
  join(root, "src/data/municipalities.json"),
  JSON.stringify({ prefs, munis })
);
writeFileSync(join(root, "src/data/japan-topo.json"), JSON.stringify(topo));
console.log("done.");
