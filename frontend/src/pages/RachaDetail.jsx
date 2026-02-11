import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Users, Calendar, DollarSign, ChevronRight } from 'lucide-react'
import { rachasApi, jogosApi } from '../services/api'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function RachaDetail() {
  const { rachaId } = useParams()
  const [racha, setRacha] = useState(null)
  const [jogos, setJogos] = useState([])
  const [saldo, setSaldo] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [rachaId])

  async function loadData() {
    try {
      const [rachaRes, jogosRes, saldoRes] = await Promise.all([rachasApi.get(rachaId), jogosApi.list(rachaId), rachasApi.getSaldo(rachaId)])
      setRacha(rachaRes.data)
      setJogos(jogosRes.data)
      setSaldo(saldoRes.data)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
  if (!racha) return <div className="text-center py-12">Racha não encontrado</div>

  return (
    <div className="space-y-6 pb-20">
      <div className="card">
        <h1 className="text-2xl font-bold text-gray-900">{racha.nome}</h1>
        <p className="text-gray-500 capitalize">{racha.tipo} - {racha.total_atletas}/{racha.max_atletas} atletas</p>
        {saldo && <div className="bg-primary-50 rounded-lg p-4 mt-4"><p className="text-sm text-primary-700">Saldo do Racha</p><p className="text-2xl font-bold text-primary-800">{saldo.saldo_formatado}</p>{saldo.pendente > 0 && <p className="text-sm text-orange-600 mt-1">{saldo.pendente_formatado} pendente</p>}</div>}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Link to={`/racha/${rachaId}/atletas`} className="card flex flex-col items-center py-4 hover:shadow-md"><Users className="text-primary-600 mb-2" size={24} /><span className="text-sm font-medium">Atletas</span><span className="text-xs text-gray-500">{racha.total_atletas}</span></Link>
        <Link to={`/racha/${rachaId}/jogos`} className="card flex flex-col items-center py-4 hover:shadow-md"><Calendar className="text-primary-600 mb-2" size={24} /><span className="text-sm font-medium">Jogos</span><span className="text-xs text-gray-500">{jogos.length}</span></Link>
        <Link to={`/racha/${rachaId}/financeiro`} className="card flex flex-col items-center py-4 hover:shadow-md"><DollarSign className="text-primary-600 mb-2" size={24} /><span className="text-sm font-medium">Caixa</span></Link>
      </div>
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Pr?ximos Jogos</h2>
          <Link to={`/racha/${rachaId}/novo-jogo`} className="btn-secondary">Novo Jogo</Link>
        </div>
        {jogos.length === 0 ? <div className="card text-center py-8"><Calendar size={32} className="mx-auto text-gray-400 mb-2" /><p className="text-gray-500">Nenhum jogo agendado</p></div> : (
          <div className="space-y-2">
            {jogos.slice(0, 3).map((jogo) => (
              <Link key={jogo.id} to={`/racha/${rachaId}/jogo/${jogo.id}`} className="card flex items-center justify-between hover:shadow-md">
                <div>
                  <p className="font-medium text-gray-900">{format(new Date(jogo.data_hora), "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
                  <p className="text-sm text-gray-500">{format(new Date(jogo.data_hora), 'HH:mm')} - {jogo.local || 'Local não definido'}</p>
                  <p className="text-sm text-primary-600 font-medium mt-1">{jogo.total_confirmados} confirmados</p>
                </div>
                <ChevronRight className="text-gray-400" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
