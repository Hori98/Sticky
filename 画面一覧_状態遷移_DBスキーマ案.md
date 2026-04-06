# Post it 画面一覧・状態遷移・DBスキーマ案

## 1. 前提
本アプリは初期MVPにおいてクラウド処理を行わず、完全ローカル完結とする。  
メモデータ、セッション、設定、ゴミ箱情報はすべてローカル保存する。

### ローカル保存方針
- 保存先は SQLite を用いる
- メモ本文、タイトル、セッション所属、位置情報、設定、ゴミ箱状態をローカル保存する
- 端末間同期、共有、クラウドバックアップは初期MVPでは扱わない

## 2. 画面一覧
### 2.1 デスクトップメモ画面
#### 用途
- 最前面でメモを表示、選択、編集、移動、保存、閉じる

#### 表示要素
- メモカード
- セッション色
- 選択枠
- 削除確認モーダル
- 上限到達時の警告演出

#### 主要操作
- セッション選択
- メモ選択
- 編集開始
- ドラッグ移動
- 保存
- 閉じる
- 削除

### 2.2 管理画面 Home
#### 用途
- 保存済みメモ・セッションの確認
- 再表示
- セッション間移動
- 検索

#### 表示構造
- 日時グループ
- セッション単位のまとまり
- セッション内メモカード

#### 主要操作
- メモ選択
- 複数選択
- 右クリックメニュー
- ドラッグ&ドロップでセッション移動
- 再表示
- 検索

### 2.3 管理画面 ゴミ箱
#### 用途
- 削除済みメモ・セッションの確認
- 復元
- 完全削除

#### 主要操作
- 復元
- 完全削除

### 2.4 管理画面 設定
#### 用途
- 自動閉じる時間設定
- 将来のショートカット設定
- UI調整用設定

#### 初期設定項目
- 自動閉じる時間
- 将来用のホットキー設定枠

## 3. 状態遷移
## 3.1 メモ状態
- `idle`
  - 非選択状態
- `memo_selected`
  - シングルクリックで入る
  - 個別メモだけ選択状態
- `session_selected`
  - 右クリックメニューの `このセッションを選択` で入る
  - セッション全体が選択状態
- `editing`
  - `Enter` またはダブルクリックで入る
  - 文字入力可能
- `delete_confirm`
  - `Delete` で入る
  - `Delete` または `Enter` で削除確定
  - `Esc` で戻る
- `closed`
  - `Cmd+Enter` または自動閉じるで入る
  - デスクトップ上は非表示
  - 管理画面から再表示可能
- `trashed`
  - 削除確定後
  - ゴミ箱へ移動

## 3.2 状態遷移の要約
- `idle -> memo_selected`: シングルクリック
- `idle -> session_selected`: 右クリック → `このセッションを選択`
- `session_selected -> memo_selected`: 同一セッション内メモをシングルクリック
- `memo_selected -> editing`: `Enter` またはダブルクリック
- `session_selected -> delete_confirm`: `Delete`
- `memo_selected -> delete_confirm`: `Delete`
- `editing -> closed`: `Cmd+Enter`
- `delete_confirm -> trashed`: `Delete` / `Enter`
- `delete_confirm -> session_selected or memo_selected`: `Esc`

## 3.3 選択解除
- `session_selected -> idle`: 領域外クリック / `Esc`
- `memo_selected -> idle`: 領域外クリック / `Esc`
- `editing -> idle`: `Esc` または範囲外選択

## 4. DBスキーマ案
初期MVPでは `sessions`, `memos`, `settings` の3テーブルで構成する。

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  color_slot INTEGER NOT NULL,
  is_open INTEGER NOT NULL DEFAULT 1,
  last_active_at TEXT NOT NULL,
  trashed_at TEXT
);

CREATE TABLE memos (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_edited_at TEXT NOT NULL,
  is_open INTEGER NOT NULL DEFAULT 1,
  is_dirty INTEGER NOT NULL DEFAULT 1,
  trashed_at TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  auto_close_minutes INTEGER NOT NULL DEFAULT 60,
  max_open_sessions INTEGER NOT NULL DEFAULT 5,
  max_open_memos INTEGER NOT NULL DEFAULT 15
);
```

## 5. 補足ルール
- `session_id` がセッション所属の唯一の基準
- セッション移動は `memos.session_id` の更新で実現する
- セッション内メモが0件になった場合、そのセッションは削除またはゴミ箱扱いとする
- 管理画面には `content != ''` のメモのみ表示する
- 保存処理には明示保存と autosave の両方を含み、どちらも `title` を本文先頭10文字から再生成する
- 使用中 `color_slot` の取得は `sessions.is_open = 1` のものだけを対象にする
- アプリ起動時は `sessions.is_open = 0` と `memos.is_open = 0` に全件リセットした後、空メモと空セッションを削除する
- ゴミ箱は `trashed_at IS NOT NULL` で判定可能
- 完全削除は別途物理削除処理で対応する

## 6. ローカル保存で十分か
今回のMVPはテキスト中心であり、保存対象は軽量であるため、ローカルSQLiteで十分成立する。

### 保存対象
- メモ本文
- タイトル
- セッション情報
- 設定
- ゴミ箱状態
- 位置情報

### クラウドが必要になる条件
- 端末間同期
- 共有
- バックアップ保証

上記は初期MVPでは扱わないため、クラウド処理は不要とする。

## 7. 次にやること
実装前の次ステップは以下とする。

1. 画面ワイヤー作成
2. 操作一覧表作成
3. DBアクセス層設計
4. Tauri でウィンドウ / ホットキー / SQLite の疎通確認
