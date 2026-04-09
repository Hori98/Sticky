# Click-Through 再設計計画書: canvas 維持 + 本番入力モード設計

## 1. 対象フェーズ

- 対応ブランチ: `feature_clickthrough_redesign`
- 主目的:
  - sticky 本体の canvas / session UX を維持したまま、背景アプリと自然に行き来できる本番 click-through モデルを設計・検証する

本計画は window model 全体の再設計ではなく、`sticky 本体 = 透明前面レイヤー`, `管理画面 = 通常 window` の役割分離を前提とする。

---

## 2. SSOT 参照宣言

本計画は以下を参照し、これらと矛盾しない範囲で進める。

- `AI-Planning-Guidelines-Sticky.md`
- `マスタープラン.md`
- `要件定義.md`
- `画面一覧_状態遷移_DBスキーマ案.md`
- `操作一覧表.md`
- `plans/refactor-governance-and-execution-plan.md`

補足:

- sticky 本体では `思考の初速` と `操作の自然さ` を優先する
- 管理画面は通常の macOS window として扱う
- 一般的な macOS 挙動から逸脱する場合は理由を明文化する

---

## 3. 今回触る関連ファイル

初手の候補:

| ファイル | 用途 |
|---|---|
| `app/src-tauri/src/lib.rs` | click-through 切替の本番制御 |
| `app/src/App.tsx` | 入力モード state とイベント遷移 |
| `plans/clickthrough-redesign-plan.md` | 本計画書 |

方針:

- 1 サブフェーズの主目的は 1 つだけ
- 触るファイル数は `3` 以下
- まずは本番 click-through の状態遷移を最小プローブで確認する

---

## 4. 問題一覧

### T-20: 透明前面レイヤーはあるが、本番 click-through が成立していない

現状:

- click-through 切替は dev 限定のデバッグショートカット
- 本番 UX として「いつ透過し、いつ入力を受けるか」が定義されていない

影響:

- sticky 起動中に背景アプリと自然に行き来しづらい
- タイトルバー経由の回避が必要になる

### U-20: sticky の強みである canvas / session UX を壊したくない

現状認識:

- `memo 1 window` は自然な macOS 遷移には強い
- しかし session 単位操作や Canva 的な面の体験を弱める

判断:

- sticky 本体は 1 枚の canvas overlay を維持する方向が本命

### S-20: 入力モード state が未定義

必要なこと:

- 非操作時に背景へクリックを通す
- メモ操作時は sticky が入力を受ける
- 編集終了やメニュー終了後に透過状態へ戻せる

### T-21: Tauri / macOS 上での入力透過切替の安定運用が未確認

確認対象:

- `set_ignore_cursor_events` を本番ロジックに昇格できるか
- ドラッグ、右クリック、編集、picker 表示で破綻しないか

補足:

- Issue ID を 20 番台から始めているのは、本ブランチ内の click-through 再設計論点を既存リファクタ計画の ID 群と視覚的に分離するためである

---

## 5. 目標 UX

sticky 本体の理想挙動は以下。

1. sticky を起動すると、透明な fullscreen-like overlay が立つ
2. ただし通常時は背景アプリ本体をそのままクリックできる
3. メモ本体を触った時だけ sticky が入力を受ける
4. 編集やメニューが終わったら、必要に応じて再び背景へ通す
5. 管理画面は別の通常 window で開く

言い換えると:

- `常に最前面` ではある
- `常に入力を奪う` ではない

---

## 6. 基本方針

### 6-1. sticky 本体

- 透明 fullscreen-like overlay を維持する
- click-through を本番仕様として扱う
- canvas / session UX を維持する

### 6-2. 管理画面

- 通常の macOS window とする
- 一覧・検索・復帰・設定・ゴミ箱を担当する

### 6-3. pin

- 現時点では pin の意味を即変更しない
- click-through 本番化を先に成立させる
- pin の前面維持再定義は後続フェーズで判断する

---

## 7. 入力モード案

本番 click-through は、少なくとも以下の状態を持つ前提で考える。

### Mode A: Pass-Through

- 背景クリックを通す
- sticky は視覚レイヤーとして存在する
- メモ本体以外は入力を奪わないのが理想

方式仮説:

- Tauri 側では window 全体に対して `set_ignore_cursor_events(true/false)` を使う
- Frontend 側では `.overlay-shell` を `pointer-events: none` 基本に寄せる
- メモカード、picker、context menu、delete confirm など実際に入力を受ける要素だけ `pointer-events: auto` にする

成立条件:

- 背景アプリ本体クリックを通せる
- それでも sticky の操作対象だけは拾える

成立しない場合の代替:

- 部分透過が不安定なら、window 全体の click-through on/off を明示モードとして切り替える案へ退避する
- それでも UX が破綻する場合は、比較候補として保持している `memo 1 window` 案へフォールバックする

### Mode B: Interactive

- sticky が入力を受ける
- メモ選択、ドラッグ、リサイズ、右クリックが可能

### Mode C: Editing

- textarea 入力中
- click-through を無効化
- 編集中の誤透過を防ぐ

### Mode D: Modal / Picker

- session picker, delete confirm, context menu 表示中
- sticky が入力を受ける
- 背景への透過は原則オフ

