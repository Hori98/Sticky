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
const MAX_OPEN_SESSIONS = 5
const MAX_OPEN_MEMOS = 15

const SESSION_COLOR_VARS = [
  'var(--session-red)',
  'var(--session-orange)',
  'var(--session-yellow)',
  'var(--session-green)',
  'var(--session-blue)',
]

const SLOT_PERCENTAGES = [
  { x: 0.1, y: 0.18 },
  { x: 0.3, y: 0.18 },
  { x: 0.5, y: 0.18 },
  { x: 0.7, y: 0.18 },
  { x: 0.9, y: 0.18 },
  { x: 0.1, y: 0.43 },
  { x: 0.3, y: 0.43 },
  { x: 0.5, y: 0.43 },
  { x: 0.7, y: 0.43 },
  { x: 0.9, y: 0.43 },
  { x: 0.1, y: 0.68 },
  { x: 0.3, y: 0.68 },
  { x: 0.5, y: 0.68 },
  { x: 0.7, y: 0.68 },
  { x: 0.9, y: 0.68 },
]

type MemoUiState = 'idle' | 'memo_selected' | 'editing'
type SessionSelectionState = 'idle' | 'session_selected'
type ResizeDirection = 'nw' | 'ne' | 'sw' | 'se'

type Memo = {
  id: string
  content: string
  savedContent: string
  uiState: MemoUiState
  isVisible: boolean
  isDirty: boolean
  position: { x: number; y: number }
  size: { width: number; height: number }
  slotIndex: number | null
  editingKey: number
}

type Session = {
  id: string
  colorSlot: number
  isOpen: boolean
  selectionState: SessionSelectionState
  memos: Memo[]
}

type MultiOpenPayload = {
  count: number
}

type DragInteraction = {
  type: 'drag'
  sessionId: string
  memoId: string
  startX: number
  startY: number
  originX: number
  originY: number
  active: boolean
}

type ResizeInteraction = {
  type: 'resize'
  sessionId: string
  memoId: string
  direction: ResizeDirection
  startX: number
  startY: number
  originX: number
  originY: number
  originWidth: number
  originHeight: number
}

type Interaction = DragInteraction | ResizeInteraction

function nextId(prefix: string, current: number) {
  return `${prefix}-${current.toString(36)}`
}

function getViewportSize() {
  if (typeof window === 'undefined') {
    return { width: 1440, height: 900 }
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  }
}

function getSlotPosition(slotIndex: number) {
  const viewport = getViewportSize()
  const slot = SLOT_PERCENTAGES[slotIndex] ?? SLOT_PERCENTAGES[0]

  return {
    x: Math.round(viewport.width * slot.x - DEFAULT_WIDTH / 2),
    y: Math.round(viewport.height * slot.y - DEFAULT_HEIGHT / 2),
  }
}

function getOpenSessions(sessions: Session[]) {
  return sessions.filter((session) => session.isOpen)
}

function getOpenMemos(sessions: Session[]) {
  return getOpenSessions(sessions).flatMap((session) =>
    session.memos.filter((memo) => memo.isVisible),
  )
}

function findUnusedColorSlot(sessions: Session[]) {
  const usedSlots = new Set(getOpenSessions(sessions).map((session) => session.colorSlot))

  for (let index = 0; index < SESSION_COLOR_VARS.length; index += 1) {
    if (!usedSlots.has(index)) {
      return index
    }
  }

  return null
}

function findAvailableSlotIndices(sessions: Session[], count: number) {
  const usedSlots = new Set(
    getOpenMemos(sessions)
      .map((memo) => memo.slotIndex)
      .filter((slotIndex): slotIndex is number => slotIndex !== null),
  )

  const available: number[] = []

  for (let index = 0; index < SLOT_PERCENTAGES.length; index += 1) {
    if (!usedSlots.has(index)) {
      available.push(index)
    }

    if (available.length === count) {
      return available
    }
  }

  return null
}

function clearSelections(sessions: Session[]) {
  return sessions.map((session) => ({
    ...session,
    selectionState: 'idle' as SessionSelectionState,
    memos: session.memos.map((memo) =>
      memo.uiState === 'editing' ? memo : { ...memo, uiState: 'idle' as MemoUiState },
    ),
  }))
}

