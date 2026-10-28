import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeftRight, ChevronLeft, Flag, Play, Timer, Undo2, X } from 'lucide-react'
import { format } from 'date-fns'
import Avatar from '../components/Avatar'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../context/ToastContext'
import { partidaApi, teamsApi } from '../services/api'
import { getEsporte, labelPosicao } from '../esportes'
import type { Lance, MembroPartida, NovoLance, Partida, TimePartida } from '../types'

// Atualiza o placar para quem acompanha de outro celular.
const INTERVALO_ATUALIZACAO = 8000

type Etapa =
  | { tipo: 'acoes' }
  | { tipo: 'assistencia'; lado: 'a' | 'b' }
  | { tipo: 'substituicao' }

interface Selecionado {
  membro: MembroPartida
  time: TimePartida
}

interface Contagem {
  gols: number
  assistencias: number
  amarelos: number
  vermelhos: number
}

function erroDaApi(e: unknown, padrao: string) {
  const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  return typeof detail === 'string' ? detail : padrao
}

function formatarDuracao(segundos: number) {
  const s = Math.max(0, Math.floor(segundos))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const resto = s % 60
  return [h, m, resto].map((n) => String(n).padStart(2, '0')).join(':')
}

function nomeCurto(membro?: MembroPartida) {
  if (!membro) return 'Atleta'
  return membro.apelido || membro.nome.split(' ')[0]
}

