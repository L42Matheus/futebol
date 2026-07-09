export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished'

export interface LocalTimerState {
  durationSeconds: number
  remainingSeconds: number
  status: TimerStatus
  startedAt: number | null
  updatedAt: number
}

export const TIMER_STORAGE_KEY = 'quemjogafc:local_timer'
export const TIMER_UPDATED_EVENT = 'quemjogafc:local_timer_updated'
export const DEFAULT_TIMER_SECONDS = 10 * 60

function normalizeSeconds(value: unknown, fallback: number): number {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return fallback
  return Math.max(0, Math.floor(numberValue))
}

export function getDefaultTimerState(): LocalTimerState {
  return {
    durationSeconds: DEFAULT_TIMER_SECONDS,
    remainingSeconds: DEFAULT_TIMER_SECONDS,
    status: 'idle',
    startedAt: null,
    updatedAt: Date.now(),
  }
}

export function resolveTimerState(state: LocalTimerState): LocalTimerState {
  if (state.status !== 'running' || !state.startedAt) return state

  const elapsedSeconds = Math.floor((Date.now() - state.startedAt) / 1000)
  const remainingSeconds = Math.max(0, state.remainingSeconds - elapsedSeconds)

  if (remainingSeconds === 0) {
    return {
      ...state,
      remainingSeconds: 0,
      status: 'finished',
      startedAt: null,
      updatedAt: Date.now(),
    }
  }

  return {
    ...state,
    remainingSeconds,
    startedAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export function readTimerState(): LocalTimerState {
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY)
    if (!raw) return getDefaultTimerState()

    const parsed = JSON.parse(raw) as Partial<LocalTimerState>
    const durationSeconds = normalizeSeconds(parsed.durationSeconds, DEFAULT_TIMER_SECONDS)
    const remainingSeconds = normalizeSeconds(parsed.remainingSeconds, durationSeconds)
    const status: TimerStatus =
      parsed.status === 'running' || parsed.status === 'paused' || parsed.status === 'finished'
        ? parsed.status
        : 'idle'

    return resolveTimerState({
      durationSeconds,
      remainingSeconds: Math.min(remainingSeconds, durationSeconds),
      status,
      startedAt: typeof parsed.startedAt === 'number' ? parsed.startedAt : null,
      updatedAt: normalizeSeconds(parsed.updatedAt, Date.now()),
    })
  } catch {
    return getDefaultTimerState()
  }
}

export function saveTimerState(state: LocalTimerState): LocalTimerState {
  const resolved = resolveTimerState(state)
  localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(resolved))
  window.dispatchEvent(new Event(TIMER_UPDATED_EVENT))
  return resolved
}

export function setTimerDuration(minutes: number): LocalTimerState {
  const durationSeconds = Math.max(60, Math.floor(minutes * 60))
  return saveTimerState({
    durationSeconds,
    remainingSeconds: durationSeconds,
    status: 'idle',
    startedAt: null,
    updatedAt: Date.now(),
  })
}

export function startTimer(): LocalTimerState {
  const current = readTimerState()
  const remainingSeconds = current.remainingSeconds > 0 ? current.remainingSeconds : current.durationSeconds

  return saveTimerState({
    ...current,
    remainingSeconds,
    status: 'running',
    startedAt: Date.now(),
    updatedAt: Date.now(),
  })
}

export function pauseTimer(): LocalTimerState {
  const current = readTimerState()
  return saveTimerState({
    ...current,
    status: current.remainingSeconds === 0 ? 'finished' : 'paused',
    startedAt: null,
    updatedAt: Date.now(),
  })
}

export function resetTimer(): LocalTimerState {
  const current = readTimerState()
  return saveTimerState({
    ...current,
    remainingSeconds: current.durationSeconds,
    status: 'idle',
    startedAt: null,
    updatedAt: Date.now(),
  })
}

export function formatTimer(seconds: number): string {
  const safeSeconds = Math.max(0, seconds)
  const minutes = Math.floor(safeSeconds / 60)
  const remainingSeconds = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}
