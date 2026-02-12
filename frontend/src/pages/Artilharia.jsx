import { useState, useEffect } from 'react'
import { Trophy, Plus, Minus, Medal } from 'lucide-react'
import Layout from '../components/Layout'
import Avatar from '../components/Avatar'
import { useAuth } from '../context/AuthContext'

export default function Artilharia() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [artilheiros, setArtilheiros] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => {
      setArtilheiros([
        { id: 1, nome: 'Danilo Silva', apelido: 'Danilo', gols: 4, posicao: 'atacante', clube_mock: 'https://logo.clearbit.com/botafogo.com.br' },
        { id: 2, nome: 'Carlos Vinicius', apelido: 'Carlos Vinicius', gols: 4, posicao: 'atacante', clube_mock: 'https://logo.clearbit.com/gremio.net' },
        { id: 3, nome: 'Breno Lopes', apelido: 'Breno Lopes', gols: 3, posicao: 'atacante', clube_mock: 'https://logo.clearbit.com/coritiba.com.br' },
        { id: 4, nome: 'Walter Clar', apelido: 'Walter Clar', gols: 2, posicao: 'lateral', clube_mock: 'https://logo.clearbit.com/chapecoense.com' },
      ].sort((a, b) => b.gols - a.gols))
      setLoading(false)
    }, 500)
    return () => clearTimeout(t)
  }, [])

  const updateGols = (id, increment) => {
    if (!isAdmin) return
    setArtilheiros(prev =>
      prev.map(a => a.id === id ? { ...a, gols: Math.max(0, a.gols + (increment ? 1 : -1)) } : a)
        .sort((a, b) => b.gols - a.gols)
    )
  }

  if (loading) {
    return (
      <Layout title="Artilharia" showBack>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Artilharia" showBack>
      <div className="space-y-6 max-w-2xl mx-auto">
        <header className="bg-gray-900/40 p-6 rounded-3xl border border-gray-800 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center">
              <Trophy size={28} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Ranking de Gols</h1>
              <p className="text-xs text-gray-500 font-medium">Temporada Atual</p>
            </div>
          </div>
          <Medal className="text-amber-500/40" size={32} />
        </header>

        <div className="bg-gray-900/40 rounded-[2.5rem] border border-gray-800 overflow-hidden divide-y divide-gray-800/70">
          {artilheiros.map((atleta, index) => (
            <div key={atleta.id} className="p-4 flex items-center gap-4 hover:bg-gray-800/50 transition-colors">
              <div className="w-6 text-center text-sm font-bold text-gray-500">
                {index + 1}
              </div>

              <div className="relative">
                <Avatar name={atleta.apelido} size="md" src={atleta.foto_url} />
                {atleta.clube_mock && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gray-900 rounded-full border border-gray-800 flex items-center justify-center p-0.5 shadow-sm overflow-hidden">
                    <img src={atleta.clube_mock} alt="clube" className="w-full h-full object-contain" />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h3 className="font-bold text-white leading-tight">{atleta.apelido}</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{atleta.posicao}</p>
              </div>

              <div className="flex items-center gap-4">
                {isAdmin && (
                  <div className="flex items-center gap-1 bg-gray-800 p-1 rounded-xl">
                    <button
                      onClick={() => updateGols(atleta.id, false)}
                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Minus size={16} />
                    </button>
                    <button
                      onClick={() => updateGols(atleta.id, true)}
                      className="w-8 h-8 flex items-center justify-center text-emerald-400 hover:scale-110 transition-transform"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                )}
                <div className="text-2xl font-black text-white w-8 text-right">
                  {atleta.gols}
                </div>
              </div>
            </div>
          ))}
        </div>

        {artilheiros.length === 0 && (
          <div className="text-center py-20">
            <Trophy size={48} className="mx-auto text-gray-700 mb-4" />
            <p className="text-gray-400">Nenhum gol marcado ainda.</p>
          </div>
        )}
      </div>
    </Layout>
  )
}
