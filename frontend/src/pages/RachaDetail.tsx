import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Users, Calendar, DollarSign, ChevronRight, Layers, LayoutGrid, ClipboardList, Copy, Share2 } from 'lucide-react'
import { rachasApi, jogosApi, authApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { compartilharLink, copiarTexto } from '../utils/compartilhar'
import { esporteDaModalidade, getModalidade, temRecurso } from '../esportes'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Racha, Jogo, Saldo } from '../types'

export default function RachaDetail() {
  const { rachaId } = useParams<{ rachaId: string }>()
  const [racha, setRacha] = useState<Racha | null>(null)
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [saldo, setSaldo] = useState<Saldo | null>(null)
  const [loading, setLoading] = useState(true)
  const [gerando, setGerando] = useState<'atleta' | 'admin' | null>(null)
  const { user } = useAuth()
  const { toast } = useToast()
  // Admin deste clube (a conta pode ser admin de um clube e atleta de outro).
  const isAdmin = racha?.is_admin ?? user?.role === 'admin'

  const loadData = useCallback(async () => {
    if (!rachaId) return
    try {
      const [rachaRes, jogosRes, saldoRes] = await Promise.all([
        rachasApi.get(rachaId),
        jogosApi.list(rachaId),
        rachasApi.getSaldo(rachaId),
      ])
      setRacha(rachaRes.data)
      setJogos(jogosRes.data)
      setSaldo(saldoRes.data)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }, [rachaId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Cada toque gera um link novo; o mesmo link serve para várias pessoas.
  async function convidar(role: 'atleta' | 'admin', acao: 'enviar' | 'copiar') {
    if (!rachaId) return
    setGerando(role)
    try {
      const res = await authApi.createInvite({ racha_id: parseInt(rachaId), role })
      const link = `${window.location.origin}/register?invite=${res.data.token}`
      if (acao === 'copiar') {
        const copiou = await copiarTexto(link)
        toast(copiou ? 'Link copiado!' : 'Não consegui copiar o link.', copiou ? 'success' : 'error')
      } else {
        const papel = role === 'atleta' ? 'jogar' : 'ajudar a organizar'
        const resultado = await compartilharLink(link, `Entra no ${racha?.nome || 'nosso clube'} no QuemJoga para ${papel}:`)
        if (resultado === 'copiado') toast('Link copiado! Cole no grupo da galera.', 'success')
        if (resultado === 'falhou') toast('Não consegui compartilhar o link.', 'error')
      }
    } catch {
      toast('Não foi possível gerar o convite.', 'error')
    } finally {
      setGerando(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    )
  }

  if (!racha) {
    return <div className="text-center py-12 text-gray-400">Clube não encontrado</div>
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Info principal */}
      <div className="card">
        <h1 className="text-2xl font-bold text-white">{racha.nome}</h1>
        <p className="text-gray-400 mt-1">
          {esporteDaModalidade(racha.tipo).nome} · {getModalidade(racha.tipo).nome} — {racha.total_atletas}/{racha.max_atletas} atletas
        </p>
        {saldo && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mt-4">
            <p className="text-sm text-emerald-400">Saldo do Clube</p>
            <p className="text-2xl font-bold text-white">{saldo.saldo_formatado}</p>
            {saldo.pendente > 0 && (
              <p className="text-sm text-amber-400 mt-1">{saldo.pendente_formatado} pendente</p>
            )}
          </div>
        )}
      </div>

      {/* Navegação rápida */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Link
          to={`/racha/${rachaId}/atletas`}
          className="card flex flex-col items-center py-4 hover:border-emerald-500/50 transition-colors"
        >
          <Users className="text-emerald-500 mb-2" size={24} />
          <span className="text-sm font-medium text-white">Atletas</span>
          <span className="text-xs text-gray-500">{racha.total_atletas}</span>
        </Link>
        <Link
          to={`/racha/${rachaId}/jogos`}
          className="card flex flex-col items-center py-4 hover:border-emerald-500/50 transition-colors"
        >
          <Calendar className="text-blue-400 mb-2" size={24} />
          <span className="text-sm font-medium text-white">Jogos</span>
          <span className="text-xs text-gray-500">{jogos.length}</span>
        </Link>
        {isAdmin && (
          <Link
            to={`/racha/${rachaId}/times`}
            className="card flex flex-col items-center py-4 hover:border-emerald-500/50 transition-colors"
          >
            <Layers className="text-purple-400 mb-2" size={24} />
            <span className="text-sm font-medium text-white">Times</span>
          </Link>
        )}
        {temRecurso(racha.tipo, 'escalacao') && (
          <Link
            to={`/racha/${rachaId}/escalacao`}
            className="card flex flex-col items-center py-4 hover:border-emerald-500/50 transition-colors"
          >
            <LayoutGrid className="text-emerald-400 mb-2" size={24} />
            <span className="text-sm font-medium text-white">Escalação</span>
          </Link>
        )}
        {isAdmin && (
          <Link
            to={`/racha/${rachaId}/financeiro`}
            className="card flex flex-col items-center py-4 hover:border-emerald-500/50 transition-colors"
          >
            <DollarSign className="text-amber-400 mb-2" size={24} />
            <span className="text-sm font-medium text-white">Caixa</span>
          </Link>
        )}
      </div>

      {/* Convites: atleta para jogar, administrador para ajudar a organizar. */}
      {isAdmin && (
        <div className="card space-y-4">
          {([
            { role: 'atleta', titulo: 'Convidar atleta', descricao: 'Para quem vai jogar no clube', icone: <Users size={20} />, cor: 'bg-emerald-500/10 text-emerald-400', botao: 'bg-emerald-600 hover:bg-emerald-700' },
            { role: 'admin', titulo: 'Convidar administrador', descricao: 'Para quem ajuda a organizar', icone: <ClipboardList size={20} />, cor: 'bg-amber-500/10 text-amber-400', botao: 'bg-amber-600 hover:bg-amber-700' },
          ] as const).map((c) => (
            <div key={c.role} className="space-y-2.5">
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${c.cor}`}>{c.icone}</span>
                <div>
                  <h3 className="font-semibold text-white">{c.titulo}</h3>
                  <p className="text-sm text-gray-500">{c.descricao}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={gerando !== null}
                  onClick={() => void convidar(c.role, 'enviar')}
                  className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold text-branco disabled:opacity-60 ${c.botao}`}
                >
                  <Share2 size={16} /> Enviar convite
                </button>
                <button
                  type="button"
                  disabled={gerando !== null}
                  onClick={() => void convidar(c.role, 'copiar')}
                  className="btn-secondary flex h-11 items-center justify-center gap-2 text-sm"
                >
                  <Copy size={16} /> Copiar link
                </button>
              </div>
            </div>
          ))}
          <p className="text-xs text-gray-500">
            Cuidado com o link de administrador: quem entrar por ele pode gerenciar o clube.
          </p>
        </div>
      )}

      {/* Próximos jogos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white">Próximos Jogos</h2>
          {isAdmin && (
            <Link to={`/racha/${rachaId}/novo-jogo`} className="btn-secondary">
              Novo Jogo
            </Link>
          )}
        </div>
        {jogos.length === 0 ? (
          <div className="card text-center py-8">
            <Calendar size={32} className="mx-auto text-gray-600 mb-2" />
            <p className="text-gray-500">Nenhum jogo agendado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {jogos.slice(0, 3).map((jogo) => (
              <Link
                key={jogo.id}
                to={`/racha/${rachaId}/jogo/${jogo.id}`}
                className="card flex items-center justify-between hover:border-gray-700 transition-colors"
              >
                <div>
                  <p className="font-medium text-white">
                    {format(new Date(jogo.data_hora), "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(jogo.data_hora), 'HH:mm')} —{' '}
                    {jogo.local ?? 'Local não definido'}
                  </p>
                  <p className="text-sm text-emerald-400 font-medium mt-1">
                    {jogo.total_confirmados} confirmados
                  </p>
                </div>
                <ChevronRight className="text-gray-600" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
