import { useCallback, useEffect, useState, type TouchEvent } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { useRuntime } from '@blockhub/web-core'

type Board = number[][]

const SIZE = 4
const LS_BEST = 'blockhub_game_2048_best'

function emptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
}

function clone(b: Board): Board {
  return b.map((row) => [...row])
}

function cellsEmpty(b: Board): Array<[number, number]> {
  const out: Array<[number, number]> = []
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (b[r]![c] === 0) out.push([r, c])
    }
  }
  return out
}

function spawn(b: Board): Board {
  const empty = cellsEmpty(b)
  if (!empty.length) return b
  const next = clone(b)
  const [r, c] = empty[Math.floor(Math.random() * empty.length)]!
  next[r]![c] = Math.random() < 0.9 ? 2 : 4
  return next
}

function slideRowLeft(row: number[]): { row: number[]; gained: number } {
  const filtered = row.filter((n) => n !== 0)
  const merged: number[] = []
  let gained = 0
  let i = 0
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const v = filtered[i]! * 2
      merged.push(v)
      gained += v
      i += 2
    } else {
      merged.push(filtered[i]!)
      i += 1
    }
  }
  while (merged.length < SIZE) merged.push(0)
  return { row: merged, gained }
}

function moveLeft(b: Board): { board: Board; gained: number; moved: boolean } {
  let gained = 0
  let moved = false
  const next = b.map((row) => {
    const res = slideRowLeft(row)
    gained += res.gained
    if (res.row.some((v, i) => v !== row[i])) moved = true
    return res.row
  })
  return { board: next, gained, moved }
}

function transpose(b: Board): Board {
  return Array.from({ length: SIZE }, (_, c) => Array.from({ length: SIZE }, (_, r) => b[r]![c]!))
}

function reverseRows(b: Board): Board {
  return b.map((row) => [...row].reverse())
}

function move(b: Board, dir: 'left' | 'right' | 'up' | 'down'): { board: Board; gained: number; moved: boolean } {
  if (dir === 'left') return moveLeft(b)
  if (dir === 'right') {
    const rev = reverseRows(b)
    const res = moveLeft(rev)
    return { board: reverseRows(res.board), gained: res.gained, moved: res.moved }
  }
  if (dir === 'up') {
    const t = transpose(b)
    const res = moveLeft(t)
    return { board: transpose(res.board), gained: res.gained, moved: res.moved }
  }
  const t = transpose(b)
  const rev = reverseRows(t)
  const res = moveLeft(rev)
  return { board: transpose(reverseRows(res.board)), gained: res.gained, moved: res.moved }
}

function canMove(b: Board): boolean {
  if (cellsEmpty(b).length) return true
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      const v = b[r]![c]!
      if (c + 1 < SIZE && b[r]![c + 1] === v) return true
      if (r + 1 < SIZE && b[r + 1]![c] === v) return true
    }
  }
  return false
}

function tileColor(n: number): { bg: string; fg: string } {
  const map: Record<number, { bg: string; fg: string }> = {
    0: { bg: '#cdc1b4', fg: '#776e65' },
    2: { bg: '#eee4da', fg: '#776e65' },
    4: { bg: '#ede0c8', fg: '#776e65' },
    8: { bg: '#f2b179', fg: '#f9f6f2' },
    16: { bg: '#f59563', fg: '#f9f6f2' },
    32: { bg: '#f67c5f', fg: '#f9f6f2' },
    64: { bg: '#f65e3b', fg: '#f9f6f2' },
    128: { bg: '#edcf72', fg: '#f9f6f2' },
    256: { bg: '#edcc61', fg: '#f9f6f2' },
    512: { bg: '#edc850', fg: '#f9f6f2' },
    1024: { bg: '#edc53f', fg: '#f9f6f2' },
    2048: { bg: '#edc22e', fg: '#f9f6f2' },
  }
  return map[n] || { bg: '#3c3a32', fg: '#f9f6f2' }
}

function readBest(): number {
  try {
    return Number(localStorage.getItem(LS_BEST) || 0) || 0
  } catch {
    return 0
  }
}

function writeBest(n: number) {
  try {
    localStorage.setItem(LS_BEST, String(n))
  } catch {
    /* ignore */
  }
}

