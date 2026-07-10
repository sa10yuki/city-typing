# 市町村タイピング

全国1,741市区町村の名前をローマ字タイピングして、日本地図を塗りつぶしていく制覇型タイピングゲーム。

## 遊び方

- 都道府県を選ぶ（地図クリック or リスト）と、その県の全市区町村がランダム順で出題される
- 漢字＋ひらがなを見てローマ字入力（si/shi など複数表記OK、ミスはペナルティなしでミス数記録のみ）
- 県内を打ち切るまでのタイムを計測。ベストタイム・KPM・正確率を記録
- クリアした市区町村は地図が塗りつぶされ、進捗は localStorage に保存される

## 開発

```bash
npm install
npm run dev     # 開発サーバー
npm test        # ローマ字判定エンジンのテスト
npm run data    # rawdata/ からアプリ用データを再生成
npm run build   # 本番ビルド
```

## データソース

- 市区町村名・読み: [code4fukui/localgovjp](https://github.com/code4fukui/localgovjp)
- 市区町村境界地図: [smartnews-smri/japan-topography](https://github.com/smartnews-smri/japan-topography)
  （出典: 国土交通省 国土数値情報 行政区域データ N03）

政令指定都市は区単位ではなく市単位で出題（地図の区ポリゴンは親の市に割り当て）。
北方領土6村は市区町村リストに含まれない（地図上は未割り当て表示）。
