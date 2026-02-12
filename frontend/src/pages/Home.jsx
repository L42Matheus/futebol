import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Users, ChevronRight, Trash2 } from 'lucide-react'
import { rachasApi } from '../services/api'

export default function Home() {
  const [rachas, setRachas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadRachas() }, [])

  async function loadRachas() {
    try {
      const response = await rachasApi.list()
      setRachas(response.data)
    } catch (error) {
      console.error('Erro ao carregar rachas:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(e, rachaId) {
    e.preventDefault()
    const ok = window.confirm('Excluir este racha?')
    if (!ok) return
    try {
      await rachasApi.delete(rachaId)
      loadRachas()
    } catch (error) {
      console.error('Erro ao excluir racha:', error)
      alert('Erro ao excluir racha.')
    }
  }

  const tipoLabels = { campo: 'Campo (11x11)', society: 'Society (7x7)', futsal: 'Futsal (5x5)' }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Meus Rachas</h1>
        <Link to="/novo" className="btn-primary flex items-center gap-2"><Plus size={20} />Novo Racha</Link>
      </div>
      {rachas.length === 0 ? (
        <div className="card text-center py-12">
          <Users size={48} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-medium text-gray-900 mb-2">Nenhum racha cadastrado</h2>
          <p className="text-gray-500 mb-4">Crie seu primeiro racha para começar a organizar</p>
          <Link to="/novo" className="btn-primary inline-flex items-center gap-2"><Plus size={20} />Criar Racha</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {rachas.map((racha) => (
            <Link key={racha.id} to={`/racha/${racha.id}`} className="card flex items-center justify-between hover:shadow-md transition-shadow">
              <div>
                <h2 className="font-semibold text-gray-900">{racha.nome}</h2>
                <p className="text-sm text-gray-500">{tipoLabels[racha.tipo]} - {racha.total_atletas}/{racha.max_atletas} atletas</p>
              </div>
              <div className="flex items-center gap-2">
                {racha.is_admin && (
                  <button
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    onClick={(e) => handleDelete(e, racha.id)}
                    title="Excluir racha"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <ChevronRight className="text-gray-400" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
