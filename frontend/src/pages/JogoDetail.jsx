import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, X, Clock } from 'lucide-react'
import { jogosApi, presencasApi } from '../services/api'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function JogoDetail() {
  const { jogoId } = useParams()
  const navigate = useNavigate()
  const [jogo, setJogo] = useState(null)
  const [lista, setLista] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [jogoId])

  async function loadData() {
    try {
      const [jogoRes, listaRes] = await Promise.all([jogosApi.get(jogoId), jogosApi.getLista(jogoId)])
      setJogo(jogoRes.data)
      setLista(listaRes.data)
    } catch (error) {
      console.error('Erro ao carregar jogo:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmar(atletaId) { await presencasApi.confirmar(jogoId, atletaId); loadData() }
  async function handleRecusar(atletaId) { await presencasApi.recusar(jogoId, atletaId); loadData() }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
  if (!jogo || !lista) return <div className="text-center py-12">Jogo não encontrado</div>

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="text-gray-500"><ArrowLeft size={24} /></button>
        <div><h1 className="text-xl font-bold text-gray-900">{format(new Date(jogo.data_hora), "EEEE, d 'de' MMMM", { locale: ptBR })}</h1><p className="text-gray-500">{format(new Date(jogo.data_hora), 'HH:mm')} - {jogo.local || 'Local não definido'}</p></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center py-3"><p className="text-2xl font-bold text-green-600">{lista.total_confirmados}</p><p className="text-xs text-gray-500">Confirmados</p></div>
        <div className="card text-center py-3"><p className="text-2xl font-bold text-orange-500">{lista.total_pendentes}</p><p className="text-xs text-gray-500">Pendentes</p></div>
        <div className="card text-center py-3"><p className="text-2xl font-bold text-red-500">{lista.total_recusados}</p><p className="text-xs text-gray-500">Recusados</p></div>
      </div>
      <div><h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Check className="text-green-600" size={20} />Confirmados ({lista.confirmados.length})</h2>
        <div className="card divide-y">{lista.confirmados.length === 0 ? <p className="text-gray-500 text-center py-4">Nenhum confirmado ainda</p> : lista.confirmados.map((a) => <div key={a.atleta_id} className="py-3 flex items-center justify-between"><div><p className="font-medium">{a.apelido || a.nome}</p><p className="text-xs text-gray-500 capitalize">{a.posicao}</p></div><span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Confirmado</span></div>)}</div>
      </div>
      <div><h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Clock className="text-orange-500" size={20} />Pendentes ({lista.pendentes.length})</h2>
        <div className="card divide-y">{lista.pendentes.length === 0 ? <p className="text-gray-500 text-center py-4">Todos responderam</p> : lista.pendentes.map((a) => <div key={a.atleta_id} className="py-3 flex items-center justify-between"><div><p className="font-medium">{a.apelido || a.nome}</p><p className="text-xs text-gray-500 capitalize">{a.posicao}</p></div><div className="flex gap-2"><button onClick={() => handleConfirmar(a.atleta_id)} className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"><Check size={16} /></button><button onClick={() => handleRecusar(a.atleta_id)} className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"><X size={16} /></button></div></div>)}</div>
      </div>
    </div>
  )
}
