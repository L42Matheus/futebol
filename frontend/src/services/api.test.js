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
const { formatDateBR, normalizeJogoPayload, rachasApi } = apiModule

test('formatDateBR formats Date instances to dd/mm/yyyy', () => {
  const formatted = formatDateBR(new Date('2026-03-12T10:00:00Z'))
  assert.equal(formatted, '12/03/2026')
})

test('normalizeJogoPayload converts ISO date strings and removes empty field value', () => {
  const payload = normalizeJogoPayload({
    data_hora: '2026-03-12T19:30:00',
    valor_campo: '',
    local: 'Arena',
  })

  assert.deepEqual(payload, {
    data_hora: '12/03/2026',
    local: 'Arena',
  })
})

test('rachasApi.update forwards the request payload', async () => {
  const originalPatch = api.patch
  const payload = { nome: 'Quinta FC' }

  api.patch = async (url, data) => ({ url, data })

  try {
    const response = await rachasApi.update(7, payload)
    assert.deepEqual(response, { url: '/rachas/7', data: payload })
  } finally {
    api.patch = originalPatch
  }
})
