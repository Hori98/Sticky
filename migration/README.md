# Sticky Migration Folder

最終更新: 2026-04-11

このフォルダは、現行 `Sticky` を終了し、macOS ネイティブ前提の新プロジェクトへ移行するための単一参照点である。

## 目的

- 現行プロジェクトの延命ではなく、`memo 1 window` を本命 UX とした新規プロジェクトへ切り替える
- 既存資産のうち再利用すべきものと破棄すべきものを分離する
- 実装前に、仕様・優先順位・技術判断・移行手順を MECE に固定する

## このフォルダの読み順

1. `01_product_decision.md`
2. `02_ux_principles.md`
3. `03_domain_and_data.md`
4. `04_technical_decision.md`
5. `05_reuse_inventory.md`
6. `06_roadmap.md`
7. `07_project_bootstrap.md`
8. `08_human_checklist.md`

## 結論

- 現行 `Sticky` は比較検証用の legacy として凍結する
- 新プロジェクトは `SwiftUI + AppKit + SQLite` を第一候補とする
- MVP の核は `Cmd+Opt+Enter -> すぐ書ける -> 元作業に戻る -> 1 click で再編集` とする
- `through / overlay` は本命仕様から外す

## 優先順位

- 新 native 版の仕様判断は、この `migration/` 配下を上位 SSOT とする
- 既存の [要件定義.md](/Users/hori/Desktop/Sticky/要件定義.md) と
  [画面一覧_状態遷移_DBスキーマ案.md](/Users/hori/Desktop/Sticky/画面一覧_状態遷移_DBスキーマ案.md)
  は参考資料として扱う
- 両者が衝突した場合は `migration/` 配下を優先する

## このフォルダは何か

- 新 native プロジェクトの `マスタープラン` 兼 `移行判断ログ`
- 実装前の上位方針を固定する場所
- 各 Phase の詳細計画書を切る前の親文書

## どう使うか

- まずこのフォルダを基準に、技術・UX・スコープの判断を固定する
- その後、各 Phase ごとに別ファイルで詳細計画を追加する
- 具体実装は、Phase 計画書が固まってから着手する