function App() {
  const [clickThrough, setClickThrough] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([])
  const [isComposing, setIsComposing] = useState(false)

  const idCounterRef = useRef({ session: 1, memo: 1 })
  const editorRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})
  const interactionRef = useRef<Interaction | null>(null)
  const dragExceededRef = useRef(false)
  const draftContentRef = useRef<Record<string, string>>({})
  const cardRefs = useRef<Record<string, HTMLElement | null>>({})

  const getMemoIdentity = (sessionId: string, memoId: string) => `${sessionId}:${memoId}`

  const createMemo = (slotIndex: number, selected = false): Memo => {
    const memoId = nextId('memo', idCounterRef.current.memo++)
    draftContentRef.current[memoId] = ''

    return {
      id: memoId,
      content: '',
      savedContent: '',
      uiState: selected ? 'memo_selected' : 'idle',
      isVisible: true,
      isDirty: false,
      position: getSlotPosition(slotIndex),
      size: { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT },
      slotIndex,
      editingKey: 0,
    }
  }

  const createSession = (memoCount: number, previousSessions: Session[]) => {
    if (memoCount < 1 || memoCount > 9) {
      return null
    }

    const openSessionCount = getOpenSessions(previousSessions).length
    const openMemoCount = getOpenMemos(previousSessions).length

    if (
      openSessionCount + 1 > MAX_OPEN_SESSIONS ||
      openMemoCount + memoCount > MAX_OPEN_MEMOS
    ) {
      return null
    }

    const colorSlot = findUnusedColorSlot(previousSessions)
    const slotIndices = findAvailableSlotIndices(previousSessions, memoCount)

    if (colorSlot === null || slotIndices === null) {
      return null
    }

    const sessionId = nextId('session', idCounterRef.current.session++)

    return {
      id: sessionId,
      colorSlot,
      isOpen: true,
      selectionState: 'idle' as SessionSelectionState,
      memos: slotIndices.map((slotIndex, index) => createMemo(slotIndex, index === 0)),
    } satisfies Session
  }

  const getEditingMemo = (currentSessions: Session[]) => {
    for (const session of currentSessions) {
      for (const memo of session.memos) {
        if (memo.uiState === 'editing') {
          return { session, memo }
        }
      }
    }

    return null
  }

  const getSelectedMemo = (currentSessions: Session[]) => {
    for (const session of currentSessions) {
      for (const memo of session.memos) {
        if (memo.uiState === 'memo_selected') {
          return { session, memo }
        }
      }
    }

    return null
  }

  const commitEditorValue = (sessionId: string, memoId: string) => {
    const textarea = editorRefs.current[memoId]
    const nextValue = textarea?.value ?? draftContentRef.current[memoId] ?? ''
    draftContentRef.current[memoId] = nextValue

    setSessions((currentSessions) =>
      currentSessions.map((session) =>
        session.id !== sessionId
          ? session
          : {
              ...session,
              memos: session.memos.map((memo) =>
                memo.id !== memoId
                  ? memo
                  : {
                      ...memo,
                      content: nextValue,
                      isDirty: nextValue !== memo.savedContent,
                    },
              ),
            },
      ),
    )
  }

  const saveMemo = (sessionId: string, memoId: string) => {
    const textarea = editorRefs.current[memoId]
    const nextValue = textarea?.value ?? draftContentRef.current[memoId] ?? ''
    draftContentRef.current[memoId] = nextValue

    setSessions((currentSessions) =>
      currentSessions.map((session) =>
        session.id !== sessionId
          ? session
          : {
              ...session,
              memos: session.memos.map((memo) =>
                memo.id !== memoId
                  ? memo
                  : {
                      ...memo,
                      content: nextValue,
                      savedContent: nextValue,
                      isDirty: false,
                    },
              ),
            },
      ),
    )
  }

  useEffect(() => {
    const unlisten = Promise.all([
      listen<boolean>('session://open-single', (event) => {
        if (!event.payload) {
          return
        }

        setSessions((currentSessions) => {
          const nextSessions = clearSelections(currentSessions)
          const created = createSession(1, nextSessions)

          return created ? [...nextSessions, created] : nextSessions
        })
      }),
      listen<MultiOpenPayload>('session://open-multi', (event) => {
        const memoCount = Number(event.payload.count)

        if (!Number.isInteger(memoCount) || memoCount < 2 || memoCount > 9) {
          return
        }

        setSessions((currentSessions) => {
          const nextSessions = clearSelections(currentSessions)
          const created = createSession(memoCount, nextSessions)

          return created ? [...nextSessions, created] : nextSessions
        })
      }),
      ...(import.meta.env.DEV
        ? [
            listen<boolean>('overlay://clickthrough', (event) => {
              setClickThrough(event.payload)
            }),
          ]
        : []),
    ])

    return () => {
      void unlisten.then((handlers) => {
        handlers.forEach((dispose) => dispose())
      })
    }
  }, [])

  useEffect(() => {
    const editingEntry = getEditingMemo(sessions)

    if (!editingEntry) {
      return
    }

    const editor = editorRefs.current[editingEntry.memo.id]
    if (!editor) {
      return
    }

    editor.focus()
    editor.setSelectionRange(editor.value.length, editor.value.length)
  }, [sessions])

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

            setSessions((currentSessions) =>
              currentSessions.map((session) =>
                session.id !== interaction.sessionId
                  ? session
                  : {
                      ...session,
                      memos: session.memos.map((memo) =>
                        memo.id !== interaction.memoId
                          ? memo
                          : {
                              ...memo,
                              slotIndex: null,
                            },
                      ),
                    },
              ),
            )
          }

        setSessions((currentSessions) =>
          currentSessions.map((session) =>
            session.id !== interaction.sessionId
              ? session
              : {
                  ...session,
                  memos: session.memos.map((memo) =>
                    memo.id !== interaction.memoId
                      ? memo
                      : {
                          ...memo,
                          position: {
                            x: interaction.originX + deltaX,
                            y: interaction.originY + deltaY,
                          },
                        },
                  ),
                },
          ),
        )
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

      setSessions((currentSessions) =>
        currentSessions.map((session) =>
          session.id !== interaction.sessionId
            ? session
            : {
                ...session,
                memos: session.memos.map((memo) =>
                  memo.id !== interaction.memoId
                    ? memo
                    : {
                        ...memo,
                        position: { x: nextX, y: nextY },
                        size: { width: nextWidth, height: nextHeight },
                      },
                ),
              },
        ),
      )
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
      const editingEntry = getEditingMemo(sessions)
      const selectedEntry = getSelectedMemo(sessions)

      const isSaveShortcut = event.metaKey && event.key.toLowerCase() === 's'
      const isCommitShortcut = event.metaKey && event.key === 'Enter'

      if (editingEntry) {
        if (isSaveShortcut) {
          event.preventDefault()
          saveMemo(editingEntry.session.id, editingEntry.memo.id)
          return
        }

        if (isCommitShortcut) {
          event.preventDefault()
          saveMemo(editingEntry.session.id, editingEntry.memo.id)
          setSessions((currentSessions) =>
            currentSessions.map((session) =>
              session.id !== editingEntry.session.id
                ? session
                : {
                    ...session,
                    memos: session.memos.map((memo) =>
                      memo.id !== editingEntry.memo.id
                        ? memo
                        : {
                            ...memo,
                            isVisible: false,
                            uiState: 'idle',
                          },
                    ),
                  },
            ),
          )
          return
        }

        if (event.key === 'Escape') {
          event.preventDefault()
          commitEditorValue(editingEntry.session.id, editingEntry.memo.id)
          setSessions((currentSessions) =>
            currentSessions.map((session) =>
              session.id !== editingEntry.session.id
                ? session
                : {
                    ...session,
                    memos: session.memos.map((memo) =>
                      memo.id !== editingEntry.memo.id
                        ? memo
                        : {
                            ...memo,
                            uiState: 'idle',
                          },
                    ),
                  },
            ),
          )
        }

        return
      }

      if (isComposing) {
        return
      }

      if (selectedEntry && isSaveShortcut) {
        event.preventDefault()
        saveMemo(selectedEntry.session.id, selectedEntry.memo.id)
        return
      }

      if (selectedEntry && isCommitShortcut) {
        event.preventDefault()
        saveMemo(selectedEntry.session.id, selectedEntry.memo.id)
        setSessions((currentSessions) =>
          currentSessions.map((session) =>
            session.id !== selectedEntry.session.id
              ? session
              : {
                  ...session,
                  memos: session.memos.map((memo) =>
                    memo.id !== selectedEntry.memo.id
                      ? memo
                      : {
                          ...memo,
                          isVisible: false,
                          uiState: 'idle',
                        },
                  ),
                },
          ),
        )
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        setSessions((currentSessions) => clearSelections(currentSessions))
      }

      if (selectedEntry && event.key === 'Enter') {
        event.preventDefault()
        setSessions((currentSessions) =>
          currentSessions.map((session) =>
            session.id !== selectedEntry.session.id
              ? session
              : {
                  ...session,
                  memos: session.memos.map((memo) =>
                    memo.id !== selectedEntry.memo.id
                      ? memo
                      : {
                          ...memo,
                          uiState: 'editing',
                          editingKey: memo.editingKey + 1,
                        },
                  ),
                },
          ),
        )
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isComposing, sessions])

  const handleMemoPointerDown =
    (sessionId: string, memoId: string) => (event: React.PointerEvent<HTMLElement>) => {
      const editingEntry = getEditingMemo(sessions)
      if (editingEntry && editingEntry.memo.id !== memoId) {
        commitEditorValue(editingEntry.session.id, editingEntry.memo.id)
      }

      const targetSession = sessions.find((session) => session.id === sessionId)
      const targetMemo = targetSession?.memos.find((memo) => memo.id === memoId)

      if (!targetSession || !targetMemo || targetMemo.uiState === 'editing') {
        return
      }

      interactionRef.current = {
        type: 'drag',
        sessionId,
        memoId,
        startX: event.clientX,
        startY: event.clientY,
        originX: targetMemo.position.x,
        originY: targetMemo.position.y,
        active: false,
      }
      dragExceededRef.current = false
    }

  const handleMemoClick =
    (sessionId: string, memoId: string) => (event: React.MouseEvent<HTMLElement>) => {
      if (dragExceededRef.current) {
        dragExceededRef.current = false
        return
      }

      event.stopPropagation()

      setSessions((currentSessions) =>
        clearSelections(currentSessions).map((session) =>
          session.id !== sessionId
            ? session
            : {
                ...session,
                memos: session.memos.map((memo) =>
                  memo.id !== memoId
                    ? memo
                    : {
                        ...memo,
                        uiState: 'memo_selected',
                      },
                ),
              },
        ),
      )
    }

  const handleMemoDoubleClick =
    (sessionId: string, memoId: string) => (event: React.MouseEvent<HTMLElement>) => {
      if (dragExceededRef.current) {
        dragExceededRef.current = false
        return
      }

      event.stopPropagation()

      setSessions((currentSessions) =>
        clearSelections(currentSessions).map((session) =>
          session.id !== sessionId
            ? session
            : {
                ...session,
                memos: session.memos.map((memo) =>
                  memo.id !== memoId
                    ? memo
                    : {
                        ...memo,
                        uiState: 'editing',
                        editingKey: memo.editingKey + 1,
                      },
                ),
              },
        ),
      )
    }

  const handleShellPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    const clickedInsideMemo = Object.values(cardRefs.current).some((card) =>
      card?.contains(event.target as Node),
    )

    if (clickedInsideMemo) {
      return
    }

    const editingEntry = getEditingMemo(sessions)
    if (editingEntry) {
      commitEditorValue(editingEntry.session.id, editingEntry.memo.id)
    }

    setSessions((currentSessions) => clearSelections(currentSessions))
  }

  const handleResizePointerDown =
    (sessionId: string, memoId: string, direction: ResizeDirection) =>
    (event: React.PointerEvent<HTMLButtonElement>) => {
      event.stopPropagation()

      const targetSession = sessions.find((session) => session.id === sessionId)
      const targetMemo = targetSession?.memos.find((memo) => memo.id === memoId)
      if (!targetMemo) {
        return
      }

      interactionRef.current = {
        type: 'resize',
        sessionId,
        memoId,
        direction,
        startX: event.clientX,
        startY: event.clientY,
        originX: targetMemo.position.x,
        originY: targetMemo.position.y,
        originWidth: targetMemo.size.width,
        originHeight: targetMemo.size.height,
      }
      dragExceededRef.current = true

      setSessions((currentSessions) =>
        clearSelections(currentSessions).map((session) =>
          session.id !== sessionId
            ? session
            : {
                ...session,
                memos: session.memos.map((memo) =>
                  memo.id !== memoId
                    ? memo
                    : {
                        ...memo,
                        uiState: 'memo_selected',
                        slotIndex: null,
                      },
                ),
              },
        ),
      )
    }

  return (
    <main className="overlay-shell" onPointerDown={handleShellPointerDown}>
      {sessions
        .filter((session) => session.isOpen)
        .flatMap((session) =>
          session.memos
            .filter((memo) => memo.isVisible)
            .map((memo) => {
              const isSelected = memo.uiState === 'memo_selected' || memo.uiState === 'editing'
              const isEditing = memo.uiState === 'editing'

              return (
                <article
                  key={getMemoIdentity(session.id, memo.id)}
                  ref={(node) => {
                    cardRefs.current[getMemoIdentity(session.id, memo.id)] = node
                  }}
                  className={`memo-card ${isSelected ? 'memo-card--selected' : ''} ${isEditing ? 'memo-card--editing' : ''}`}
                  style={{
                    transform: `translate(${memo.position.x}px, ${memo.position.y}px)`,
                    width: `${memo.size.width}px`,
                    height: `${memo.size.height}px`,
                    background: SESSION_COLOR_VARS[session.colorSlot],
                  }}
                  onPointerDown={handleMemoPointerDown(session.id, memo.id)}
                  onClick={handleMemoClick(session.id, memo.id)}
                  onDoubleClick={handleMemoDoubleClick(session.id, memo.id)}
                >
                  {isSelected ? <div className="memo-card__ring" /> : null}

                  <header className="memo-card__meta">
                    <span className="memo-card__badge">
                      {session.memos.length === 1 ? '1-note session' : `${session.memos.length}-note session`}
                    </span>
                    <span className="memo-card__status">
                      {isEditing
                        ? 'editing'
                        : memo.isDirty
                          ? 'dirty'
                          : clickThrough
                            ? 'click-through on'
                            : memo.uiState === 'memo_selected'
                              ? 'selected'
                              : 'ready'}
                    </span>
                  </header>

                  <div className="memo-card__body">
                    {isEditing ? (
                      <textarea
                        key={`${memo.id}-${memo.editingKey}`}
                        ref={(node) => {
                          editorRefs.current[memo.id] = node
                        }}
                        className="memo-card__editor"
                        defaultValue={memo.content}
                        onChange={(event) => {
                          if (!isComposing) {
                            const nextValue = event.currentTarget.value
                            draftContentRef.current[memo.id] = nextValue

                            setSessions((currentSessions) =>
                              currentSessions.map((currentSession) =>
                                currentSession.id !== session.id
                                  ? currentSession
                                  : {
                                      ...currentSession,
                                      memos: currentSession.memos.map((currentMemo) =>
                                        currentMemo.id !== memo.id
                                          ? currentMemo
                                          : {
                                              ...currentMemo,
                                              isDirty: nextValue !== currentMemo.savedContent,
                                            },
                                      ),
                                    },
                              ),
                            )
                          }
                        }}
                        onClick={(event) => event.stopPropagation()}
                        onCompositionStart={() => setIsComposing(true)}
                        onCompositionEnd={(event) => {
                          setIsComposing(false)
                          const nextValue = event.currentTarget.value
                          draftContentRef.current[memo.id] = nextValue

                          setSessions((currentSessions) =>
                            currentSessions.map((currentSession) =>
                              currentSession.id !== session.id
                                ? currentSession
                                : {
                                    ...currentSession,
                                    memos: currentSession.memos.map((currentMemo) =>
                                      currentMemo.id !== memo.id
                                        ? currentMemo
                                        : {
                                            ...currentMemo,
                                            isDirty: nextValue !== currentMemo.savedContent,
                                          },
                                    ),
                                  },
                            ),
                          )
                        }}
                        onBlur={() => commitEditorValue(session.id, memo.id)}
                      />
                    ) : (
                      <p
                        className={`memo-card__placeholder ${memo.content ? '' : 'memo-card__placeholder--empty'}`}
                      >
                        {memo.content || 'ここにメモを書く'}
                      </p>
                    )}
                  </div>

                  {import.meta.env.DEV ? (
                    <footer className="memo-card__footer">
                      <span>click: select / double click: edit</span>
                      <span>Cmd + S: save / Cmd + Enter: save and close</span>
                    </footer>
                  ) : null}

                  {isSelected ? (
                    <>
                      <button
                        className="memo-card__handle memo-card__handle--nw"
                        aria-label="resize north west"
                        onPointerDown={handleResizePointerDown(session.id, memo.id, 'nw')}
                      />
                      <button
                        className="memo-card__handle memo-card__handle--ne"
                        aria-label="resize north east"
                        onPointerDown={handleResizePointerDown(session.id, memo.id, 'ne')}
                      />
                      <button
                        className="memo-card__handle memo-card__handle--sw"
                        aria-label="resize south west"
                        onPointerDown={handleResizePointerDown(session.id, memo.id, 'sw')}
                      />
                      <button
                        className="memo-card__handle memo-card__handle--se"
                        aria-label="resize south east"
                        onPointerDown={handleResizePointerDown(session.id, memo.id, 'se')}
                      />
                    </>
                  ) : null}
                </article>
              )
            }),
        )}

      {import.meta.env.DEV ? (
        <aside className="runtime-badge">
          <span className="runtime-badge__dot" />
          <span>{clickThrough ? 'through' : 'overlay'}</span>
        </aside>
      ) : null}
    </main>
  )
}

export default App
