// VOICEVOXエンジン（localhost:50021）で音声を生成するスクリプト
//
//   node scripts/voicevox.mjs speakers          … 話者一覧を表示
//   node scripts/voicevox.mjs samples           … 候補キャラのサンプルを public/voice-samples/ に生成
//   node scripts/voicevox.mjs all <styleId>      … 全市区町村の音声を public/voice/ に生成
//
// WAV(24kHz) → ffmpeg で opus(mono/24kbps) に圧縮して埋め込む。
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENGINE = "http://127.0.0.1:50021";
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";

async function engine(path, opts = {}) {
  const res = await fetch(ENGINE + path, opts);
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${await res.text()}`);
  return res;
}

async function listSpeakers() {
  const res = await engine("/speakers");
  return res.json();
}

// name（話者名）とstyle（スタイル名）からstyle idを解決する
async function resolveStyle(speakers, name, styleName) {
  const sp = speakers.find((s) => s.name.includes(name));
  if (!sp) throw new Error(`話者が見つからない: ${name}`);
  const st =
    sp.styles.find((s) => s.name === styleName) ??
    sp.styles.find((s) => s.name.includes(styleName)) ??
    sp.styles[0];
  return { id: st.id, label: `${sp.name}/${st.name}` };
}

async function synthWav(text, styleId) {
  const q = await engine(`/audio_query?speaker=${styleId}&text=${encodeURIComponent(text)}`, {
    method: "POST",
  });
  const query = await q.json();
  query.speedScale = 1.05;
  query.pitchScale = 0.0;
  const wav = await engine(`/synthesis?speaker=${styleId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
  });
  return Buffer.from(await wav.arrayBuffer());
}

function toOpus(wavPath, outPath) {
  const r = spawnSync(
    FFMPEG,
    ["-y", "-i", wavPath, "-c:a", "libopus", "-b:a", "24k", "-ac", "1", "-application", "voip", outPath],
    { encoding: "utf8" }
  );
  if (r.error) throw new Error(`ffmpeg spawn error: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr?.slice(-300)}`);
}

const CANDIDATES = [
  ["四国めたん", "ノーマル"],
  ["四国めたん", "あまあま"],
  ["春日部つむぎ", "ノーマル"],
  ["ずんだもん", "あまあま"],
  ["冥鳴ひまり", "ノーマル"],
  ["九州そら", "あまあま"],
];

// アプリに組み込む5キャラ（クレジットは VOICEVOX:キャラ名）
const VOICES = [
  { id: 2, char: "四国めたん", style: "ノーマル" },
  { id: 3, char: "ずんだもん", style: "ノーマル" },
  { id: 8, char: "春日部つむぎ", style: "ノーマル" },
  { id: 14, char: "冥鳴ひまり", style: "ノーマル" },
  { id: 29, char: "No.7", style: "ノーマル" },
];

const SAMPLE_TEXT = "さっぽろし。なごやし。ふくおかし。いっしょにタイピング、がんばろう！";

async function main() {
  const [cmd, arg] = process.argv.slice(2);
  const speakers = await listSpeakers();

  if (cmd === "speakers") {
    for (const s of speakers) {
      console.log(`${s.name}: ${s.styles.map((st) => `${st.name}(${st.id})`).join(", ")}`);
    }
    return;
  }

  if (cmd === "samples") {
    const outDir = join(root, "public/voice-samples");
    mkdirSync(outDir, { recursive: true });
    const tmp = join(outDir, "_tmp.wav");
    const list = [];
    for (const [name, style] of CANDIDATES) {
      let resolved;
      try {
        resolved = await resolveStyle(speakers, name, style);
      } catch (e) {
        console.warn(e.message);
        continue;
      }
      const wav = await synthWav(SAMPLE_TEXT, resolved.id);
      writeFileSync(tmp, wav);
      const slug = `${resolved.id}`;
      toOpus(tmp, join(outDir, `${slug}.opus`));
      list.push({ id: resolved.id, label: resolved.label });
      console.log(`sample: ${resolved.label} (id ${resolved.id})`);
    }
    rmSync(tmp, { force: true });
    writeFileSync(join(outDir, "list.json"), JSON.stringify(list, null, 2));
    return;
  }

  if (cmd === "all") {
    // arg で対象styleを限定できる（省略時は VOICES 全部）。limit で件数制限（計測用）
    const only = arg ? arg.split(",").map(Number) : VOICES.map((v) => v.id);
    const limit = Number(process.env.LIMIT) || Infinity;
    const data = JSON.parse(readFileSync(join(root, "src/data/municipalities.json"), "utf8"));
    const munis = data.munis.slice(0, Math.min(limit, data.munis.length));
    const baseDir = join(root, "public/voice");
    mkdirSync(baseDir, { recursive: true });
    const tmp = join(baseDir, "_tmp.wav");
    const t0 = Date.now();
    let total = 0;
    for (const v of VOICES.filter((v) => only.includes(v.id))) {
      const outDir = join(baseDir, String(v.id));
      mkdirSync(outDir, { recursive: true });
      let done = 0;
      for (const m of munis) {
        const out = join(outDir, `${m.c}.opus`);
        if (existsSync(out)) {
          done++;
          total++;
          continue;
        }
        const wav = await synthWav(m.k, v.id);
        writeFileSync(tmp, wav);
        toOpus(tmp, out);
        done++;
        total++;
        if (done % 100 === 0) {
          const rate = total / ((Date.now() - t0) / 1000);
          console.log(`${v.char}: ${done}/${munis.length}  (${rate.toFixed(1)} clips/s)`);
        }
      }
      console.log(`done ${v.char} (style ${v.id}): ${done}`);
    }
    rmSync(tmp, { force: true });
    // フロント用マニフェスト
    writeFileSync(
      join(baseDir, "voices.json"),
      JSON.stringify({ voices: VOICES, count: data.munis.length }, null, 2)
    );
    const secs = ((Date.now() - t0) / 1000).toFixed(0);
    console.log(`ALL done: ${total} clips in ${secs}s`);
    return;
  }

  console.log("usage: node scripts/voicevox.mjs [speakers|samples|all <styleId>]");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
