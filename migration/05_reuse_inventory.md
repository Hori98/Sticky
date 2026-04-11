# Reuse Inventory

最終更新: 2026-04-11

## 1. そのまま再利用できるもの

- 要件の大枠の参考情報
  - [要件定義.md](/Users/hori/Desktop/Sticky/要件定義.md)
- 画面と状態の概念整理
  - [画面一覧_状態遷移_DBスキーマ案.md](/Users/hori/Desktop/Sticky/画面一覧_状態遷移_DBスキーマ案.md)
- window model 方針判断
  - [plans/window-model-mvp-direction.md](/Users/hori/Desktop/Sticky/plans/window-model-mvp-direction.md)

## 2. 参考として再利用するもの

- SQLite スキーマの方向性
- title 自動生成ルール
- Trash / Home / Settings の情報設計
- 色設計
- 既存アイコンの方向性

参考元:

- [app/src/services/stickyDb.ts](/Users/hori/Desktop/Sticky/app/src/services/stickyDb.ts)
- [app/src-tauri/src/lib.rs](/Users/hori/Desktop/Sticky/app/src-tauri/src/lib.rs)

## 3. 再利用しないもの

- `App.tsx` の overlay 前提ロジック
- through / overlay のモード制御
- slot ベースの前提
- 単一 WebView 上の選択・編集・ドラッグ制御

対象:

- [app/src/App.tsx](/Users/hori/Desktop/Sticky/app/src/App.tsx)
- [app/src/domain/sessionActions.ts](/Users/hori/Desktop/Sticky/app/src/domain/sessionActions.ts)
- [app/src/domain/sessionHelpers.ts](/Users/hori/Desktop/Sticky/app/src/domain/sessionHelpers.ts)

## 4. 移植時のルール

- コードはコピー起点にしない
- 仕様、用語、色、データ項目だけを持っていく
- 実装は新プロジェクトで責務に合わせて書き直す
- 新 native 版の SSOT は `migration/` 配下とし、既存文書は参考扱いに留める

## 5. Legacy 扱いにするもの

- 現行 repo 全体
- 既存ブランチ
- 実験用 click-through 実装
- W1 Tauri window PoC
- 旧 `sticky.db` と Trash データ

補足:

- 旧 DB は初期 native MVP では移行対象にしない
- 将来インポート機能を作る場合の読み取り元として保持する
