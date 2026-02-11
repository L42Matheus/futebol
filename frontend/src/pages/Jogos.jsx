import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar } from 'lucide-react'
import { jogosApi, rachasApi } from '../services/api'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function Jogos() {
  const { rachaId } = useParams()
  const [racha, setRacha] = useState(null)
  const [jogos, setJogos] = useState([])
  const [apenasFuturos, setApenasFuturos] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [rachaId, apenasFuturos])

  async function loadData() {
    try {
      setLoading(true)
      const [rachaRes, jogosRes] = await Promise.all([
        rachasApi.get(rachaId),
        jogosApi.list(rachaId, apenasFuturos),
      ])
      setRacha(rachaRes.data)
      setJogos(jogosRes.data)
    } catch (error) {
      console.error('Erro ao carregar jogos:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
  if (!racha) return <div className="text-center py-12">Racha não encontrado</div>

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Link to={`/racha/${rachaId}`} className="text-gray-500"><ArrowLeft size={24} /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda de Jogos</h1>
          <p className="text-gray-500">{racha.nome}</p>
        </div>
      </div>
      <div className="card flex items-center justify-between gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={apenasFuturos}
            onChange={(e) => setApenasFuturos(e.target.checked)}
          />
          Apenas futuros
        </label>
        <Link to={`/racha/${rachaId}/novo-jogo`} className="btn-secondary">Novo Jogo</Link>
      </div>
      {jogos.length === 0 ? (
        <div className="card text-center py-10">
          <Calendar size={32} className="mx-auto text-gray-400 mb-2" />
          <p className="text-gray-500">Nenhum jogo agendado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {jogos.map((jogo) => (
            <Link key={jogo.id} to={`/racha/${rachaId}/jogo/${jogo.id}`} className="card flex items-center justify-between hover:shadow-md">
              <div>
                <p className="font-medium text-gray-900">{format(new Date(jogo.data_hora), "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
                <p className="text-sm text-gray-500">{format(new Date(jogo.data_hora), 'HH:mm')} - {jogo.local || 'Local não definido'}</p>
                <p className="text-sm text-primary-600 font-medium mt-1">{jogo.total_confirmados} confirmados</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