function newGame(): Board {
  return spawn(spawn(emptyBoard()))
}

export function Game2048Widget(_props: { node: SchemaNode }) {
  const { primaryColor } = useRuntime()
  const accent = primaryColor || '#edc22e'
  const [board, setBoard] = useState<Board>(() => newGame())
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => readBest())
  const [won, setWon] = useState(false)
  const [over, setOver] = useState(false)
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)

  const applyMove = useCallback((dir: 'left' | 'right' | 'up' | 'down') => {
    setBoard((prev) => {
      if (over) return prev
      const res = move(prev, dir)
      if (!res.moved) return prev
      const next = spawn(res.board)
      setScore((s) => {
        const ns = s + res.gained
        setBest((b) => {
          if (ns > b) {
            writeBest(ns)
            return ns
          }
          return b
        })
        return ns
      })
      if (!won && next.some((row) => row.some((c) => c >= 2048))) setWon(true)
      if (!canMove(next)) setOver(true)
      return next
    })
  }, [over, won])

  const reset = () => {
    setBoard(newGame())
    setScore(0)
    setWon(false)
    setOver(false)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, 'left' | 'right' | 'up' | 'down'> = {
        ArrowLeft: 'left',
        ArrowRight: 'right',
        ArrowUp: 'up',
        ArrowDown: 'down',
        a: 'left',
        d: 'right',
        w: 'up',
        s: 'down',
      }
      const dir = map[e.key] || map[e.key.toLowerCase()]
      if (!dir) return
      e.preventDefault()
      applyMove(dir)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [applyMove])

  const onTouchStart = (e: TouchEvent) => {
    const t = e.changedTouches[0]
    if (!t) return
    setTouchStart({ x: t.clientX, y: t.clientY })
  }

  const onTouchEnd = (e: TouchEvent) => {
    if (!touchStart) return
    const t = e.changedTouches[0]
    if (!t) return
    const dx = t.clientX - touchStart.x
    const dy = t.clientY - touchStart.y
    setTouchStart(null)
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return
    if (Math.abs(dx) > Math.abs(dy)) applyMove(dx > 0 ? 'right' : 'left')
    else applyMove(dy > 0 ? 'down' : 'up')
  }

  return (
    <div className="widget-panel game-2048" style={{ maxWidth: 420, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0 }}>2048</h3>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
            方向键 / WASD / 滑动合并相同数字
          </p>
        </div>
        <button type="button" className="btn" style={{ background: accent }} onClick={reset}>
          新开一局
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, background: '#bbada0', color: '#fff', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, opacity: 0.85 }}>分数</div>
          <strong style={{ fontSize: 20 }}>{score}</strong>
        </div>
        <div style={{ flex: 1, background: '#bbada0', color: '#fff', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, opacity: 0.85 }}>最高</div>
          <strong style={{ fontSize: 20 }}>{best}</strong>
        </div>
      </div>

      <div
        role="application"
        aria-label="2048 棋盘"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          position: 'relative',
          background: '#bbada0',
          borderRadius: 12,
          padding: 10,
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
            gap: 10,
          }}
        >
          {board.flatMap((row, r) =>
            row.map((n, c) => {
              const color = tileColor(n)
              return (
                <div
                  key={`${r}-${c}`}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 8,
                    background: color.bg,
                    color: color.fg,
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 800,
                    fontSize: n >= 1024 ? 22 : n >= 128 ? 26 : 30,
                  }}
                >
                  {n || ''}
                </div>
              )
            }),
          )}
        </div>

        {(won || over) && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 12,
              background: 'rgba(238,228,218,0.88)',
              display: 'grid',
              placeItems: 'center',
              textAlign: 'center',
              padding: 16,
            }}
          >
            <div>
              <p style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 800, color: '#776e65' }}>
                {over && !won ? '没有可合并的格子了' : '达成 2048！'}
              </p>
              <button type="button" className="btn" style={{ background: accent }} onClick={reset}>
                再来一局
              </button>
              {won && !over ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ marginLeft: 8 }}
                  onClick={() => setWon(false)}
                >
                  继续挑战
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
