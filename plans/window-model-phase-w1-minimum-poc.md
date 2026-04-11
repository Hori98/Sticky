# Window Model Phase W1 計画書: 1 Memo 1 Window 最小 PoC

最終更新: 2026-04-11

---

## 1. 対象

- 対応ブランチ: `feature_window_model_mvp`
- 親方針: `plans/window-model-mvp-direction.md`
- 主目的:
  - `1 memo = 1 window` の最小構成で、sticky の本命 UX が成立するかを確認する

今回の PoC は、本実装ではなく UX / 技術疎通確認である。

---

## 2. 何を確かめるか

中心フローは以下とする。

1. 作業中に `Cmd + Option + Enter` を押す
2. 1枚の memo window が開く
3. そのまま記入する
4. すぐ元の作業へ戻る
5. 背景作業中に memo を `1 click` して再編集する

確認したい本質:

- through / overlay を使わなくても自然に往復できるか
- 1 click で memo に戻る感触が macOS の通常 window として自然か
- `pin` を window ごとの `always_on_top` にしたとき、意味が素直になるか

---

## 3. スコープ

### 3-1. この PoC でやること

- `Cmd + Option + Enter` で 1 memo window を開く
- 1 memo window 内でそのまま編集できる
- close できる
- `pin / unpin` を window 単位で切り替えられる
- 見た目は現行 sticky の memo UI に近づける

### 3-2. この PoC でやらないこと

- 複数 memo の同時移動
- `Shift + click` 複数選択
- session 全体 drag
- reopen
- 管理画面との本接続
- autosave の本接続
- Trash / Settings の本接続
- 複数 memo window の一括操作

---

## 4. 成功条件

以下を満たせば W1 は成功とする。

- `Cmd + Option + Enter` から記入開始までに大きな引っ掛かりがない
- 元アプリへの復帰が自然
- memo window を `1 click` して再編集に戻るのが自然
- `pin` した window だけ前面維持される
- `through / overlay` なしでも、現行より実使用に寄ると判断できる

---

## 5. 技術方針

### 5-1. 基本方針

- overlay 前提コードを継ぎ足さない
- 表示層は PoC 用に分離して組む
- 既存 DB / 管理画面 / session 概念はこの段階では極力触らない
- `main` window は削除せず、W1 では hidden controller として残す

### 5-2. window 管理

- Tauri 側で新規 memo window を生成する
- label は `memo:<memoId>` のように一意にする
- `pin` は window ごとの `always_on_top` 切替に対応させる
- close は window close を基本とする
- `Cmd + Option + Enter` は常に新規 memoId を払い出す
- reopen は W1 では扱わず、close した draft の復帰責務は W2 に送る

### 5-3. controller window

- 既存の `main` は W1 では残す
- 役割は `tray / menu / global shortcut / app-level event` の controller に限定する
- `main` は memo 表示面としては使わない
- W1 ではまず `1x1` 相当の controller window として残す
- 既存 overlay 設定である `always_on_top`, `visible_on_all_workspaces`, `skip_taskbar`, monitor 全面サイズ化, overlay UI 表示開始 は外す
- `main` の見え方は「最小サイズで残し、作業導線から外す」に一本化する
- 完全不可視化は W1 では必須にしない。まずは controller 責務の分離を優先する

この固定により、W1 では `memo window の自然さ` にだけ集中する。

### 5-4. state

- W1 では「1枚 memo の使用感」が主目的なので、厳密な複数 window 同期は後回し
- まずは対象 window 内で完結する最小 state を優先する
- ただし将来の本実装を見据え、`memoId` 単位の識別だけは最初から崩さない

### 5-5. memo window の macOS 挙動

W1 では以下を固定する。

- `decorations(false)`
- `always_on_top(false)` を基本
- `pin` 時だけ `always_on_top(true)`
- `skip_taskbar(false)`
- `visible_on_all_workspaces(false)`

評価軸は「普通の macOS window として自然か」であり、特殊挙動を足しすぎない。

### 5-6. close / pin の導線

W1 では導線を先に固定する。

- close:
  - `Cmd + W`
  - memo window 内の明示 close ボタン
  - PoC では両方を正式導線とする
  - `Cmd + W` は React 側の独自 state ではなく window close に素直に乗せる

- pin:
  - MemoWindow 側から `current window` を直接取得して、自分自身の `always_on_top` を切り替える
  - W1 では controller 経由の global registry を持ち込まない
  - 目的は multi-window orchestration ではなく、window 単体の自然さ確認である

---

## 6. 既存実装の利用方針

再利用する:

- ショートカット定義（`Cmd + Option + Enter`）
- memo UI の見た目トークン
- `pin` 概念
- 既存 icon / デザイン資産

再利用しない:

- 全画面 overlay
- click-through
- slot 前提配置
- 単一 `App.tsx` に全 memo を積む方式
- query param で `App.tsx` に memo window を載せる延命策

---

## 7. 触るファイル候補

初手候補:

| ファイル | 用途 |
|---|---|
| `app/src-tauri/src/lib.rs` | memo window 生成・pin 切替・ショートカット分岐 |
| `app/src/MemoWindow.tsx` | PoC 用 memo window UI（新規） |
| `app/src/memo-window-main.tsx` | memo window 用 entrypoint（新規） |
| `app/src/App.css` | memo window 用の最小スタイル |

補足:

- W1 では `App.tsx` に memo window state を戻さない
- memo window 用 entrypoint を分け、overlay 前提 UI と責務を混ぜない

---

## 8. 実装順

### Step 1

- `main` を controller 用に落とす
  - overlay 設定を外す
  - 全画面化しない
  - 作業面を覆わない
- そのうえで `Cmd + Option + Enter` で新規 memo window を出す
- 中身は固定テキストでもよい

### Step 2

- memo window 内で編集可能にする
- `Cmd + W` と UI close ボタンの両方で close を確認する

### Step 3

- `pin / unpin` で、その memo window 自身の `always_on_top` を切り替える

### Step 4

- 実際に別アプリを触りながら、往復体感を確認する

---

## 9. 判定観点

Yes の条件:

- `1 click で戻れる` 感触が明確に改善する
- through / overlay を使いたい気持ちが薄れる
- pin が素直な意味になる

No の条件:

- window 生成や復帰が不自然
- 1枚 memo でも思ったより邪魔
- 装飾なし window でも macOS 的な違和感が強い

---

## 10. 次フェーズへの接続

W1 が成功した場合:

- DB 永続化を接続する
- Home / Trash から reopen する
- session を論理グループとして再接続する

W1 が失敗した場合:

- window model の UI 条件を見直す
- decoration / pin / reopen 導線だけを再評価する
