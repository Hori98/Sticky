# Phase 4 疎通確認手順

## 前提

- アプリは `npm run tauri dev` で起動する
- ブラウザ DevTools は Tauri のウィンドウ上で `Cmd + Option + I` で開く
- DB ファイルの場所: `~/Library/Application Support/com.hori.sticky/sticky.db`
- sqlite3 コマンドが使えること（`sqlite3 --version` で確認）

---

## DB 確認用コマンド（別ターミナルで実行）

```bash
DB=~/Library/Application\ Support/com.hori.sticky/sticky.db

# テーブル一覧
sqlite3 "$DB" ".tables"

# セッション一覧
sqlite3 "$DB" "SELECT id, color_slot, is_open, created_at, trashed_at FROM sessions;"

# メモ一覧（主要カラム）
sqlite3 "$DB" "SELECT id, session_id, content, title, is_open, trashed_at FROM memos;"

# メモ一覧（位置・サイズも）
sqlite3 "$DB" "SELECT id, content, pos_x, pos_y, width, height, is_pinned FROM memos;"
```

---

## 確認項目

### A-01: DB ファイルと 3 テーブルの生成

**手順**: アプリを起動する

**コンソールで確認（DevTools）**:
```
[DB] startup_cleanup done
[DB] load_sessions: 0 sessions   ← 初回は0件
```

**DB で確認**:
```bash
sqlite3 "$DB" ".tables"
# → memos  sessions  settings
```

**期待値**: memos / sessions / settings の 3 テーブルが存在する

---

### A-02: Cmd+Option+Enter でメモ生成 → 内容を入力

**手順**:
1. `Cmd + Option + Enter` で 1 枚セッションを開く
2. メモをダブルクリックして編集開始
3. 「テスト保存」と入力する

**注**: この時点ではまだ DB には保存されていない（保存前）

---

### A-03: Cmd+S で明示保存

**手順**:
1. A-02 の状態でメモを選択中（または編集中）に `Cmd + S` を押す

**コンソールで確認**:
```
[DB] saveSessions: sessions= ['session-xxx']
[DB] upsert_memo: memo-xxx title= テスト保存 content= テスト保存
[DB] saveSessions done
```

**DB で確認**:
```bash
sqlite3 "$DB" "SELECT id, content, title, is_open FROM memos;"
# → memo-xxx|テスト保存|テスト保存|0   ← Cmd+S は閉じるので is_open=0
sqlite3 "$DB" "SELECT id, is_open, created_at FROM sessions;"
# → session-xxx|0|2026-...
```

**期待値**:
- `memos.content` = 入力したテキスト
- `memos.title` = content 先頭 10 文字（`テスト保存` = 5文字なのでそのまま）
- `sessions.is_open` = 0（Cmd+S で閉じるため）
- `memos.is_open` = 0

---

### A-04: Cmd+Enter で保存して表示継続

**手順**:
1. 新たに `Cmd + Option + Enter` でメモを開く
2. 「継続テスト」と入力
3. `Cmd + Enter` を押す（表示継続）

**コンソールで確認**:
```
[DB] saveSessions: sessions= ['session-yyy']
[DB] upsert_memo: memo-yyy title= 継続テスト content= 継続テスト
[DB] saveSessions done
```

**DB で確認**:
```bash
sqlite3 "$DB" "SELECT id, content, is_open FROM memos;"
# 新しい行: memo-yyy|継続テスト|1   ← Cmd+Enter は閉じないので is_open=1
```

**期待値**: `is_open = 1`（デスクトップに残っている）

---

### A-05: 再起動後に is_open がリセットされる

**手順**:
1. A-04 でメモが is_open=1 の状態でアプリを終了
2. アプリを再起動する

**コンソールで確認**:
```
[DB] startup_cleanup done
[DB] load_sessions: 0 sessions   ← is_open=1 がなくなった
```

