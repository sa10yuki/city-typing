// ローマ字柔軟判定エンジン
// ひらがな文字列を「ユニット」列に分解し、各ユニットに複数のローマ字候補を持たせる。
// 入力キーごとに生存候補を絞り込み、候補が尽きるキーはミスとして弾く。

const BASE: Record<string, string[]> = {
  あ: ["a"], い: ["i", "yi"], う: ["u", "wu", "whu"], え: ["e"], お: ["o"],
  か: ["ka", "ca"], き: ["ki"], く: ["ku", "cu", "qu"], け: ["ke"], こ: ["ko", "co"],
  さ: ["sa"], し: ["shi", "si", "ci"], す: ["su"], せ: ["se", "ce"], そ: ["so"],
  た: ["ta"], ち: ["chi", "ti"], つ: ["tsu", "tu"], て: ["te"], と: ["to"],
  な: ["na"], に: ["ni"], ぬ: ["nu"], ね: ["ne"], の: ["no"],
  は: ["ha"], ひ: ["hi"], ふ: ["fu", "hu"], へ: ["he"], ほ: ["ho"],
  ま: ["ma"], み: ["mi"], む: ["mu"], め: ["me"], も: ["mo"],
  や: ["ya"], ゆ: ["yu"], よ: ["yo"],
  ら: ["ra"], り: ["ri"], る: ["ru"], れ: ["re"], ろ: ["ro"],
  わ: ["wa"], ゐ: ["wi"], ゑ: ["we"], を: ["wo"],
  が: ["ga"], ぎ: ["gi"], ぐ: ["gu"], げ: ["ge"], ご: ["go"],
  ざ: ["za"], じ: ["ji", "zi"], ず: ["zu"], ぜ: ["ze"], ぞ: ["zo"],
  だ: ["da"], ぢ: ["di"], づ: ["du"], で: ["de"], ど: ["do"],
  ば: ["ba"], び: ["bi"], ぶ: ["bu"], べ: ["be"], ぼ: ["bo"],
  ぱ: ["pa"], ぴ: ["pi"], ぷ: ["pu"], ぺ: ["pe"], ぽ: ["po"],
  ぁ: ["xa", "la"], ぃ: ["xi", "li"], ぅ: ["xu", "lu"], ぇ: ["xe", "le"], ぉ: ["xo", "lo"],
  ゃ: ["xya", "lya"], ゅ: ["xyu", "lyu"], ょ: ["xyo", "lyo"],
  ゎ: ["xwa", "lwa"],
  ー: ["-"],
};

const DIGRAPH: Record<string, string[]> = {
  きゃ: ["kya"], きゅ: ["kyu"], きょ: ["kyo"],
  しゃ: ["sha", "sya"], しゅ: ["shu", "syu"], しょ: ["sho", "syo"],
  ちゃ: ["cha", "tya", "cya"], ちゅ: ["chu", "tyu", "cyu"], ちょ: ["cho", "tyo", "cyo"],
  にゃ: ["nya"], にゅ: ["nyu"], にょ: ["nyo"],
  ひゃ: ["hya"], ひゅ: ["hyu"], ひょ: ["hyo"],
  みゃ: ["mya"], みゅ: ["myu"], みょ: ["myo"],
  りゃ: ["rya"], りゅ: ["ryu"], りょ: ["ryo"],
  ぎゃ: ["gya"], ぎゅ: ["gyu"], ぎょ: ["gyo"],
  じゃ: ["ja", "zya", "jya"], じゅ: ["ju", "zyu", "jyu"], じょ: ["jo", "zyo", "jyo"],
  びゃ: ["bya"], びゅ: ["byu"], びょ: ["byo"],
  ぴゃ: ["pya"], ぴゅ: ["pyu"], ぴょ: ["pyo"],
  ぢゃ: ["dya"], ぢゅ: ["dyu"], ぢょ: ["dyo"],
  うぃ: ["wi"], うぇ: ["we"],
  ふぁ: ["fa"], ふぃ: ["fi"], ふぇ: ["fe"], ふぉ: ["fo"],
  しぇ: ["she", "sye"], ちぇ: ["che", "tye"], じぇ: ["je", "zye"],
  てぃ: ["thi"], でぃ: ["dhi"], でゅ: ["dhu"],
};

export interface Unit {
  kana: string;
  cands: string[];
}

const VOWEL_Y_N = /^[aiueoyn]/;

