# Window Model MVP 方針メモ

最終更新: 2026-04-11

---

## 1. 結論

sticky の本命 UX は、全画面 overlay + click-through ではなく、`memo 1 window` を基本とする window model に戻す。

理由:

- 実使用フローの中心が `すぐ出す -> すぐ書く -> 元作業へ戻る -> 1 click でまた触る` だから
- `through 中でもメモを直接 1 click で拾う` ことは、`window 全体 on/off` 方式では原理的に厳しいから
- macOS 標準に近い window UX の方が、背景アプリとの往復に自然だから

この判断により、overlay / through は本命ではなく比較結果として扱う。

---

## 2. 今回の優先順位

優先するもの:

- `Cmd + Option + Enter` で即メモを出せる
- 出した直後にそのまま記入できる
- 記入後すぐ元の仕事に戻れる
- 背景作業中に `1 click` でそのメモへ戻れる
- `pin` で見失わず、参照し続けられる

優先しないもの:

- canvas 的な面の操作感
- 複数メモの同時移動
- 9-note session や 15 memo 同時展開を前提にした設計

補足:

- `複数選択して Delete / Save` のようなコマンド系一括操作は将来追加余地あり
- ただし `複数 window の同時 drag` は MVP では扱わない

---

## 3. 新しい基本モデル

### 3-1. 表示モデル

- `1 memo = 1 window`
- window は基本的に通常の macOS window として扱う
- 見た目は可能な限り現行 sticky のメモ UI に寄せる
- 常時タイトルバー表示は前提にしない

### 3-2. pin の意味

- `pin = keep on top`
- pin された memo window は `always_on_top`
- unpin の memo window は通常 window

### 3-3. session の意味

- session は残す
- ただし session は `表示単位` ではなく `論理グループ`
- つまり `session = データモデル`, `window = 表示モデル`

---

## 4. MVP の割り切り

MVP で成立させるもの:

- 1枚メモの起動
- 編集
- 保存
- close / reopen
- pin / unpin
- Home / Trash / Settings からの回収

MVP で捨てるもの:

- session 全体 drag
- 複数 memo の空間的一括移動
- overlay 前提の through / overlay モード

MVP で保留にするもの:

- 複数選択
- `Shift + click` による複数 memo 選択
- 選択集合に対する `Delete` / `Save`

---

## 5. 既存実装の扱い

### 5-1. 再利用する層

できるだけ再利用する。

再利用候補:

- SQLite スキーマ
- `sessions / memos / settings` のデータモデル
- autosave / cleanup の基盤
- Home / Trash / Settings の管理画面
- title 生成ルール
- ショートカット体系の名前と役割
- 既存の memo UI トークン、配色、見た目の方向
- `pin`, `trash`, `close`, `reopen` の概念

### 5-2. 作り直す層

作り直し前提で考える。

対象:

- `App.tsx` 中心の単一 overlay 前提ロジック
- slot ベース配置
- `selection / editing / drag / resize` の単一 canvas 制御
- `through / overlay` モード制御
- `session://reopen` の overlay 向け再配置ロジック

### 5-3. スパゲッティ化への判断

結論として、`overlay コードを延命しながら window model を継ぎ足す` のは避ける。

理由:

- 表示モデルそのものが変わる
- 単一 WebView 前提の state と複数 window registry を同居させると責務が濁る
- 一時移行コードが長く残ると、将来の保守コストが高い

推奨:

- `永続化 / 管理画面 / ドメイン概念` は再利用
- `表示層 / window 制御層` は新しい前提で組み直す

つまり、`全部作り直し` ではなく、`下層は流用しつつ UI と window orchestration は作り直す` が妥当。

---

## 6. 実装方針

### Phase W0: 方針固定

- 本メモを基準にする
- `through / overlay` は本命から外す
- `memo 1 window` を第一候補として固定する

### Phase W1: 最小 PoC

目的:

- `1 memo = 1 window` が自然に使えるかを見る

最低限:

- `Cmd + Option + Enter` で 1 memo window 作成
- そのまま編集
- close
- reopen
- pin / unpin

Gate:

- 他アプリ作業中でも `1 click` で再編集が自然
- through 切替なしで運用可能

### Phase W2: 保存経路接続

- 既存 DB と接続
- autosave を再接続
- Home / Trash / Settings と接続

### Phase W3: session 再定義

- session を論理グループとして再接続
- session 単位操作をどこまで残すか決める

---

## 7. いま決めたこと

- 本命 UX は overlay ではなく window model
- `1 click で再編集` を最優先に置く
- `pin` は window ごとの always-on-top とする
- 複数同時移動は MVP で扱わない
- 既存の下層基盤は活かす
- 表示層は無理に延命せず組み直す

---

## 8. 次にやること

1. `dev-status.md` と `マスタープラン.md` に本方針を反映する
2. `Phase W1` の最小 PoC 計画書を別ファイルで作る
3. 現行 overlay 実装を本命から外した扱いに更新する