export default function PartidaAoVivo() {
  const { rachaId, jogoId } = useParams<{ rachaId: string; jogoId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [partida, setPartida] = useState<Partida | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  // Diferença entre o relógio do servidor e o do celular, para o tempo bater com o início real.
  const [desvio, setDesvio] = useState(0)
  const [agora, setAgora] = useState(Date.now())
  const [times, setTimes] = useState<{ id: number; nome: string }[]>([])
  const [escolha, setEscolha] = useState<{ a: string; b: string }>({ a: '', b: '' })
  const [selecionado, setSelecionado] = useState<Selecionado | null>(null)
  const [etapa, setEtapa] = useState<Etapa>({ tipo: 'acoes' })
  const [enviando, setEnviando] = useState(false)
  const [confirmarFim, setConfirmarFim] = useState(false)
  const [desfazer, setDesfazer] = useState<Lance | null>(null)

  const aplicar = useCallback((dados: Partida) => {
    setPartida(dados)
    setDesvio(Date.parse(dados.agora) - Date.now())
  }, [])

  const carregar = useCallback(async () => {
    if (!jogoId) return
    try {
      const res = await partidaApi.get(jogoId)
      aplicar(res.data)
      setErro('')
    } catch (e) {
      setErro(erroDaApi(e, 'Não foi possível carregar a partida.'))
    } finally {
      setCarregando(false)
    }
  }, [jogoId, aplicar])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const emAndamento = Boolean(partida?.iniciado_em) && !partida?.finalizado

  useEffect(() => {
    if (!emAndamento) return
    const relogio = window.setInterval(() => setAgora(Date.now()), 1000)
    const atualizacao = window.setInterval(() => {
      if (document.visibilityState === 'visible') void carregar()
    }, INTERVALO_ATUALIZACAO)
    return () => {
      window.clearInterval(relogio)
      window.clearInterval(atualizacao)
    }
  }, [emAndamento, carregar])

  // Times do racha para o admin escolher antes de começar.
  useEffect(() => {
    if (!partida || partida.iniciado_em || !partida.is_admin) return
    teamsApi
      .list(partida.racha_id)
      .then((res) => setTimes((res.data ?? []).map((t: { id: number; nome: string }) => ({ id: t.id, nome: t.nome }))))
      .catch(() => setTimes([]))
    setEscolha({
      a: partida.times[0]?.team_id ? String(partida.times[0].team_id) : '',
      b: partida.times[1]?.team_id ? String(partida.times[1].team_id) : '',
    })
  }, [partida?.jogo_id, partida?.iniciado_em, partida?.is_admin])

  const esporte = getEsporte(partida?.esporte ?? 'futebol')
  const membros = useMemo(() => {
    const mapa = new Map<number, MembroPartida>()
    partida?.times.forEach((time) => time.membros.forEach((m) => mapa.set(m.atleta_id, m)))
    return mapa
  }, [partida])

  const contagens = useMemo(() => {
    const mapa = new Map<number, Contagem>()
    const de = (id: number) => {
      if (!mapa.has(id)) mapa.set(id, { gols: 0, assistencias: 0, amarelos: 0, vermelhos: 0 })
      return mapa.get(id)!
    }
    partida?.eventos.forEach((e) => {
      if (e.tipo === 'gol') de(e.atleta_id).gols += 1
      if (e.tipo === 'assistencia') de(e.atleta_id).assistencias += 1
      if (e.tipo === 'amarelo') de(e.atleta_id).amarelos += 1
      if (e.tipo === 'vermelho') de(e.atleta_id).vermelhos += 1
    })
    return mapa
  }, [partida])

  async function iniciar() {
    if (!jogoId) return
    if (!escolha.a || !escolha.b) {
      toast('Escolha os dois times.', 'error')
      return
    }
    if (escolha.a === escolha.b) {
      toast('Escolha dois times diferentes.', 'error')
      return
    }
    setEnviando(true)
    try {
      const res = await partidaApi.iniciar(jogoId, { time_a_id: Number(escolha.a), time_b_id: Number(escolha.b) })
      aplicar(res.data)
    } catch (e) {
      toast(erroDaApi(e, 'Não foi possível iniciar a partida.'), 'error')
    } finally {
      setEnviando(false)
    }
  }

  async function encerrar() {
    if (!jogoId) return
    setConfirmarFim(false)
    try {
      const res = await partidaApi.encerrar(jogoId)
      aplicar(res.data)
      toast('Partida encerrada.', 'success')
    } catch (e) {
      toast(erroDaApi(e, 'Não foi possível encerrar a partida.'), 'error')
    }
  }

  async function registrar(lance: NovoLance) {
    if (!jogoId) return false
    setEnviando(true)
    try {
      const res = await partidaApi.registrar(jogoId, lance)
      aplicar(res.data)
      return true
    } catch (e) {
      toast(erroDaApi(e, 'Não foi possível registrar o lance.'), 'error')
      return false
    } finally {
      setEnviando(false)
    }
  }

  async function confirmarDesfazer() {
    if (!jogoId || !desfazer) return
    const lance = desfazer
    setDesfazer(null)
    try {
      const res = await partidaApi.desfazer(jogoId, lance.id)
      aplicar(res.data)
      toast('Lance desfeito.', 'success')
    } catch (e) {
      toast(erroDaApi(e, 'Não foi possível desfazer o lance.'), 'error')
    }
  }

  function fecharFolha() {
    setSelecionado(null)
    setEtapa({ tipo: 'acoes' })
  }

  async function marcarPonto(valor: number) {
    if (!selecionado) return
    const { membro, time } = selecionado
    const ok = await registrar({ tipo: 'gol', atleta_id: membro.atleta_id, valor })
    if (!ok) return
    const temCompanheiro = time.membros.some((m) => m.is_titular && m.atleta_id !== membro.atleta_id)
    if (permite('assistencia') && temCompanheiro) {
      setEtapa({ tipo: 'assistencia', lado: time.lado })
    } else {
      fecharFolha()
    }
  }

  async function lancar(lance: NovoLance) {
    if (await registrar(lance)) fecharFolha()
  }

  function permite(tipo: NovoLance['tipo']) {
    return Boolean(partida?.eventos_permitidos.includes(tipo))
  }

  function descreverLance(lance: Lance) {
    const quem = nomeCurto(membros.get(lance.atleta_id))
    switch (lance.tipo) {
      case 'gol':
        return lance.valor > 1 ? `${esporte.lance} de ${lance.valor} de ${quem}` : `${esporte.lance} de ${quem}`
      case 'assistencia':
        return `Assistência de ${quem}`
      case 'amarelo':
        return `Cartão amarelo para ${quem}`
      case 'vermelho':
        return `Cartão vermelho para ${quem}`
      case 'substituicao':
        return lance.atleta_sai_id
          ? `Entrou ${quem}, saiu ${nomeCurto(membros.get(lance.atleta_sai_id))}`
          : `${quem} entrou em jogo`
    }
  }

  if (carregando) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-500" />
      </div>
    )
  }

  if (!partida) {
    return (
      <div className="card py-10 text-center">
        <p className="text-white font-semibold">{erro || 'Partida não encontrada.'}</p>
        <button type="button" onClick={() => void carregar()} className="btn-secondary mt-4">
          Tentar de novo
        </button>
      </div>
    )
  }

  const podeEditar = partida.is_admin && emAndamento
  const [timeA, timeB] = partida.times
  const inicio = partida.iniciado_em ? new Date(partida.iniciado_em) : null
  const decorrido = inicio ? (agora + desvio - inicio.getTime()) / 1000 : 0
  const lancesRecentes = [...partida.eventos].reverse()

  return (
    <div className="space-y-5 pb-24">
      <button
        type="button"
        onClick={() => navigate(`/racha/${rachaId}/jogo/${jogoId}`)}
        className="inline-flex items-center gap-1 text-sm font-semibold text-gray-400 hover:text-white"
      >
        <ChevronLeft size={18} /> Voltar ao jogo
      </button>

      {!inicio ? (
        <section className="card space-y-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-400">Partida ao vivo</p>
            <h1 className="mt-1 text-xl font-black text-white">
              {partida.is_admin ? 'Escolha os times e comece' : 'A partida ainda não começou'}
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              {partida.is_admin
                ? `Durante o jogo você marca ${esporte.pontuacao.toLowerCase()}${permite('amarelo') ? ', cartões' : ''} e substituições tocando no atleta.`
                : 'Quando o admin iniciar, o placar e os lances aparecem aqui.'}
            </p>
          </div>

          {partida.is_admin && (
            <>
              {times.length < 2 ? (
                <p className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-300">
                  O racha precisa de pelo menos dois times. Crie os times e monte a escalação antes de começar.
                </p>
              ) : (
                <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                  <SeletorTime lado="a" valor={escolha.a} times={times} onChange={(a) => setEscolha((atual) => ({ ...atual, a }))} />
                  <span className="pb-3 font-black text-gray-500">x</span>
                  <SeletorTime lado="b" valor={escolha.b} times={times} onChange={(b) => setEscolha((atual) => ({ ...atual, b }))} />
                </div>
              )}
              <button
                type="button"
                onClick={() => void iniciar()}
                disabled={enviando || times.length < 2}
                className="btn-primary flex w-full items-center justify-center gap-2"
              >
                <Play size={18} /> {enviando ? 'Iniciando...' : 'Iniciar partida'}
              </button>
            </>
          )}
        </section>
      ) : (
        <>
          <section className="tema-escuro overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-sky-900 via-slate-900 to-emerald-800 px-4 py-5 text-center shadow-xl shadow-black/20 sm:px-6">
            <div className="flex justify-center">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] ${
                  partida.finalizado ? 'bg-white/10 text-white/70' : 'bg-emerald-400/15 text-emerald-300'
                }`}
              >
                {!partida.finalizado && <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />}
                {partida.finalizado ? 'Partida encerrada' : 'Ao vivo'}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <EscudoTime nome={timeA.nome} cor="emerald" />
              <div className="px-1">
                <p className="text-5xl font-black leading-none tabular-nums text-white">
                  {timeA.placar}
                  <span className="mx-2 align-middle text-2xl text-white/40">x</span>
                  {timeB.placar}
                </p>
              </div>
              <EscudoTime nome={timeB.nome} cor="sky" />
            </div>

            <div className="mx-auto mt-5 grid max-w-xs grid-cols-2 divide-x divide-white/15 rounded-2xl bg-white/10 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Início</p>
                <p className="mt-0.5 text-lg font-black tabular-nums text-white">{format(inicio, 'HH:mm')}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
                  {partida.finalizado ? 'Lances' : 'Tempo'}
                </p>
                <p className="mt-0.5 text-lg font-black tabular-nums text-white">
                  {partida.finalizado ? partida.eventos.length : formatarDuracao(decorrido)}
                </p>
              </div>
            </div>

            {partida.is_admin && (
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/tempo')}
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/20 text-sm font-black text-white hover:bg-white/10"
                >
                  <Timer size={16} /> Cronômetro
                </button>
                {!partida.finalizado ? (
                  <button
                    type="button"
                    onClick={() => setConfirmarFim(true)}
                    className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white text-sm font-black text-slate-900 hover:bg-white/90"
                  >
                    <Flag size={16} /> Encerrar
                  </button>
                ) : (
                  <div className="flex h-12 items-center justify-center rounded-2xl border border-white/10 text-sm font-bold text-white/60">
                    Placar salvo
                  </div>
                )}
              </div>
            )}
          </section>

          {podeEditar && (
            <p className="px-4 text-center text-xs font-medium text-gray-500">
              Toque no atleta para marcar {esporte.lance.toLowerCase()}
              {permite('amarelo') ? ', cartão' : ''} ou fazer substituição.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            {partida.times.map((time) => (
              <ColunaTime
                key={time.lado}
                time={time}
                contagens={contagens}
                IconePonto={esporte.Icone}
                onEscolher={podeEditar ? (membro) => setSelecionado({ membro, time }) : undefined}
              />
            ))}
          </div>

          <section className="card">
            <h2 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-gray-400">Lances</h2>
            {lancesRecentes.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">Nenhum lance ainda.</p>
            ) : (
              <ul className="divide-y divide-gray-800">
                {lancesRecentes.map((lance) => (
                  <li key={lance.id} className="flex items-center gap-3 py-2.5">
                    <span className="w-9 shrink-0 text-xs font-black tabular-nums text-gray-500">
                      {Math.floor((lance.segundos ?? 0) / 60)}'
                    </span>
                    <IconeLance lance={lance} IconePonto={esporte.Icone} />
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
                      {descreverLance(lance)}
                      <span className="ml-1.5 text-xs font-medium text-gray-500">
                        {lance.lado === 'a' ? timeA.nome : timeB.nome}
                      </span>
                    </p>
                    {partida.is_admin && (
                      <button
                        type="button"
                        onClick={() => setDesfazer(lance)}
                        aria-label="Desfazer lance"
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-800 hover:text-white"
                      >
                        <Undo2 size={16} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {selecionado && (
        <FolhaLances
          selecionado={selecionado}
          etapa={etapa}
          enviando={enviando}
          esporteLance={esporte.lance}
          valores={partida.valores_pontuacao}
          permite={permite}
          onFechar={fecharFolha}
          onPonto={(valor) => void marcarPonto(valor)}
          onLance={(lance) => void lancar(lance)}
          onSubstituir={() => setEtapa({ tipo: 'substituicao' })}
        />
      )}

      <ConfirmDialog
        open={confirmarFim}
        title="Encerrar partida"
        description={`O placar ${timeA?.placar ?? 0} x ${timeB?.placar ?? 0} fica salvo no jogo. Você ainda pode desfazer lances depois.`}
        confirmLabel="Encerrar"
        onConfirm={() => void encerrar()}
        onCancel={() => setConfirmarFim(false)}
      />
      <ConfirmDialog
        open={Boolean(desfazer)}
        title="Desfazer lance"
        description={desfazer ? `${descreverLance(desfazer)} será removido.` : ''}
        confirmLabel="Desfazer"
        danger
        onConfirm={() => void confirmarDesfazer()}
        onCancel={() => setDesfazer(null)}
      />
    </div>
  )
}

function EscudoTime({ nome, cor }: { nome: string; cor: 'emerald' | 'sky' }) {
  const iniciais = nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase()
  return (
    <div className="flex min-w-0 flex-col items-center gap-2">
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-black text-branco shadow-lg ${
          cor === 'emerald' ? 'bg-emerald-500 shadow-emerald-950/40' : 'bg-sky-500 shadow-sky-950/40'
        }`}
      >
        {iniciais || '?'}
      </span>
      <p className="w-full truncate text-xs font-black uppercase tracking-wide text-white">{nome}</p>
    </div>
  )
}