---

## 8. 修正フェーズ

### Phase C0: 状態モデル確定

目的:

- click-through 本番化の入力モードを文章で固定する

作業:

1. `Pass-Through / Interactive / Editing / Modal` の状態定義を確定
2. 各状態への遷移条件を定義
3. 既存 selection / editing / picker と矛盾しないか確認

Gate:

- 入力モードの曖昧さがない
- 既存 state と二重管理にならない

### Phase C1a: Tauri 最小疎通

目的:

- `set_ignore_cursor_events` を本番ロジックに使えるか確認する

作業:

1. dev 限定切替から昇格できる形を作る
2. App から Tauri へ入力モード変更を通知する経路を作る
3. 最小ケースで on/off を確認する

Gate:

- 背景アプリ本体を普通にクリックできる
- sticky 側に戻る導線が壊れない

### Phase C1b: 明示トグルと復帰導線

目的:

- ユーザーが `overlay / through` を意図的に切り替えられる最小導線を持つ

作業:

1. ワンボタンまたは明示 UI で `interactive <-> pass-through` を切り替える
2. セッション追加や picker 表示時に sticky 側へ自然復帰できるようにする
3. 手動切替とショートカット復帰の関係を整理する

Gate:

- `overlay / through` を明示的に切り替えられる
- セッション追加ショートカットだけに復帰手段が依存していない
- ユーザーが現在モードを把握できる

### Phase C2: 実操作に応じた自動遷移

目的:

- メモを触る時だけ sticky が入力を受ける最小導線を作る

作業:

1. メモ pointer down 前に interactive 化
2. 編集開始で editing 化
3. menu / picker / confirm 中は modal 化
4. 終了時に pass-through 復帰条件を定める

Gate:

- 背景アプリと自然に行き来できる
- sticky の主要操作が壊れない

### Phase C3: 回帰確認と判断

目的:

- click-through 本命案で進めるかを判断する

確認項目:

- drag / resize / right click / edit の破綻有無
- autosave / selection / delete confirm への副作用
- `memo 1 window` 案より sticky らしさが保てるか

Gate:

- 本番案として進める判断材料が揃う

### Phase C4: 本流反映または比較案移行

目的:

- C3 の判断結果に応じて、次の進路を固定する

分岐:

1. YES:
   - `canvas 維持 + 本番 click-through` を本命案として継続する
   - 次フェーズで `selection / editing / picker / delete confirm` を本番入力モードへ統合する
2. NO:
   - click-through 本命案は比較結果として保存する
   - `feature_window_model_redesign` に残した `memo 1 window` 案または別の通常 window 案へ移行する

Gate:

- YES/NO のどちらでも次に進むブランチと計画が明示されている

---

## 9. Gate 条件

この計画全体の Gate 条件:

- 背景アプリ本体をタイトルバー経由なしで自然にクリックできる
- sticky 側のメモ操作へ違和感なく戻れる
- canvas / session UX を維持できる
- 既存 selection / editing / picker / delete confirm を壊さない

---

## 10. 回帰 / 副作用チェック

実装時は必ず以下を行う。

- `npm run lint`
- `npm run build`
- `cargo check --manifest-path app/src-tauri/Cargo.toml`

手動確認:

- 背景アプリ本体クリック
- メモ選択
- ドラッグ / リサイズ
- 編集開始 / 編集終了
- context menu
- delete confirm
- session picker

---

## 11. 比較候補の扱い

`memo 1 window` 案は棄却ではなく比較候補として残す。

ただし本命順位は以下に変更する。

1. `canvas 維持 + 本番 click-through`
2. `memo 1 window`（比較案）

理由:

- sticky の session / canvas 体験を保ちやすい
- 管理画面を通常 window に分離できる
- Apple Notes 的な「普通のアプリ遷移」と sticky 独自 UX の中間を狙える

---

## 12. MECE 検査結果

### 検査A: Issue → Phase 対応

- `T-20` → `Phase C1`, `Phase C2`
- `U-20` → `Phase C2`, `Phase C3`
- `S-20` → `Phase C0`, `Phase C2`
- `T-21` → `Phase C1`, `Phase C2`

確認:

- すべての Issue に対応 Phase がある
- すべての Phase に対応する Issue がある

### 検査B: SSOT 整合

- `AI-Planning-Guidelines-Sticky.md` を確認した
- `マスタープラン.md` を確認した
- `要件定義.md` を確認した
- `画面一覧_状態遷移_DBスキーマ案.md` の状態遷移と矛盾しないよう、入力モードを既存 state の上位概念として扱う方針を明記した
- `操作一覧表.md` と整合するよう、selection / editing / picker / delete confirm を壊さないことを Gate に入れた

### 検査C: DRY / KISS

- click-through の実現方式は `Tauri 全体透過 + CSS の入力対象限定` を第一仮説に絞った
- 状態は `Pass-Through / Interactive / Editing / Modal` の 4 つに限定し、過剰な分岐を増やしていない
- 成立しない場合の代替として `window 全体 on/off` と `memo 1 window` フォールバックを明記した

---

## 13. 変更履歴

- 2026-04-09: 初版作成
