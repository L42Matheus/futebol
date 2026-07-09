import { useEffect, useState } from 'react'
import {
  pauseTimer,
  readTimerState,
  resetTimer,
  setTimerDuration,
  startTimer,
  TIMER_UPDATED_EVENT,
  type LocalTimerState,
} from '../utils/localTimer'

export function useLocalTimer() {
  const [timer, setTimer] = useState<LocalTimerState>(() => readTimerState())

  useEffect(() => {
    function syncTimer() {
      setTimer(readTimerState())
    }

    window.addEventListener(TIMER_UPDATED_EVENT, syncTimer)
    window.addEventListener('storage', syncTimer)

    const intervalId = window.setInterval(syncTimer, 1000)

    return () => {
      window.removeEventListener(TIMER_UPDATED_EVENT, syncTimer)
      window.removeEventListener('storage', syncTimer)
      window.clearInterval(intervalId)
    }
  }, [])

  return {
    timer,
    setDuration: (minutes: number) => setTimer(setTimerDuration(minutes)),
    start: () => setTimer(startTimer()),
    pause: () => setTimer(pauseTimer()),
    reset: () => setTimer(resetTimer()),
  }
}
