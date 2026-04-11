# UX Principles

最終更新: 2026-04-11

## 1. 中心フロー

1. 作業中に `Cmd+Option+Enter`
2. 新しい memo window が前面に出る
3. そのまま書く
4. すぐ元の作業に戻る
5. 必要になったら memo を 1 click で再編集する

## 2. UX 原則

- 速い:
  - 思考の初速を落とさない
- 自然:
  - macOS の普通の window として振る舞う
- 軽い:
  - 設定や整理を先に考えさせない
- 可逆:
  - 閉じても失わない
- 明快:
  - pin / close / reopen / trash の意味が曖昧でない

## 3. 表示原則

- `1 memo = 1 window`
- memo window はクロームレス寄りの見た目にする
- ただし操作の自然さを優先し、必要なら見た目より OS 標準に寄せる
- `pin` はその window だけを前面固定する

## 4. 操作原則

- `Cmd+Option+Enter`: 新規 memo
- `Cmd+S`: 保存
- `Cmd+W`: 閉じる
- `Cmd+Enter`: 保存して閉じる
- 1 click: 対象 memo を再編集

補足:

- この `閉じても失わない` は PoC の体感ではなく、MVP の必須条件とする
- そのため Phase 1 の後半から最小 local draft 保持を入れ、Phase 2 で SQLite に昇格させる

## 5. 後回しにする操作

- 複数 memo 選択
- session 全体 drag
- 複数 window の一括移動

## 6. UX 評価基準

- 3 秒以内に書き始められるか
- 元アプリへの復帰が邪魔なくできるか
- 再編集のために mode 切替を要求しないか
- pin の挙動を説明なしに理解できるか
