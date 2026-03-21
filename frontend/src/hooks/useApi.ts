import { useState, useCallback } from 'react'
import type { AxiosError } from 'axios'

interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

interface UseApiReturn<T, A extends unknown[]> extends UseApiState<T> {
  execute: (...args: A) => Promise<T>
}

export function useApi<T, A extends unknown[]>(
  apiFunc: (...args: A) => Promise<{ data: T }>,
): UseApiReturn<T, A> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  })

  const execute = useCallback(
    async (...args: A): Promise<T> => {
      setState((prev) => ({ ...prev, loading: true, error: null }))
      try {
        const response = await apiFunc(...args)
        setState({ data: response.data, loading: false, error: null })
        return response.data
      } catch (err) {
        const axiosErr = err as AxiosError<{ detail?: string }>
        const message = axiosErr.response?.data?.detail ?? axiosErr.message
        setState((prev) => ({ ...prev, loading: false, error: message }))
        throw err
      }
    },
    [apiFunc],
  )

  return { ...state, execute }
}