**DB で確認**:
```bash
sqlite3 "$DB" "SELECT id, is_open FROM sessions;"
# → 全行 is_open = 0
sqlite3 "$DB" "SELECT id, is_open FROM memos;"
# → 全行 is_open = 0
```

**期待値**:
- デスクトップは空（セッションが表示されない）
- DB には content が残っている（データは消えていない）

---

### A-06: 削除確認 → ゴミ箱移動

**手順**:
1. メモを開いて選択状態にする
2. `Del` キーを押して削除確認モーダルを表示
3. `Enter` で削除を確定する

**コンソールで確認（メモ削除の場合）**:
```
[DB] trash_memo: memo-xxx
```

**コンソールで確認（セッション削除の場合）**:
```
[DB] trash_session: session-xxx
```

**DB で確認**:
```bash
sqlite3 "$DB" "SELECT id, trashed_at FROM memos;"
# → memo-xxx|2026-04-09 12:34:56   ← trashed_at が設定されている

sqlite3 "$DB" "SELECT id, is_open, trashed_at FROM sessions;"
# → session-xxx|0|2026-04-09 12:34:56
```

**期待値**:
- `trashed_at IS NOT NULL`（ゴミ箱扱い）
- `is_open = 0`
- 「閉じる」（is_open=0, trashed_at IS NULL）と「削除」（trashed_at NOT NULL）が区別されている

---

### A-07: upsert で created_at が変わらない

**手順**:
1. メモを開いて `Cmd + Enter` で保存（is_open=1 のまま）
2. DB の `created_at` を記録する
3. 内容を編集して再度 `Cmd + Enter` で保存

**DB で確認**:
```bash
sqlite3 "$DB" "SELECT id, created_at, updated_at FROM memos;"
# 2回目の保存後も created_at が最初の値のまま
# updated_at だけが新しい時刻になっている
```

**期待値**: `created_at` は不変、`updated_at` が更新される

---

### A-08: autosave（テスト用に短縮確認）

autosave は 5 分間隔のため、通常確認では時間がかかる。以下の代替確認を使う。

**コードで短縮確認する場合**（任意）:
`App.tsx` の `AUTOSAVE_INTERVAL` を `10 * 1000`（10秒）に一時変更してビルドし直す。
メモを開いて内容を入力した状態で 10 秒待つと:

```
[DB] saveSessions: sessions= ['session-xxx']
...
[DB] saveSessions done
```

**期待値**: isDirty なセッションがある場合のみログが出る（ない場合は何も出ない）

---

## 確認チェックリスト

| 項目 | 確認方法 | 期待値 |
|---|---|---|
| A-01: DB・テーブル生成 | `.tables` | 3テーブル存在 |
| A-02: メモ入力 | GUI | 問題なし |
| A-03: Cmd+S で保存 | コンソール + DB | content/title 保存, is_open=0 |
| A-04: Cmd+Enter で保存継続 | コンソール + DB | is_open=1 |
| A-05: 再起動で is_open リセット | コンソール + DB | デスクトップ空、DBにデータあり |
| A-06: 削除 → trashed_at | コンソール + DB | trashed_at 設定、閉じると区別 |
| A-07: created_at 保全 | DB | upsert 繰り返しで不変 |
| A-08: autosave | コンソール | 5分後（短縮時10秒後）にログ |

---

## よくあるエラーと対処

| エラー | 原因 | 対処 |
|---|---|---|
| `[DB] startup failed: ...` | DB ファイルが開けない | `~/Library/Application Support/com.hori.sticky/` を確認 |
| `sqlite3: no such file` | sqlite3 未インストール | `brew install sqlite` |
| コンソールに `[DB]` ログが出ない | DevTools が開いていない | `Cmd + Option + I` で開く |
| DB に行が入らない | invoke が失敗している | コンソールのエラーを確認 |

---

## 確認後の後片付け

確認が終わったら console.log を削除する（別途 Phase 4 クリーンアップとして対応）。