function SeletorTime({
  lado,
  valor,
  times,
  onChange,
}: {
  lado: 'a' | 'b'
  valor: string
  times: { id: number; nome: string }[]
  onChange: (valor: string) => void
}) {
  return (
    <label className="min-w-0 space-y-2">
      <span className="text-xs font-semibold text-gray-400">Time {lado.toUpperCase()}</span>
      <select className="input" value={valor} onChange={(e) => onChange(e.target.value)}>
        <option value="">Escolha</option>
        {times.map((t) => (
          <option key={t.id} value={t.id}>{t.nome}</option>
        ))}
      </select>
    </label>
  )
}

function ColunaTime({
  time,
  contagens,
  IconePonto,
  onEscolher,
}: {
  time: TimePartida
  contagens: Map<number, Contagem>
  IconePonto: ReturnType<typeof getEsporte>['Icone']
  onEscolher?: (membro: MembroPartida) => void
}) {
  const titulares = time.membros.filter((m) => m.is_titular)
  const banco = time.membros.filter((m) => !m.is_titular)

  return (
    <section className="min-w-0 overflow-hidden rounded-[1.5rem] border border-gray-800 bg-gray-900/40">
      <div className={`border-b border-gray-800 px-3 py-3 text-center ${time.lado === 'a' ? 'bg-emerald-500/10' : 'bg-sky-500/10'}`}>
        <p className="truncate text-sm font-black text-white">{time.nome}</p>
        <p className="text-[11px] font-semibold text-gray-500">{titulares.length} em jogo · {banco.length} no banco</p>
      </div>
      <ListaJogadores titulo="Em jogo" membros={titulares} contagens={contagens} IconePonto={IconePonto} onEscolher={onEscolher} />
      <ListaJogadores titulo="Banco" membros={banco} contagens={contagens} IconePonto={IconePonto} onEscolher={onEscolher} apagado />
    </section>
  )
}

