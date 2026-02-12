import { useState, useEffect } from 'react'
import { Trophy, Plus, Minus, Medal, Users } from 'lucide-react'
import Layout from '../components/Layout'
import Avatar from '../components/Avatar'
import { useAuth } from '../context/AuthContext'
import { artilhariaApi, rachasApi } from '../services/api'

export default function Artilharia() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [artilheiros, setArtilheiros] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('gols')
  const [rachaId, setRachaId] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const rachasRes = await rachasApi.list()
        const first = rachasRes.data?.[0]
        if (first) {
          setRachaId(first.id)
          const res = await artilhariaApi.list(first.id)
          const list = res.data || []
          list.sort((a, b) => b.gols - a.gols)
          setArtilheiros(list)
        } else {
          setArtilheiros([])
        }
      } catch (e) {
        console.error(e)
        setArtilheiros([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    setArtilheiros((prev) => {
      const sorted = [...prev]
      sorted.sort((a, b) => (tab === 'gols' ? b.gols - a.gols : b.assistencias - a.assistencias))
      return sorted
    })
  }, [tab])

  const updateValue = async (atletaId, increment) => {
    if (!isAdmin || !rachaId) return
    const item = artilheiros.find((a) => a.atleta_id === atletaId)
    if (!item) return
    const current = tab === 'gols' ? item.gols : item.assistencias
    const next = Math.max(0, current + (increment ? 1 : -1))
    const payload = tab === 'gols' ? { gols: next } : { assistencias: next }
    try {
      await artilhariaApi.update(rachaId, atletaId, payload)
      setArtilheiros((prev) => {
        const updated = prev.map((a) => a.atleta_id === atletaId ? { ...a, ...payload } : a)
        updated.sort((a, b) => (tab === 'gols' ? b.gols - a.gols : b.assistencias - a.assistencias))
        return updated
      })
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) {
    return (
      <Layout title="Ranking" showBack>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Ranking" showBack>
      <div className="space-y-6 max-w-2xl mx-auto">
        <header className="bg-gray-900/40 p-6 rounded-3xl border border-gray-800 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center">
              {tab === 'gols' ? <Trophy size={28} /> : <Users size={28} />}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Ranking de {tab === 'gols' ? 'Gols' : 'Assistencias'}</h1>
              <p className="text-xs text-gray-500 font-medium">Temporada Atual</p>
            </div>
          </div>
          <Medal className="text-amber-500/40" size={32} />
        </header>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('gols')}
            className={`px-4 py-2 rounded-full border text-xs font-bold uppercase tracking-wider ${
              tab === 'gols'
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-gray-900/40 text-gray-300 border-gray-800'
            }`}
          >
            Gols
          </button>
          <button
            onClick={() => setTab('assistencias')}
            className={`px-4 py-2 rounded-full border text-xs font-bold uppercase tracking-wider ${
              tab === 'assistencias'
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-gray-900/40 text-gray-300 border-gray-800'
            }`}
          >
            Assistencias
          </button>
        </div>

        <div className="bg-gray-900/40 rounded-[2.5rem] border border-gray-800 overflow-hidden divide-y divide-gray-800/70">
          {artilheiros.map((atleta, index) => (
            <div key={atleta.atleta_id} className="p-4 flex items-center gap-4 hover:bg-gray-800/50 transition-colors">
              <div className="w-6 text-center text-sm font-bold text-gray-500">
                {index + 1}
              </div>

              <div className="relative">
                <Avatar name={atleta.apelido || atleta.nome} size="md" src={atleta.foto_url} />
              </div>

              <div className="flex-1">
                <h3 className="font-bold text-white leading-tight">{atleta.apelido || atleta.nome}</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{atleta.posicao || '-'}</p>
              </div>

              <div className="flex items-center gap-4">
                {isAdmin && (
                  <div className="flex items-center gap-1 bg-gray-800 p-1 rounded-xl">
                    <button
                      onClick={() => updateValue(atleta.atleta_id, false)}
                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Minus size={16} />
                    </button>
                    <button
                      onClick={() => updateValue(atleta.atleta_id, true)}
                      className="w-8 h-8 flex items-center justify-center text-emerald-400 hover:scale-110 transition-transform"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                )}
                <div className="text-2xl font-black text-white w-8 text-right">
                  {tab === 'gols' ? atleta.gols : atleta.assistencias}
                </div>
              </div>
            </div>
          ))}
        </div>

        {artilheiros.length === 0 && (
          <div className="text-center py-20">
            <Trophy size={48} className="mx-auto text-gray-700 mb-4" />
            <p className="text-gray-400">Nenhum atleta encontrado.</p>
          </div>
        )}
      </div>
    </Layout>
  )
}
