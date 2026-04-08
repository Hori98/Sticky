import { useEffect, useRef, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import './App.css'

const DRAG_THRESHOLD = 6
const DEFAULT_WIDTH = 320
const DEFAULT_HEIGHT = 240
const MIN_WIDTH = 240
const MIN_HEIGHT = 180
const MAX_WIDTH = 520
const MAX_HEIGHT = 420

type MemoUiState = 'idle' | 'memo_selected' | 'editing'
type ResizeDirection = 'nw' | 'ne' | 'sw' | 'se'

type DragInteraction = {
  type: 'drag'
  startX: number
  startY: number
  originX: number
  originY: number
  active: boolean
}

type ResizeInteraction = {
  type: 'resize'
  direction: ResizeDirection
  startX: number
  startY: number
  originX: number
  originY: number
  originWidth: number
  originHeight: number
}

type Interaction = DragInteraction | ResizeInteraction

function App() {
  const [overlayVisible, setOverlayVisible] = useState(true)
  const [clickThrough, setClickThrough] = useState(false)
  const [uiState, setUiState] = useState<MemoUiState>('idle')
  const [content, setContent] = useState(
    '思考をその場で退避する。ここから sticky の最小メモUIを組み立てる。',
  )
  const [isComposing, setIsComposing] = useState(false)
  const [position, setPosition] = useState({ x: 72, y: 64 })
  const [size, setSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT })

  const cardRef = useRef<HTMLElement | null>(null)
  const editorRef = useRef<HTMLTextAreaElement | null>(null)
  const interactionRef = useRef<Interaction | null>(null)
  const dragExceededRef = useRef(false)
  const draftContentRef = useRef(content)
  const [editingKey, setEditingKey] = useState(0)

  useEffect(() => {
    const unlisten = Promise.all([
      listen<boolean>('overlay://visibility', (event) => {
        setOverlayVisible(event.payload)
      }),
      listen<boolean>('overlay://clickthrough', (event) => {
        setClickThrough(event.payload)
      }),
    ])

    return () => {
      void unlisten.then((handlers) => {
        handlers.forEach((dispose) => dispose())
      })
    }
  }, [])

  useEffect(() => {
    if (uiState === 'editing') {
      const editor = editorRef.current
      if (!editor) {
        return
      }

      editor.focus()
      editor.setSelectionRange(editor.value.length, editor.value.length)
    }
  }, [uiState])

  useEffect(() => {
    draftContentRef.current = content
  }, [content])

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const interaction = interactionRef.current
      if (!interaction) {
        return
      }

      if (interaction.type === 'drag') {
        const deltaX = event.clientX - interaction.startX
        const deltaY = event.clientY - interaction.startY
        const distance = Math.hypot(deltaX, deltaY)

        if (!interaction.active) {
          if (distance < DRAG_THRESHOLD) {
            return
          }

          interaction.active = true
          dragExceededRef.current = true
        }

        setPosition({
          x: interaction.originX + deltaX,
          y: interaction.originY + deltaY,
        })
        return
      }

      const deltaX = event.clientX - interaction.startX
      const deltaY = event.clientY - interaction.startY

      let nextX = interaction.originX
      let nextY = interaction.originY
      let nextWidth = interaction.originWidth
      let nextHeight = interaction.originHeight

      if (interaction.direction.includes('e')) {
        nextWidth = Math.min(
          MAX_WIDTH,
          Math.max(MIN_WIDTH, interaction.originWidth + deltaX),
        )
      }

      if (interaction.direction.includes('s')) {
        nextHeight = Math.min(
          MAX_HEIGHT,
          Math.max(MIN_HEIGHT, interaction.originHeight + deltaY),
        )
      }

      if (interaction.direction.includes('w')) {
        const rawWidth = interaction.originWidth - deltaX
        nextWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, rawWidth))
        nextX = interaction.originX + (interaction.originWidth - nextWidth)
      }

      if (interaction.direction.includes('n')) {
        const rawHeight = interaction.originHeight - deltaY
        nextHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, rawHeight))
        nextY = interaction.originY + (interaction.originHeight - nextHeight)
      }

      setPosition({ x: nextX, y: nextY })
      setSize({ width: nextWidth, height: nextHeight })
    }

    const handlePointerUp = () => {
      interactionRef.current = null
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!overlayVisible) {
        return
      }

      if (uiState === 'editing') {
        if (event.key === 'Escape') {
          event.preventDefault()
          const nextValue = editorRef.current?.value ?? draftContentRef.current
          draftContentRef.current = nextValue
          setContent(nextValue)
          setUiState('idle')
        }

        return
      }

      if (isComposing) {
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        setUiState('idle')
      }

      if (event.key === 'Enter' && uiState === 'memo_selected') {
        event.preventDefault()
        setEditingKey((current) => current + 1)
        setUiState('editing')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isComposing, overlayVisible, uiState])

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (uiState === 'editing') {
      return
    }

    interactionRef.current = {
      type: 'drag',
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
      active: false,
    }
    dragExceededRef.current = false
  }

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (dragExceededRef.current) {
      dragExceededRef.current = false
      return
    }

    if (uiState !== 'editing') {
      event.stopPropagation()
      setUiState('memo_selected')
    }
  }

  const handleDoubleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (dragExceededRef.current) {
      dragExceededRef.current = false
      return
    }

    event.stopPropagation()
    setEditingKey((current) => current + 1)
    setUiState('editing')
  }

  const handleShellPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (!cardRef.current?.contains(event.target as Node)) {
      setUiState('idle')
    }
  }

  const handleResizePointerDown =
    (direction: ResizeDirection) => (event: React.PointerEvent<HTMLButtonElement>) => {
      event.stopPropagation()

      interactionRef.current = {
        type: 'resize',
        direction,
        startX: event.clientX,
        startY: event.clientY,
        originX: position.x,
        originY: position.y,
        originWidth: size.width,
        originHeight: size.height,
      }
      dragExceededRef.current = true

      if (uiState === 'idle') {
        setUiState('memo_selected')
      }
    }

  const commitEditorValue = () => {
    const nextValue = editorRef.current?.value ?? draftContentRef.current
    draftContentRef.current = nextValue
    setContent(nextValue)
  }

  const isSelected = uiState === 'memo_selected' || uiState === 'editing'
  const isEditing = uiState === 'editing'

  return (
    <main className="overlay-shell" onPointerDown={handleShellPointerDown}>
      {overlayVisible ? (
        <>
          <article
            ref={cardRef}
            className={`memo-card ${isSelected ? 'memo-card--selected' : ''} ${isEditing ? 'memo-card--editing' : ''}`}
            style={{
              transform: `translate(${position.x}px, ${position.y}px)`,
              width: `${size.width}px`,
              height: `${size.height}px`,
            }}
            onPointerDown={handlePointerDown}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
          >
            {isSelected ? <div className="memo-card__ring" /> : null}

            <header className="memo-card__meta">
              <span className="memo-card__badge">1-note session</span>
              <span className="memo-card__status">
                {isEditing
                  ? 'editing'
                  : clickThrough
                    ? 'click-through on'
                    : uiState === 'memo_selected'
                      ? 'selected'
                      : 'ready'}
              </span>
            </header>

            <div className="memo-card__body">
              {isEditing ? (
                <textarea
                  key={editingKey}
                  ref={editorRef}
                  className="memo-card__editor"
                  defaultValue={content}
                  onChange={(event) => {
                    if (!isComposing) {
                      draftContentRef.current = event.currentTarget.value
                    }
                  }}
                  onClick={(event) => event.stopPropagation()}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={(event) => {
                    setIsComposing(false)
                    draftContentRef.current = event.currentTarget.value
                  }}
                  onBlur={commitEditorValue}
                />
              ) : (
                <p className="memo-card__placeholder">{content}</p>
              )}
            </div>

            <footer className="memo-card__footer">
              <span>click: select / double click: edit</span>
              <span>drag: move / corner drag: resize</span>
            </footer>

            {isSelected ? (
              <>
                <button
                  className="memo-card__handle memo-card__handle--nw"
                  aria-label="resize north west"
                  onPointerDown={handleResizePointerDown('nw')}
                />
                <button
                  className="memo-card__handle memo-card__handle--ne"
                  aria-label="resize north east"
                  onPointerDown={handleResizePointerDown('ne')}
                />
                <button
                  className="memo-card__handle memo-card__handle--sw"
                  aria-label="resize south west"
                  onPointerDown={handleResizePointerDown('sw')}
                />
                <button
                  className="memo-card__handle memo-card__handle--se"
                  aria-label="resize south east"
                  onPointerDown={handleResizePointerDown('se')}
                />
              </>
            ) : null}
          </article>

          <aside className="runtime-badge">
            <span className="runtime-badge__dot" />
            <span>{clickThrough ? 'through' : 'overlay'}</span>
          </aside>
        </>
      ) : null}
    </main>
  )
}

export default App
