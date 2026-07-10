// ローマ字判定エンジンの簡易テスト
//   node scripts/test-romaji.mts
import { TypingChallenge, parseKana } from "../src/lib/romaji.ts";
import { readFileSync } from "node:fs";

let pass = 0;
let fail = 0;

function typeAll(kana: string, input: string): boolean {
  const ch = new TypingChallenge(kana);
  for (const c of input) {
    const r = ch.input(c);
    if (r === "miss") return false;
  }
  return ch.finished;
}

function ok(kana: string, input: string) {
  if (typeAll(kana, input)) pass++;
  else {
    fail++;
    console.log(`NG: ${kana} <- ${input} が通らない`);
  }
}

function ng(kana: string, input: string) {
  if (!typeAll(kana, input)) pass++;
  else {
    fail++;
    console.log(`NG: ${kana} <- ${input} が通ってしまう`);
  }
}

// 基本
ok("さっぽろし", "sapporosi");
ok("さっぽろし", "sapporoshi");
ok("さっぽろし", "saxtuporosi");
ok("さっぽろし", "saltuporoshi");
// 拗音
ok("なかのじょうまち", "nakanojoumati");
ok("なかのじょうまち", "nakanozyoumachi");
ok("なかのじょうまち", "nakanojyoumati");
ok("ちょうふし", "tyouhusi");
ok("ちょうふし", "choufushi");
ok("ぎょうだし", "gyoudasi");
// ん
ok("しんじゅくく", "sinjukuku");
ok("しんじゅくく", "shinnjukuku");
ok("ぐんまけん", "gunmakenn"); // 語中のんは n 一打OK
ok("ぐんまけん", "gunnmakenn");
ng("ぐんまけん", "gunmaken"); // 語末のんは nn 必須（標準仕様）
ng("ぐんまけん", "gumaken"); // んの打鍵抜けはミス
// ん＋母音 は nn 必須
ok("かんおんじし", "kannonnjisi");
ok("かんおんじし", "kannonzisi");
ng("かんおんじし", "kanonjisi");
// し・ち・つ・ふのバリエーション
ok("つくばし", "tukubasi");
ok("つくばし", "tsukubashi");
ok("ふくおかし", "fukuokasi");
ok("ふくおかし", "hukuokashi");
// 促音＋拗音
ok("はっちょうめ", "hattyoume"); // 架空だが判定確認
ok("はっちょうめ", "hacchoume");
ng("さっぽろし", "sakporosi"); // 促音の子音は次と同じもののみ

// 全市区町村の読みがパースできるか
const data = JSON.parse(readFileSync(new URL("../src/data/municipalities.json", import.meta.url), "utf8"));
let parseErrors = 0;
for (const m of data.munis) {
  try {
    parseKana(m.k);
  } catch (e) {
    parseErrors++;
    console.log(`パース不可: ${m.n} = ${m.k} (${(e as Error).message})`);
  }
}
console.log(`parse check: ${data.munis.length - parseErrors}/${data.munis.length} OK`);

console.log(`tests: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 || parseErrors > 0 ? 1 : 0);
