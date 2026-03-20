import test from 'node:test'
import assert from 'node:assert/strict'

function createLocalStorageMock() {
  const store = new Map()
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null
    },
    setItem(key, value) {
      store.set(key, String(value))
    },
    removeItem(key) {
      store.delete(key)
    },
    clear() {
      store.clear()
    },
  }
}

globalThis.localStorage = createLocalStorageMock()

const apiModule = await import('./api.js')
const api = apiModule.default
const { authApi } = apiModule
const authModule = await import('./auth.js')
const authService = authModule.default

function resetState() {
  localStorage.clear()
  authService.clearCache()
  authService.logout()
  delete api.defaults.headers.common.Authorization
}

test('authService.login stores token, session and cached user', async () => {
  resetState()
  const originalLogin = authApi.login
  authApi.login = async () => ({
    data: {
      access_token: 'token-123',
      user: { id: 1, nome: 'Maria' },
    },
  })

  try {
    const response = await authService.login('maria@example.com', 'segredo')

    assert.equal(response.access_token, 'token-123')
    assert.equal(localStorage.getItem('auth_token'), 'token-123')
    assert.match(localStorage.getItem('session_id'), /^\d+-/)
    assert.deepEqual(JSON.parse(localStorage.getItem('cached_user')).user, {
      id: 1,
      nome: 'Maria',
    })
    assert.equal(api.defaults.headers.common.Authorization, 'Bearer token-123')
  } finally {
    authApi.login = originalLogin
    resetState()
  }
})

test('authService.getCurrentUser returns fresh cached user without calling the API', async () => {
  resetState()
  const cachedUser = { id: 3, nome: 'Joao' }
  const originalMe = authApi.me
  let apiCalled = false

  localStorage.setItem(
    'cached_user',
    JSON.stringify({ user: cachedUser, timestamp: Date.now() })
  )

  authApi.me = async () => {
    apiCalled = true
    return { data: { id: 999 } }
  }

  try {
    const user = await authService.getCurrentUser()
    assert.deepEqual(user, cachedUser)
    assert.equal(apiCalled, false)
  } finally {
    authApi.me = originalMe
    resetState()
  }
})
