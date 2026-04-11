# Project Bootstrap

最終更新: 2026-04-11

## 1. 新プロジェクトの初期方針

- 別 repo として開始する
- 現行 `Sticky` は legacy 扱いで凍結する
- 新 repo では最初に Phase 0 の文書を置く

## 2. 新 repo の推奨構成

```text
StickyNative/
  README.md
  docs/
    product/
    architecture/
    roadmap/
  StickyNativeApp/
  StickyNativeTests/
```

## 3. docs で最初に置く文書

- `product-vision.md`
- `ux-principles.md`
- `domain-model.md`
- `technical-decision.md`
- `roadmap.md`
- `mvp-scope.md`
- `legacy-data-policy.md`

`legacy-data-policy.md` には最低限以下を書く。

- 旧 `Sticky` の DB / Trash は自動移行しない
- 新 native 版からは初期状態で旧データは見えない
- 旧データは legacy アプリ側で参照する
- 将来 import を作る場合は別フェーズで扱う

## 4. 実装開始前の固定事項

- app 名
- bundle id
- macOS minimum version
- window の基本挙動
- shortcut 一覧
- persistence の責務境界

## 5. 初回実装の順序

1. menu bar app の骨組み
2. global shortcut
3. memo window
4. pin / close
5. local draft 保持
6. local reopen
7. SQLite

補足:

- Phase 1 では `閉じても失わない` を満たすため、SQLite 前に最小 local draft を入れる
- 本格 persistence は Phase 2 で SQLite へ移す

## 6. 現行 repo から持ち込むもの

- 文書の結論
- 色と UI の方向性
- ドメイン用語
- SQLite 項目の叩き台

## 7. 現行 repo から持ち込まないもの

- 実装ファイルの直接コピー
- overlay 前提設計
- Tauri 特有の work around

## 8. 旧データの扱い

- 旧 `sticky.db` は新 repo 初期版では読まない
- 旧データ移行は bootstrap の必須条件にしない
- import が必要になった場合は、native MVP 安定後に別フェーズで扱う
