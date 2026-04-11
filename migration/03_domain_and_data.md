# Domain And Data

最終更新: 2026-04-11

## 1. ドメインモデル

- `Memo`
  - 最小単位
  - 本文、タイトル、window 状態を持つ
- `Session`
  - 論理グループ
  - 表示単位ではなくデータ単位
- `Trash`
  - 論理削除領域
- `Settings`
  - 自動閉じる時間、上限など

## 2. 新プロジェクトでの意味づけ

- `window = 表示モデル`
- `session = 論理モデル`
- `memo = 表示と保存の両方の中心`

## 3. 維持したい概念

- session の存在
- title 自動生成
- Trash
- Home / Settings
- autosave
- 起動時 cleanup

補足:

- 上記は旧仕様から引き継ぐ「概念」であり、そのままの実装を引き継ぐ意味ではない
- 新 native 版では `migration/` 配下文書を正とし、旧仕様文書は参照用とする

## 4. 見直す概念

- 同時展開上限
- 15 スロット固定配置
- session 単位の空間操作
- is_open の責務

## 5. SQLite 叩き台

最低限のテーブルは維持してよい。

- `sessions`
- `memos`
- `settings`

ただし新プロジェクトでは、位置データは `slot` ではなく `window frame` を持つ前提で見直す。

例:

- `window_x`
- `window_y`
- `window_width`
- `window_height`
- `is_pinned`

## 6. 新しい責務分離

- App layer:
  - app lifecycle
  - menu bar
  - global shortcut
- Window layer:
  - memo window の生成、focus、pin、close
- Persistence layer:
  - SQLite
  - autosave
  - cleanup
- Management layer:
  - Home / Trash / Settings

## 7. 既存データ移行の方針

- native MVP では旧 `sticky.db` の自動読込はしない
- 旧データは legacy 側に残し、必要なら手動参照する
- 将来インポートを作る場合は、`old sessions / old memos / old trash` を読み取り専用で取り込む
- 旧データ移行は window core 完成後の別テーマとして扱う
