import './App.css'

function App() {
  return (
    <main className="shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">sticky / design preview</p>
          <h1>思考を、その場で退避する。</h1>
          <p className="lead">
            最前面の付箋で書いて、閉じて、あとで回収する。MVP の空気感と
            UI トークンをまとめて確認するためのプレビュー。
          </p>
          <div className="command-strip">
            <span>Global Hotkey</span>
            <span>Cmd + Shift + 2...9</span>
            <span>Cmd + S</span>
            <span>Cmd + Enter</span>
          </div>
        </div>

        <div className="icon-card" aria-label="sticky icon direction">
          <div className="app-icon">
            <span className="icon-fold" />
            <span className="icon-line" />
            <span className="icon-line short" />
            <span className="icon-line tiny" />
          </div>
          <p>App / menu bar icon</p>
        </div>
      </section>

      <section className="workspace-preview">
        <div className="desktop-stage">
          <header className="section-head">
            <div>
              <p className="eyebrow">Desktop Memo UI</p>
              <h2>最前面のメモプレビュー</h2>
            </div>
          </header>

          <div className="memo-stack" aria-hidden="true">
            <article className="memo-card yellow">
              <p className="memo-date">2026/04/06 21:12のセッション</p>
              <p className="memo-text">
                AIとの会話中に出た枝メモ。
                <br />
                速度優先。保存よりも先に書く。
              </p>
            </article>

            <article className="memo-card blue selected">
              <div className="selection-ring" />
              <p className="memo-date">memo selected</p>
              <p className="memo-text">
                1回目でセッション選択。
                <br />
                2回目でメモ選択。
                <br />
                Enter で編集。
              </p>
              <span className="resize-handle top-left" />
              <span className="resize-handle top-right" />
              <span className="resize-handle bottom-left" />
              <span className="resize-handle bottom-right" />
            </article>

            <article className="memo-card red editing">
              <p className="memo-date">editing</p>
              <p className="memo-text">
                Cmd + Enter で完了して閉じる。
                <br />
                Delete で削除確認。
                <span className="caret" />
              </p>
            </article>
          </div>
        </div>

        <aside className="panel-preview">
          <header className="panel-header">
            <div>
              <p className="eyebrow">Management Window</p>
              <h2>Home</h2>
            </div>
            <div className="window-controls" aria-hidden="true">
              <span className="dot red" />
              <span className="dot yellow" />
              <span className="dot green" />
            </div>
          </header>

          <div className="search-bar">Search saved memos</div>

          <section className="session-section">
            <h3>2026/04/06 20:41のセッション</h3>
            <div className="list-card yellow">
              <strong>sticky の初回構成</strong>
              <p>管理画面は Home / Trash / Settings の3タブ。</p>
            </div>
            <div className="list-card green">
              <strong>autosave 条件</strong>
              <p>開いているセッションがある時だけ 5分ごとに更新保存。</p>
            </div>
          </section>

          <section className="empty-state">
            <h3>思考を、その場で退避する。</h3>
            <p>
              1. 起動して
              <br />
              2. 書いて
              <br />
              3. 閉じる
            </p>
          </section>
        </aside>
      </section>

      <section className="token-panel">
        <div className="token-block">
          <p className="eyebrow">Session Colors</p>
          <div className="swatches">
            <span className="swatch red" />
            <span className="swatch orange" />
            <span className="swatch yellow" />
            <span className="swatch green" />
            <span className="swatch blue" />
          </div>
        </div>

        <div className="token-block">
          <p className="eyebrow">Type & Motion</p>
          <ul className="token-list">
            <li>SF Pro Text / 14px / 1.45</li>
            <li>Radius memo: 18px</li>
            <li>Duration fast: 120ms</li>
            <li>Warning: 240ms</li>
          </ul>
        </div>
      </section>
    </main>
  )
}

export default App