/** ひらがな読みをユニット列に分解する */
export function parseKana(kana: string): Unit[] {
  // まず素のユニット列を作る（拗音は2文字で1ユニット）
  const raw: Unit[] = [];
  let i = 0;
  while (i < kana.length) {
    const two = kana.slice(i, i + 2);
    if (two.length === 2 && DIGRAPH[two]) {
      raw.push({ kana: two, cands: [...DIGRAPH[two]] });
      i += 2;
    } else {
      const ch = kana[i];
      if (ch === "っ" || ch === "ん") {
        raw.push({ kana: ch, cands: [] }); // 後段で解決
      } else if (BASE[ch]) {
        raw.push({ kana: ch, cands: [...BASE[ch]] });
      } else {
        throw new Error(`未対応のかな: ${ch} (${kana})`);
      }
      i += 1;
    }
  }

  // っ・ん を前後関係から解決する
  const units: Unit[] = [];
  for (let j = 0; j < raw.length; j++) {
    const u = raw[j];
    if (u.kana === "っ") {
      // 次ユニットと合体し「子音重ね」または xtu/ltu/ltsu ＋次候補 を候補にする
      const next = raw[j + 1];
      if (!next || next.cands.length === 0) {
        // 語末の「っ」や「っん」は地名では出ない想定。xtu系のみ許容
        units.push({ kana: u.kana, cands: ["xtu", "ltu", "ltsu"] });
        continue;
      }
      const cands: string[] = [];
      for (const nc of next.cands) {
        if (!VOWEL_Y_N.test(nc)) cands.push(nc[0] + nc);
        for (const small of ["xtu", "ltu", "ltsu"]) cands.push(small + nc);
      }
      units.push({ kana: u.kana + next.kana, cands });
      j += 1; // nextを消費
    } else if (u.kana === "ん") {
      // 次ユニットと合体させ、n / nn / xn ＋次候補 を候補にする。
      // （「n」単独を完了扱いにすると「nn」の2打目がミスになるため合体方式にする）
      const next = raw[j + 1];
      if (next && next.cands.length > 0 && next.cands.every((c) => !VOWEL_Y_N.test(c))) {
        const cands: string[] = [];
        for (const nc of next.cands) cands.push("n" + nc, "nn" + nc, "xn" + nc);
        units.push({ kana: u.kana + next.kana, cands });
        j += 1; // nextを消費
      } else {
        // 次が母音・や行・な行など：nn/xn のみ許容
        units.push({ kana: u.kana, cands: ["nn", "xn"] });
      }
    } else {
      units.push(u);
    }
  }
  return units;
}

export type InputResult = "ok" | "miss" | "unitDone" | "done";

/** 1つのお題（読み）に対する入力状態 */
export class TypingChallenge {
  readonly units: Unit[];
  private ui = 0;
  private typed = "";
  private doneText = "";
  private alive: string[];

  constructor(kana: string) {
    this.units = parseKana(kana);
    this.alive = this.units.length > 0 ? [...this.units[0].cands] : [];
  }

  get finished(): boolean {
    return this.ui >= this.units.length;
  }

  /** 完了済みのかな文字数（ハイライト用） */
  get kanaDone(): number {
    let n = 0;
    for (let i = 0; i < this.ui; i++) n += this.units[i].kana.length;
    return n;
  }

  /** 現在ユニットのかな（下線表示用）。終了時は空文字 */
  get currentKana(): string {
    return this.finished ? "" : this.units[this.ui].kana;
  }

  /** 打鍵済みの表示用ローマ字（実際に打った文字をそのまま反映） */
  get romajiDone(): string {
    return this.doneText + this.typed;
  }

  /** これから打つ表示用ローマ字（現在ユニットは生存候補の先頭に追従） */
  get romajiRest(): string {
    if (this.finished) return "";
    const currentRest = this.alive[0].slice(this.typed.length);
    const upcoming = this.units.slice(this.ui + 1).map((u) => u.cands[0]).join("");
    return currentRest + upcoming;
  }

  input(ch: string): InputResult {
    if (this.finished) return "done";
    const next = this.alive.filter((c) => c[this.typed.length] === ch);
    if (next.length === 0) return "miss";
    this.typed += ch;
    if (next.some((c) => c.length === this.typed.length)) {
      // ユニット完了
      this.doneText += this.typed;
      this.ui += 1;
      this.typed = "";
      if (this.finished) return "done";
      this.alive = [...this.units[this.ui].cands];
      return "unitDone";
    }
    this.alive = next;
    return "ok";
  }
}