function ListaJogadores({
  titulo,
  membros,
  contagens,
  IconePonto,
  onEscolher,
  apagado = false,
}: {
  titulo: string
  membros: MembroPartida[]
  contagens: Map<number, Contagem>
  IconePonto: ReturnType<typeof getEsporte>['Icone']
  onEscolher?: (membro: MembroPartida) => void
  apagado?: boolean
}) {
  return (
    <div className="px-2 py-2">
      <p className="px-1 pb-1 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">{titulo}</p>
      {membros.length === 0 ? (
        <p className="px-1 py-2 text-xs text-gray-600">Ninguém</p>
      ) : (
        membros.map((membro) => {
          const c = contagens.get(membro.atleta_id)
          const conteudo = (
            <>
              <div className="relative shrink-0">
                <Avatar src={membro.foto_url ?? undefined} name={membro.apelido || membro.nome} size="sm" />
                {c && c.gols > 0 && (
                  <span className="absolute -bottom-1 -right-1 flex h-4 min-w-4 items-center justify-center gap-px rounded-full bg-white px-0.5 text-[9px] font-black text-slate-900 shadow">
                    <IconePonto size={10} />
                    {c.gols > 1 && c.gols}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className={`truncate text-[13px] font-bold ${apagado ? 'text-gray-300' : 'text-white'}`}>
                  {nomeCurto(membro)}
                </p>
                <div className="flex items-center gap-1">
                  <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    {labelPosicao(membro.posicao_escalacao || membro.posicao) || '—'}
                  </span>
                  {c && c.assistencias > 0 && (
                    <span className="shrink-0 rounded bg-gray-800 px-1 text-[9px] font-black text-gray-300">
                      {c.assistencias} AST
                    </span>
                  )}
                  {c && Array.from({ length: c.amarelos }).map((_, i) => (
                    <span key={`a${i}`} className="h-3 w-2 shrink-0 rounded-[2px] bg-yellow-400" aria-label="Cartão amarelo" />
                  ))}
                  {c && Array.from({ length: c.vermelhos }).map((_, i) => (
                    <span key={`v${i}`} className="h-3 w-2 shrink-0 rounded-[2px] bg-red-500" aria-label="Cartão vermelho" />
                  ))}
                </div>
              </div>
            </>
          )
          return onEscolher ? (
            <button
              key={membro.atleta_id}
              type="button"
              onClick={() => onEscolher(membro)}
              className="flex w-full items-center gap-2 rounded-xl px-1.5 py-1.5 transition-colors hover:bg-gray-800/70 active:bg-gray-800"
            >
              {conteudo}
            </button>
          ) : (
            <div key={membro.atleta_id} className="flex items-center gap-2 px-1.5 py-1.5">
              {conteudo}
            </div>
          )
        })
      )}
    </div>
  )
}

function IconeLance({ lance, IconePonto }: { lance: Lance; IconePonto: ReturnType<typeof getEsporte>['Icone'] }) {
  if (lance.tipo === 'gol') {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
        <IconePonto size={15} />
      </span>
    )
  }
  if (lance.tipo === 'amarelo' || lance.tipo === 'vermelho') {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center">
        <span className={`h-4 w-3 rounded-[3px] ${lance.tipo === 'amarelo' ? 'bg-yellow-400' : 'bg-red-500'}`} />
      </span>
    )
  }
  if (lance.tipo === 'substituicao') {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-400">
        <ArrowLeftRight size={14} />
      </span>
    )
  }
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-800 text-[9px] font-black text-gray-300">
      AST
    </span>
  )
}

