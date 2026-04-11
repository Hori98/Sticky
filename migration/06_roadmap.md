# Roadmap

最終更新: 2026-04-11

## Phase 0: SSOT Fix

目的:
- 新プロジェクトの仕様と成功条件を固定する

タスク:
- プロダクト定義を確定
- UX 原則を確定
- 用語集を確定
- 非ゴールを確定
- 技術選定を確定

完了条件:
- この `migration` フォルダが新プロジェクトの設計起点として機能する

## Phase 1: Window Core

目的:
- `1 memo = 1 window` を自然に成立させる

タスク:
- menu bar app の土台
- global shortcut
- 新規 memo window 生成
- 入力 UI
- drag
- resize
- pin / unpin
- close
- 最小 local draft 保持
- close 後の同一端末内 reopen
- 最小アイコン

補足:

- Phase 1 の local draft は `app 再起動をまたがない一時保持` とする
- 永続保存責務はまだ持たせず、process 生存中の reopen 体験確認を主目的にする

完了条件:
- `Cmd+Opt+Enter` から自然に memo を使える
- close してもローカル draft を失わない
- reopen が最低限成立する

## Phase 2: Persistence

目的:
- メモを失わない

タスク:
- SQLite 接続
- memo 保存
- title 自動生成
- autosave
- app launch cleanup
- local draft から SQLite 保存へ責務を昇格
- reopen を DB ベースに切り替え

完了条件:
- close / relaunch 後もメモを回収できる

## Phase 3: Management

目的:
- 後から回収・整理できる

タスク:
- Home
- Trash
- Settings
- 検索
- reopen
- restore
- hard delete

完了条件:
- 「書く」と「後で整理」が分離して成立する

## Phase 4: Session

目的:
- session を論理グループとして再導入する

タスク:
- session 作成ルール
- session 表示ルール
- session 単位操作の最小定義
- memo の session 間移動

完了条件:
- session が複雑化要因ではなく、整理上の価値として機能する

## Phase 5: Polish

目的:
- 日常使用レベルまで上げる

タスク:
- パフォーマンス
- edge case 処理
- icon / visual polish
- shortcut polish
- menu 文言 polish
- error handling
- 旧 DB / Trash の import 要否を再評価

完了条件:
- 自分用に常用できる品質
