import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Check, X, DollarSign } from 'lucide-react'
import { rachasApi, pagamentosApi } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function Financeiro() {
  const { rachaId } = useParams()
  const [saldo, setSaldo] = useState(null)
  const [pendentes, setPendentes] = useState([])
  const [pagamentos, setPagamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pendentes')
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const tipoLabels = { mensalidade: 'Mensalidade', rateio: 'Rateio', uniforme: 'Uniforme', multa_amarelo: 'Multa Amarelo', multa_vermelho: 'Multa Vermelho', outro: 'Outro' }
  const statusColors = { pendente: 'bg-gray-100 text-gray-300', aguardando_aprovacao: 'bg-orange-100 text-orange-700', aprovado: 'bg-green-100 text-green-700', rejeitado: 'bg-red-100 text-red-700' }

  useEffect(() => { loadData() }, [rachaId])

  async function loadData() {
    try {
      const [saldoRes, pendentesRes, pagamentosRes] = await Promise.all([rachasApi.getSaldo(rachaId), pagamentosApi.getPendentes(rachaId), pagamentosApi.list(rachaId)])
      setSaldo(saldoRes.data); setPendentes(pendentesRes.data); setPagamentos(pagamentosRes.data)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  async function handleAprovar(id) { await pagamentosApi.aprovar(id, 1, true); loadData() }
  async function handleRejeitar(id) { const m = prompt('Motivo da rejeição:'); if (m !== null) { await pagamentosApi.aprovar(id, 1, false, m); loadData() } }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
  if (user && !isAdmin) {
    return (
      <div className="card bg-gray-900/40 border border-gray-800 text-center py-10">
        <h1 className="text-xl font-semibold text-white mb-2">Acesso restrito</h1>
        <p className="text-gray-400">Apenas administradores podem acessar o financeiro.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-xl font-bold text-white">Financeiro</h1>
      {saldo && <div className="card bg-gray-900/40 border border-gray-800 bg-gradient-to-r from-primary-600 to-primary-700 text-white"><p className="text-primary-100 text-sm">Saldo do Racha</p><p className="text-3xl font-bold">{saldo.saldo_formatado}</p>{saldo.pendente > 0 && <p className="text-primary-200 text-sm mt-2">{saldo.pendente_formatado} aguardando aprovação</p>}</div>}
      <ul className="flex items-center gap-1 border-b border-gray-800">
        <li>
          <button onClick={() => setTab('pendentes')} className={`inline-block px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === 'pendentes' ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-gray-400 hover:text-emerald-500 hover:border-emerald-500'}`}>
            Pendentes ({pendentes.length})
          </button>
        </li>
        <li>
          <button onClick={() => setTab('historico')} className={`inline-block px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === 'historico' ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-gray-400 hover:text-emerald-500 hover:border-emerald-500'}`}>
            Histórico
          </button>
        </li>
      </ul>
      {tab === 'pendentes' ? (
        <div className="space-y-3">{pendentes.length === 0 ? <div className="card bg-gray-900/40 border border-gray-800 text-center py-8"><Check size={48} className="mx-auto text-green-500 mb-4" /><p className="text-gray-400">Nenhum pagamento pendente</p></div> : pendentes.map((p) => (
          <div key={p.id} className="card bg-gray-900/40 border border-gray-800">
            <div className="flex items-center justify-between mb-3"><div><p className="font-medium text-white">{p.atleta_nome}</p><p className="text-sm text-gray-400">{tipoLabels[p.tipo]} - {p.referencia}</p></div><p className="text-lg font-bold text-white">{p.valor_formatado}</p></div>
            {p.comprovante_url && <a href={p.comprovante_url} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-400 underline mb-3 block">Ver comprovante</a>}
            <div className="flex gap-2"><button onClick={() => handleAprovar(p.id)} className="flex-1 btn-primary flex items-center justify-center gap-2"><Check size={18} />Aprovar</button><button onClick={() => handleRejeitar(p.id)} className="flex-1 btn-secondary flex items-center justify-center gap-2 text-red-600"><X size={18} />Rejeitar</button></div>
          </div>
        ))}</div>
      ) : (
        <div className="card bg-gray-900/40 border border-gray-800 divide-y">{pagamentos.length === 0 ? <div className="text-center py-8"><DollarSign size={48} className="mx-auto text-gray-400 mb-4" /><p className="text-gray-400">Nenhum pagamento registrado</p></div> : pagamentos.map((p) => (
          <div key={p.id} className="py-4 flex items-center justify-between">
            <div><p className="font-medium text-white">{p.atleta_nome}</p><p className="text-sm text-gray-400">{tipoLabels[p.tipo]} - {p.referencia}</p></div>
            <div className="text-right"><p className="font-medium text-white">R$ {(p.valor / 100).toFixed(2)}</p><span className={`text-xs px-2 py-1 rounded-full ${statusColors[p.status]}`}>{p.status.replace('_', ' ')}</span></div>
          </div>
        ))}</div>
      )}
    </div>
  )
}
