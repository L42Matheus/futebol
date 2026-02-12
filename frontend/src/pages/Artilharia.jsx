import { useState, useEffect } from 'react'
import { Trophy } from 'lucide-react'
import Layout from '../components/Layout'

export default function Artilharia() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])

  useEffect(() => {
    const t = setTimeout(() => {
      setItems([])
      setLoading(false)
    }, 300)
    return () => clearTimeout(t)
  }, [])

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
        <header className="bg-gray-900/40 p-6 rounded-3xl border border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center">
              <Trophy size={28} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Ranking de Gols</h1>
              <p className="text-xs text-gray-500 font-medium">Temporada Atual</p>
            </div>
          </div>
        </header>

        {items.length === 0 && (
          <div className="text-center py-20">
            <Trophy size={48} className="mx-auto text-gray-700 mb-4" />
            <p className="text-gray-400">Nenhum gol marcado ainda.</p>
          </div>
        )}
      </div>
    </Layout>
  )
}
