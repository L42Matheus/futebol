import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type AccountType = 'ATLETA' | 'ADMIN'

type AccountTypeContextValue = {
  accountType: AccountType | null
  setAccountType: (value: AccountType | null) => void
}

const AccountTypeContext = createContext<AccountTypeContextValue | null>(null)

const STORAGE_KEY = 'account_type'

export function AccountTypeProvider({ children }: { children: ReactNode }) {
  const [accountType, setAccountTypeState] = useState<AccountType | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as AccountType | null
    if (stored === 'ATLETA' || stored === 'ADMIN') {
      setAccountTypeState(stored)
    }
  }, [])

  function setAccountType(value: AccountType | null) {
    if (value) {
      localStorage.setItem(STORAGE_KEY, value)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
    setAccountTypeState(value)
  }

  const ctx = useMemo(() => ({ accountType, setAccountType }), [accountType])

  return <AccountTypeContext.Provider value={ctx}>{children}</AccountTypeContext.Provider>
}

export function useAccountType() {
  const ctx = useContext(AccountTypeContext)
  if (!ctx) {
    throw new Error('useAccountType must be used within AccountTypeProvider')
  }
  return ctx
}
