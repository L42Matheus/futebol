import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Calendar, ChevronRight, Clock, MapPin, Plus, Users } from 'lucide-react'
import { format, isToday, isTomorrow, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { jogosApi, rachasApi } from '../services/api'
import { parseDataJogo } from '../utils/dataJogo'
import type { Racha, Jogo } from '../types'

type Aba = 'proximos' | 'anteriores'

function aoVivo(jogo: Jogo) {
  return Boolean(jogo.iniciado_em) && !jogo.finalizado
}

function temPlacar(jogo: Jogo) {
  return jogo.placar_time_a !== null && jogo.placar_time_a !== undefined
    && jogo.placar_time_b !== null && jogo.placar_time_b !== undefined
}

function rotuloDia(data: Date) {
  if (isToday(data)) return 'Hoje'
  if (isTomorrow(data)) return 'Amanhã'
  const dia = format(data, 'EEEE', { locale: ptBR })
  return dia.charAt(0).toUpperCase() + dia.slice(1)
}

export default function Jogos() {
  const { rachaId } = useParams<{ rachaId: string }>()
  const navigate = useNavigate()
  const [racha, setRacha] = useState<Racha | null>(null)
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [aba, setAba] = useState<Aba>('proximos')
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)

  const loadData = useCallback(async () => {
    if (!rachaId) return
    try {
      setLoading(true)
      setErro(false)
      // Busca todos e separa aqui: as abas trocam sem nova chamada.
      const [rachaRes, jogosRes] = await Promise.all([rachasApi.get(rachaId), jogosApi.list(rachaId, false)])
      setRacha(rachaRes.data)
      setJogos(jogosRes.data)
    } catch (error) {
      console.error('Erro ao carregar jogos:', error)
      setErro(true)
    } finally {
      setLoading(false)
    }
  }, [rachaId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const { emAndamento, proximos, anteriores } = useMemo(() => {
    const hoje = startOfDay(new Date())
    const emAndamento = jogos.filter(aoVivo)
    const resto = jogos.filter((j) => !aoVivo(j))
    // Jogo de hoje ainda sem resultado continua em "próximos".
    const ehAnterior = (j: Jogo) => j.finalizado || parseDataJogo(j.data_hora) < hoje
    return {
      emAndamento,
      proximos: resto.filter((j) => !ehAnterior(j)),
      anteriores: resto
        .filter(ehAnterior)
        .sort((a, b) => parseDataJogo(b.data_hora).getTime() - parseDataJogo(a.data_hora).getTime()),
    }
  }, [jogos])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    )
  }

  if (erro || !racha) {
    return (
      <div className="card py-10 text-center">
        <p className="font-semibold text-white">Não foi possível carregar a agenda.</p>
        <button type="button" onClick={() => void loadData()} className="btn-secondary mt-4">
          Tentar de novo
        </button>
      </div>
    )
  }

  const isAdmin = Boolean(racha.is_admin)
  const lista = aba === 'proximos' ? proximos : anteriores

  return (
    <div className="space-y-5 pb-20">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-white">Agenda</h1>
          <p className="truncate text-sm font-medium text-gray-400">{racha.nome}</p>
        </div>
        {isAdmin && (
          <Link to={`/racha/${rachaId}/novo-jogo`} className="btn-primary shrink-0">
            <Plus size={18} /> Novo jogo
          </Link>
        )}
      </div>

      {emAndamento.map((jogo) => (
        <button
          key={jogo.id}
          type="button"
          onClick={() => navigate(`/racha/${rachaId}/jogo/${jogo.id}/partida`)}
          className="tema-escuro flex w-full items-center gap-3 rounded-[1.5rem] border border-white/10 bg-gradient-to-br from-sky-900 via-slate-900 to-emerald-800 p-4 text-left shadow-lg shadow-black/20"
        >
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Ao vivo
            </span>
            <p className="mt-1 truncate text-base font-black text-white">
              {jogo.time_a_nome || 'Time A'} {jogo.placar_time_a ?? 0} x {jogo.placar_time_b ?? 0} {jogo.time_b_nome || 'Time B'}
            </p>
          </div>
          <ChevronRight size={20} className="shrink-0 text-white/70" />
        </button>
      ))}

      <div className="grid grid-cols-2 gap-1 rounded-2xl border border-gray-800 bg-gray-900/40 p-1" role="tablist">
        {([
          ['proximos', 'Próximos', proximos.length],
          ['anteriores', 'Anteriores', anteriores.length],
        ] as const).map(([id, nome, total]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={aba === id}
            onClick={() => setAba(id)}
            className={`flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-black transition-colors ${
              aba === id ? 'bg-emerald-500 text-branco' : 'text-gray-400 hover:text-white'
            }`}
          >
            {nome}
            <span className={`rounded-full px-1.5 text-[11px] ${aba === id ? 'bg-white/20' : 'bg-gray-800 text-gray-400'}`}>
              {total}
            </span>
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <div className="card flex flex-col items-center py-10 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-800 text-gray-500">
            <Calendar size={24} />
          </div>
          <p className="font-bold text-white">
            {aba === 'proximos' ? 'Nenhum jogo marcado' : 'Nenhum jogo anterior'}
          </p>
          <p className="mt-1 max-w-xs text-sm text-gray-500">
            {aba === 'proximos'
              ? isAdmin
                ? 'Marque o próximo jogo e a galera já pode confirmar presença.'
                : 'Quando o admin marcar um jogo, ele aparece aqui.'
              : 'Os jogos que já aconteceram ficam guardados aqui, com o placar.'}
          </p>
          {aba === 'proximos' && isAdmin && (
            <Link to={`/racha/${rachaId}/novo-jogo`} className="btn-primary mt-5">
              <Plus size={18} /> Marcar jogo
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {lista.map((jogo) => (
            <CartaoJogo key={jogo.id} jogo={jogo} href={`/racha/${rachaId}/jogo/${jogo.id}`} />
          ))}
        </div>
      )}
    </div>
  )
}

function CartaoJogo({ jogo, href }: { jogo: Jogo; href: string }) {
  const data = parseDataJogo(jogo.data_hora)
  const encerrado = temPlacar(jogo) && (jogo.finalizado || !jogo.iniciado_em)

  return (
    <Link
      to={href}
      className="flex items-center gap-3 rounded-[1.5rem] border border-gray-800 bg-gray-900/40 p-3 transition-colors hover:border-emerald-500/40"
    >
      <div
        className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl ${
          isToday(data) ? 'bg-emerald-500 text-branco' : 'bg-gray-800 text-white'
        }`}
      >
        <span className="text-xl font-black leading-none">{format(data, 'd')}</span>
        <span className={`mt-0.5 text-[10px] font-black uppercase ${isToday(data) ? 'text-branco/80' : 'text-gray-400'}`}>
          {format(data, 'MMM', { locale: ptBR }).replace('.', '')}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-white">
          {rotuloDia(data)}
          <span className="ml-1.5 inline-flex items-center gap-1 font-semibold text-gray-400">
            <Clock size={13} /> {format(data, 'HH:mm')}
          </span>
        </p>
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-gray-500">
          <MapPin size={13} className="shrink-0" />
          <span className="truncate">{jogo.local || 'Local não definido'}</span>
        </p>
        {encerrado ? (
          <p className="mt-1.5 truncate text-xs font-bold text-gray-300">
            {jogo.time_a_nome || 'Time A'}{' '}
            <span className="font-black text-white">{jogo.placar_time_a} x {jogo.placar_time_b}</span>{' '}
            {jogo.time_b_nome || 'Time B'}
          </p>
        ) : (
          <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
            <Users size={13} /> {jogo.total_confirmados} confirmado{jogo.total_confirmados === 1 ? '' : 's'}
          </p>
        )}
      </div>

      <ChevronRight size={18} className="shrink-0 text-gray-500" />
    </Link>
  )
}