function FolhaLances({
  selecionado,
  etapa,
  enviando,
  esporteLance,
  valores,
  permite,
  onFechar,
  onPonto,
  onLance,
  onSubstituir,
}: {
  selecionado: Selecionado
  etapa: Etapa
  enviando: boolean
  esporteLance: string
  valores: number[]
  permite: (tipo: NovoLance['tipo']) => boolean
  onFechar: () => void
  onPonto: (valor: number) => void
  onLance: (lance: NovoLance) => void
  onSubstituir: () => void
}) {
  const { membro, time } = selecionado
  // Só quem está em jogo dá assistência.
  const companheiros = time.membros.filter((m) => m.is_titular && m.atleta_id !== membro.atleta_id)
  // Quem está em campo troca com alguém do banco, e vice-versa.
  const trocas = time.membros.filter((m) => m.is_titular !== membro.is_titular)

  let titulo = nomeCurto(membro)
  let subtitulo = `${time.nome} · ${membro.is_titular ? 'em jogo' : 'no banco'}`
  if (etapa.tipo === 'assistencia') {
    titulo = `${esporteLance} marcado!`
    subtitulo = 'Quem deu a assistência?'
  } else if (etapa.tipo === 'substituicao') {
    titulo = membro.is_titular ? `Quem entra no lugar de ${nomeCurto(membro)}?` : `${nomeCurto(membro)} entra em jogo`
    subtitulo = membro.is_titular ? time.nome : 'Entra sozinho ou no lugar de quem está jogando'
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={enviando ? undefined : onFechar} />
      <div className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-[2rem] border border-gray-800 bg-gray-900 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[2rem]">
        <div className="mb-4 flex items-start gap-3">
          <Avatar src={membro.foto_url ?? undefined} name={membro.apelido || membro.nome} size="md" />
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-black text-white">{titulo}</h3>
            <p className="text-sm text-gray-400">{subtitulo}</p>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        {etapa.tipo === 'acoes' && (
          <div className="space-y-2">
            {!membro.is_titular && permite('substituicao') && (
              <BotaoLance disabled={enviando} onClick={onSubstituir} destaque>
                <ArrowLeftRight size={16} /> Entrar em jogo
              </BotaoLance>
            )}
            {membro.is_titular && permite('gol') && (
              // A assistência é perguntada logo depois do gol.
              <div className={`grid gap-2 ${valores.length > 1 ? 'grid-cols-3' : 'grid-cols-1'}`}>
                {valores.map((valor) => (
                  <BotaoLance key={valor} disabled={enviando} onClick={() => onPonto(valor)} destaque>
                    {valores.length > 1 ? `${esporteLance} +${valor}` : esporteLance}
                  </BotaoLance>
                ))}
              </div>
            )}
            {(permite('amarelo') || permite('vermelho')) && (
              <div className="grid grid-cols-2 gap-2">
                {permite('amarelo') && (
                  <BotaoLance disabled={enviando} onClick={() => onLance({ tipo: 'amarelo', atleta_id: membro.atleta_id })}>
                    <span className="h-4 w-3 rounded-[3px] bg-yellow-400" /> Amarelo
                  </BotaoLance>
                )}
                {permite('vermelho') && (
                  <BotaoLance disabled={enviando} onClick={() => onLance({ tipo: 'vermelho', atleta_id: membro.atleta_id })}>
                    <span className="h-4 w-3 rounded-[3px] bg-red-500" /> Vermelho
                  </BotaoLance>
                )}
              </div>
            )}
            {membro.is_titular && permite('substituicao') && (
              <BotaoLance disabled={enviando || trocas.length === 0} onClick={onSubstituir}>
                <ArrowLeftRight size={16} />
                {trocas.length === 0 ? 'Banco vazio' : 'Substituir'}
              </BotaoLance>
            )}
            {!membro.is_titular && (
              <p className="pt-1 text-center text-xs text-gray-500">
                No banco não marca {esporteLance.toLowerCase()}.
              </p>
            )}
          </div>
        )}

        {etapa.tipo === 'assistencia' && (
          <div className="space-y-2">
            {companheiros.map((m) => (
              <OpcaoAtleta
                key={m.atleta_id}
                membro={m}
                disabled={enviando}
                onClick={() => onLance({ tipo: 'assistencia', atleta_id: m.atleta_id })}
              />
            ))}
            <button type="button" onClick={onFechar} disabled={enviando} className="btn-secondary w-full">
              Sem assistência
            </button>
          </div>
        )}

        {etapa.tipo === 'substituicao' && (
          <div className="space-y-2">
            {!membro.is_titular && (
              <button
                type="button"
                disabled={enviando}
                onClick={() => onLance({ tipo: 'substituicao', atleta_id: membro.atleta_id })}
                className="btn-primary flex w-full items-center justify-center gap-2"
              >
                Entrar sem tirar ninguém
              </button>
            )}
            {!membro.is_titular && trocas.length > 0 && (
              <p className="px-1 pt-1 text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">Ou no lugar de</p>
            )}
            {trocas.map((m) => (
              <OpcaoAtleta
                key={m.atleta_id}
                membro={m}
                disabled={enviando}
                onClick={() =>
                  onLance(
                    membro.is_titular
                      ? { tipo: 'substituicao', atleta_id: m.atleta_id, atleta_sai_id: membro.atleta_id }
                      : { tipo: 'substituicao', atleta_id: membro.atleta_id, atleta_sai_id: m.atleta_id },
                  )
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function BotaoLance({
  children,
  onClick,
  disabled,
  destaque = false,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  destaque?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-14 w-full items-center justify-center gap-2 rounded-2xl px-3 text-sm font-black transition-colors disabled:opacity-40 ${
        destaque
          ? 'bg-emerald-500 text-branco hover:bg-emerald-600'
          : 'border border-gray-700 bg-gray-950/40 text-gray-100 hover:border-gray-600'
      }`}
    >
      {children}
    </button>
  )
}

function OpcaoAtleta({ membro, onClick, disabled }: { membro: MembroPartida; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 rounded-2xl border border-gray-800 bg-gray-950/40 px-3 py-2.5 text-left transition-colors hover:border-emerald-500/40 disabled:opacity-40"
    >
      <Avatar src={membro.foto_url ?? undefined} name={membro.apelido || membro.nome} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-white">{membro.apelido || membro.nome}</p>
        <p className="text-[11px] uppercase tracking-wide text-gray-500">
          {labelPosicao(membro.posicao_escalacao || membro.posicao) || '—'} · {membro.is_titular ? 'em jogo' : 'banco'}
        </p>
      </div>
    </button>
  )
}
