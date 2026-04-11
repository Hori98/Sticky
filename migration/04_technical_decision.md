# Technical Decision

最終更新: 2026-04-11

## 1. 候補

- `SwiftUI + AppKit + SQLite`
- `Tauri + React + SQLite`

## 2. 判断軸

- macOS の window 挙動との相性
- menu bar / shortcut / focus 制御
- `1 memo = 1 window` の自然さ
- 実装の一貫性
- 将来の保守性

## 3. Swift を第一候補にする理由

- multi-window が本業である
- `always on top`, focus, close, reopen が自然
- menu bar app との相性が良い
- 今回の価値が web UI より window UX にある
- AI 実装前提なら、web 技術を選ぶ優位が相対的に下がる

## 4. Swift のデメリット

- macOS 専用になる
- React の既存 UI 資産は直接は使いにくい
- AppKit を理解しないと window 制御の細部で詰まりやすい

## 5. Tauri を今回は採らない理由

- overlay 試行で、window/focus/input の摩擦が既に顕在化した
- 表示モデル変更時に、既存 web state と window orchestration が混ざりやすい
- `見た目は出るが挙動が噛み合わない` リスクが高い

## 6. 採用案

- UI:
  - `SwiftUI`
- window / menu bar / lifecycle / shortcut:
  - `AppKit`
- DB:
  - `SQLite`
- 状態管理:
  - `ObservableObject` / `@MainActor`

## 7. 技術方針

- SwiftUI 単独にこだわらない
- window 制御は最初から AppKit 併用前提にする
- クロスプラットフォーム性は追わない
- first-class UX は `memo window`

