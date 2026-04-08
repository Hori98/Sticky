# Phase 4 骨組み計画書: 保存基盤と自動処理

## 1. 対象フェーズ
- マスタープラン対応: `Phase 4: 保存基盤と自動処理`
- 主目的: sticky の保存モデルを SQLite 基盤へ接続し、autosave / cleanup / 再起動耐性を成立させる

---

## 2. SSOT 参照宣言
本計画書は以下を前提とする。

- `AI-Planning-Guidelines-Sticky.md`
- `マスタープラン.md`
- `要件定義.md`
- `画面一覧_状態遷移_DBスキーマ案.md`
- `操作一覧表.md`
- `疎通確認結果.md`
- `phase-2-desktop-memo-minimum.md`
- `phase-3-session-operations.md`

---

## 3. フェーズ目的
- 明示保存と autosave の保存経路を一本化する
- SQLite に memo / session / settings を保存する
- 起動時 cleanup と `is_open` リセットを成立させる
- `content != ''` 表示ルールと整合する保存モデルにする

---

## 4. 想定対象
- SQLite 接続
- sessions / memos / settings の永続化
- isDirty 連動保存
- title 再生成
- autosave
- 起動時 cleanup
- `is_open` 全リセット

---

## 5. 未確定論点
- DBアクセス層を Rust 側に寄せるか、どこまでフロントと分離するか
- autosave の実行タイミング管理を Rust / JS のどちらで持つか
- 保存失敗時の UI 反応を MVP でどこまで持つか

---

## 6. 想定 Issue 系統
- `D-`: 保存経路、title 再生成、空メモ cleanup
- `S-`: open/closed/trashed の整合
- `T-`: SQLite 接続と Tauri コマンド境界
- `K-`: 文書化済み保存仕様との差分管理

---

## 7. Gate 条件（骨組み）
- `Cmd + S` と autosave が同じ保存経路を通る
- SQLite への保存と読み出しができる
- 起動時 cleanup が実行される
- `is_open` の全リセットが行われる
- 空メモと空セッションの cleanup が成立する

---

## 8. フェーズ着手条件
- `Phase 2` が完了している
- `Phase 3` の Gate 条件が満たされている
- DBスキーマ案と保存モデルの文書が更新済みである

---

## 9. 備考
- 本書は骨組みであり、実装直前に詳細計画書へ展開する
- Phase 4 では管理画面UIは最小限に留め、保存成立を優先する

---

## 10. 変更履歴
- 2026-04-08: 初版作成
