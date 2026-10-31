import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeftRight, Check, Minus, Plus, RotateCcw, Share2, Shuffle, Zap } from 'lucide-react'
import Avatar from '../components/Avatar'
import { useToast } from '../context/ToastContext'
import { atletasApi, jogosApi, rachasApi, sorteioApi, teamsApi } from '../services/api'
import { esporteDaModalidade, getModalidade, labelPosicao } from '../esportes'
import type { Atleta } from '../types'

const NOMES = ['Verde', 'Azul', 'Vermelho', 'Amarelo', 'Preto', 'Branco']
const CORES = ['bg-emerald-500', 'bg-sky-500', 'bg-red-500', 'bg-yellow-400', 'bg-slate-700', 'bg-gray-200']
// Posição que não pode ficar toda num time só.
const POSICAO_ESPECIAL: Record<string, { posicao: string; nome: string }> = {
  futebol: { posicao: 'goleiro', nome: 'goleiros' },
  volei: { posicao: 'levantador', nome: 'levantadores' },
  basquete: { posicao: 'pivo', nome: 'pivôs' },
}
const INTERVALO_REVELACAO = 450

type Etapa = 'configurar' | 'revelando' | 'pronto'

function embaralhar<T>(lista: T[]): T[] {
  const copia = [...lista]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1)
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

// Sorteia em rodadas: cada atleta vai para o time com menos gente (empate decidido na sorte).
// Com "separar", os da posição especial são distribuídos primeiro, um por time.
function sortear(atletas: Atleta[], quantidade: number, especial: string | null): { time: number; atleta: Atleta }[] {
  const especiais = especial ? embaralhar(atletas.filter((a) => a.posicao === especial)) : []
  const resto = embaralhar(atletas.filter((a) => !especiais.includes(a)))
  const tamanhos = Array(quantidade).fill(0)
  const escolhas: { time: number; atleta: Atleta }[] = []
  for (const atleta of [...especiais, ...resto]) {
    const menor = Math.min(...tamanhos)
    const candidatos = tamanhos.map((t, i) => (t === menor ? i : -1)).filter((i) => i >= 0)
    const time = embaralhar(candidatos)[0]
    tamanhos[time] += 1
    escolhas.push({ time, atleta })
  }
  return escolhas
}

// Equilibrado: os mais bem avaliados são distribuídos um de cada vez, sempre para o time
// com menos gente e, no empate, o mais fraco. Quem não tem nota conta com a média dos avaliados.
function sortearEquilibrado(
  atletas: Atleta[],
  quantidade: number,
  especial: string | null,
): { time: number; atleta: Atleta }[] {
  const comNota = atletas.filter((a) => a.nota)
  const media = comNota.length ? comNota.reduce((t, a) => t + (a.nota ?? 0), 0) / comNota.length : 70
  const forca = (a: Atleta) => a.nota ?? media
  // Embaralha antes de ordenar para que notas iguais não caiam sempre no mesmo time.
  const ordenar = (lista: Atleta[]) => embaralhar(lista).sort((a, b) => forca(b) - forca(a))
  const especiais = especial ? ordenar(atletas.filter((a) => a.posicao === especial)) : []
  const resto = ordenar(atletas.filter((a) => !especiais.includes(a)))
  const tamanhos = Array(quantidade).fill(0)
  const somas = Array(quantidade).fill(0)
  const escolhas: { time: number; atleta: Atleta }[] = []
  for (const atleta of [...especiais, ...resto]) {
    const menor = Math.min(...tamanhos)
    const candidatos = tamanhos.map((t, i) => (t === menor ? i : -1)).filter((i) => i >= 0)
    const time = candidatos.sort((a, b) => somas[a] - somas[b])[0]
    tamanhos[time] += 1
    somas[time] += forca(atleta)
    escolhas.push({ time, atleta })
  }
  return escolhas
}

function forcaDoTime(time: Atleta[]): number | null {
  const notas = time.map((a) => a.nota).filter((n): n is number => Boolean(n))
  return notas.length ? Math.round(notas.reduce((t, n) => t + n, 0) / notas.length) : null
}

function nomeCurto(atleta: Atleta) {
  return atleta.apelido?.trim() || atleta.nome.split(' ').slice(0, 2).join(' ')
}

export default function Sorteio() {
  const { rachaId, jogoId } = useParams<{ rachaId: string; jogoId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [atletas, setAtletas] = useState<Atleta[]>([])
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set())
  const [confirmadosIds, setConfirmadosIds] = useState<Set<number>>(new Set())
  const [tipo, setTipo] = useState('')
  const [porTime, setPorTime] = useState(5)
  const [quantidade, setQuantidade] = useState(2)
  const [separar, setSeparar] = useState(true)
  const [equilibrar, setEquilibrar] = useState(true)
  const [timesExistentes, setTimesExistentes] = useState<string[]>([])
  const [etapa, setEtapa] = useState<Etapa>('configurar')
  const [escolhas, setEscolhas] = useState<{ time: number; atleta: Atleta }[]>([])
  const [reveladas, setReveladas] = useState(0)
  const [trocando, setTrocando] = useState<number | null>(null)
  const [salvando, setSalvando] = useState(false)
  const temporizador = useRef<number | null>(null)

  const carregar = useCallback(async () => {
    if (!rachaId || !jogoId) return
    try {
      const [rachaRes, atletasRes, listaRes, teamsRes, jogoRes] = await Promise.all([
        rachasApi.get(rachaId),
        atletasApi.list(rachaId),
        jogosApi.getLista(jogoId),
        teamsApi.list(rachaId),
        jogosApi.get(jogoId),
      ])
      if (!rachaRes.data.is_admin) {
        setErro('Só o admin do racha pode sortear os times.')
        return
      }
      if (jogoRes.data.iniciado_em) {
        setErro('A partida deste jogo já começou: o sorteio é feito antes do jogo.')
        return
      }
      const confirmados = new Set(listaRes.data.confirmados.map((c) => c.atleta_id))
      const padraoPorTime = rachaRes.data.escalacao_size || getModalidade(rachaRes.data.tipo).jogadoresPorTime
      const marcados = confirmados.size >= 2 ? confirmados : new Set(atletasRes.data.map((a) => a.id))
      setTipo(rachaRes.data.tipo)
      setAtletas(atletasRes.data)
      setConfirmadosIds(confirmados)
      setSelecionados(marcados)
      setPorTime(padraoPorTime)
      setQuantidade(Math.min(6, Math.max(2, Math.floor(marcados.size / padraoPorTime) || 2)))
      setTimesExistentes(teamsRes.data.map((t) => t.nome.toLowerCase()))
    } catch {
      setErro('Não foi possível carregar os atletas do jogo.')
    } finally {
      setCarregando(false)
    }
  }, [rachaId, jogoId])

  useEffect(() => {
    void carregar()
    return () => {
      if (temporizador.current) window.clearInterval(temporizador.current)
    }
  }, [carregar])

  const esporte = esporteDaModalidade(tipo)
  const especial = POSICAO_ESPECIAL[esporte.id]
  const jogadores = atletas.filter((a) => selecionados.has(a.id))
  const sobram = Math.max(0, jogadores.length - quantidade * porTime)
  const avaliados = jogadores.filter((a) => a.nota).length
  // O equilibrado só faz sentido com pelo menos dois atletas avaliados.
  const podeEquilibrar = avaliados >= 2

  const times = useMemo(() => {
    const lista: Atleta[][] = Array.from({ length: quantidade }, () => [])
    escolhas.slice(0, reveladas).forEach(({ time, atleta }) => lista[time].push(atleta))
    return lista
  }, [escolhas, reveladas, quantidade])

  function iniciarSorteio() {
    if (jogadores.length < quantidade) {
      toast(`Marque pelo menos ${quantidade} atletas para ${quantidade} times.`, 'error')
      return
    }
    if (temporizador.current) window.clearInterval(temporizador.current)
    const posicaoSeparada = separar && especial ? especial.posicao : null
    const novas = equilibrar && podeEquilibrar
      ? sortearEquilibrado(jogadores, quantidade, posicaoSeparada)
      : sortear(jogadores, quantidade, posicaoSeparada)
    setEscolhas(novas)
    setReveladas(0)
    setTrocando(null)
    setEtapa('revelando')
    let contador = 0
    temporizador.current = window.setInterval(() => {
      contador += 1
      setReveladas(contador)
      if (contador >= novas.length) {
        if (temporizador.current) window.clearInterval(temporizador.current)
        setEtapa('pronto')
      }
    }, INTERVALO_REVELACAO)
  }

  function revelarTudo() {
    if (temporizador.current) window.clearInterval(temporizador.current)
    setReveladas(escolhas.length)
    setEtapa('pronto')
  }

  // Toca em um atleta e depois em outro de outro time: os dois trocam de lugar.
  function tocarAtleta(atletaId: number) {
    if (etapa !== 'pronto') return
    if (trocando === null) {
      setTrocando(atletaId)
      return
    }
    if (trocando === atletaId) {
      setTrocando(null)
      return
    }
    setEscolhas((atual) => {
      const a = atual.findIndex((e) => e.atleta.id === trocando)
      const b = atual.findIndex((e) => e.atleta.id === atletaId)
      if (a < 0 || b < 0 || atual[a].time === atual[b].time) return atual
      const copia = [...atual]
      copia[a] = { ...copia[a], time: atual[b].time }
      copia[b] = { ...copia[b], time: atual[a].time }
      return copia
    })
    setTrocando(null)
  }

  function textoDosTimes() {
    const linhas = times.map((time, i) => {
      const titulares = time.slice(0, porTime).map(nomeCurto).join(', ')
      const banco = time.slice(porTime).map(nomeCurto)
      return `*${NOMES[i]}*: ${titulares}${banco.length ? ` (banco: ${banco.join(', ')})` : ''}`
    })
    return `Times sorteados no QuemJogaFC\n\n${linhas.join('\n')}`
  }

  async function compartilhar() {
    const texto = textoDosTimes()
    try {
      if (navigator.share) {
        await navigator.share({ text: texto })
        return
      }
      await navigator.clipboard.writeText(texto)
      toast('Times copiados. É só colar no grupo.', 'success')
    } catch {
      // compartilhamento cancelado
    }
  }

  async function confirmar() {
    if (!jogoId) return
    setSalvando(true)
    try {
      await sorteioApi.confirmar(jogoId, {
        jogadores_por_time: porTime,
        times: times.map((time, i) => ({ nome: NOMES[i], atletas: time.map((a) => a.id) })),
      })
      toast(`Times confirmados! ${NOMES[0]} x ${NOMES[1]} prontos para começar.`, 'success')
      navigate(`/racha/${rachaId}/jogo/${jogoId}`, { replace: true })
    } catch (e) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
      toast(typeof detail === 'string' ? detail : 'Não foi possível confirmar os times.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-500" />
      </div>
    )
  }

  if (erro) {
    return (
      <div className="card py-10 text-center">
        <p className="font-semibold text-white">{erro}</p>
        <button type="button" onClick={() => navigate(-1)} className="btn-secondary mt-4">
          Voltar
        </button>
      </div>
    )
  }

  const reaproveitados = NOMES.slice(0, quantidade).filter((n) => timesExistentes.includes(n.toLowerCase()))

  if (etapa === 'configurar') {
    return (
      <div className="space-y-5 pb-24">
        <section className="card space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black text-white">Quem vai jogar ({jogadores.length})</p>
            <div className="flex gap-3 text-xs font-bold">
              <button type="button" className="text-emerald-400" onClick={() => setSelecionados(new Set(confirmadosIds))}>
                Confirmados
              </button>
              <button type="button" className="text-gray-400" onClick={() => setSelecionados(new Set(atletas.map((a) => a.id)))}>
                Todos
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {atletas.map((a) => {
              const marcado = selecionados.has(a.id)
              return (
                <button
                  key={a.id}
                  type="button"
                  aria-pressed={marcado}
                  onClick={() =>
                    setSelecionados((atual) => {
                      const novo = new Set(atual)
                      if (novo.has(a.id)) novo.delete(a.id)
                      else novo.add(a.id)
                      return novo
                    })
                  }
                  className={`inline-flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-sm font-semibold transition-colors ${
                    marcado ? 'border-emerald-500 bg-emerald-500/10 text-white' : 'border-gray-800 text-gray-500'
                  }`}
                >
                  <Avatar src={a.foto_url} name={a.apelido || a.nome} size="xs" />
                  {nomeCurto(a)}
                  {marcado && <Check size={14} className="text-emerald-400" />}
                </button>
              )
            })}
          </div>
        </section>

        <section className="card space-y-4">
          <Contador rotulo="Times" valor={quantidade} min={2} max={6} onChange={setQuantidade} />
          <Contador rotulo="Jogadores por time" valor={porTime} min={1} max={15} onChange={setPorTime} />
          {especial && (
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span>
                <span className="block text-sm font-bold text-white">Separar {especial.nome}</span>
                <span className="block text-xs text-gray-500">Um por time antes de sortear o resto</span>
              </span>
              <input type="checkbox" checked={separar} onChange={(e) => setSeparar(e.target.checked)} className="h-5 w-5 accent-emerald-500" />
            </label>
          )}
          <label className={`flex items-center justify-between gap-3 ${podeEquilibrar ? 'cursor-pointer' : 'opacity-60'}`}>
            <span>
              <span className="block text-sm font-bold text-white">Equilibrar pelas notas</span>
              <span className="block text-xs text-gray-500">
                {podeEquilibrar
                  ? `${avaliados} de ${jogadores.length} têm nota na carta`
                  : 'Dê notas aos atletas na carta para usar'}
              </span>
            </span>
            <input
              type="checkbox"
              checked={equilibrar && podeEquilibrar}
              disabled={!podeEquilibrar}
              onChange={(e) => setEquilibrar(e.target.checked)}
              className="h-5 w-5 accent-emerald-500"
            />
          </label>
          <p className="rounded-xl bg-gray-800/60 px-3 py-2 text-center text-xs font-semibold text-gray-300">
            {quantidade} times de até {porTime}
            {sobram > 0 ? ` · ${sobram} vão para o banco` : ''}
          </p>
        </section>

        <button type="button" onClick={iniciarSorteio} className="btn-primary h-14 w-full text-base">
          <Shuffle size={20} /> Sortear times
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-gray-400">
          {etapa === 'revelando' ? `Sorteando... ${reveladas}/${escolhas.length}` : 'Times sorteados'}
        </p>
        {etapa === 'revelando' ? (
          <button type="button" onClick={revelarTudo} className="btn-secondary text-xs">
            <Zap size={14} /> Revelar tudo
          </button>
        ) : (
          <button type="button" onClick={iniciarSorteio} className="btn-secondary text-xs">
            <RotateCcw size={14} /> Sortear de novo
          </button>
        )}
      </div>

      {etapa === 'pronto' && (
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-gray-500">
          <ArrowLeftRight size={13} />
          {trocando ? 'Agora toque em quem vai trocar de lugar.' : 'Toque em dois atletas de times diferentes para trocar.'}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {times.map((time, i) => (
          <section key={NOMES[i]} className="min-w-0 overflow-hidden rounded-[1.5rem] border border-gray-800 bg-gray-900/40">
            <div className="flex items-center gap-2 border-b border-gray-800 px-3 py-2.5">
              <span className={`h-3 w-3 shrink-0 rounded-full ${CORES[i]}`} />
              <p className="flex-1 truncate text-sm font-black text-white">{NOMES[i]}</p>
              {forcaDoTime(time) !== null && (
                <span className="rounded-md bg-amber-500/15 px-1.5 text-xs font-black tabular-nums text-amber-400" title="Força: média das notas">
                  {forcaDoTime(time)}
                </span>
              )}
              <span className="text-xs font-bold text-gray-500">{time.length}</span>
            </div>
            <ul className="space-y-1 p-2">
              {time.map((atleta, posicao) => (
                <li key={atleta.id} className="animar-surgir">
                  {posicao === porTime && (
                    <p className="px-1 pb-1 pt-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Banco</p>
                  )}
                  <button
                    type="button"
                    onClick={() => tocarAtleta(atleta.id)}
                    className={`flex w-full items-center gap-2 rounded-xl px-1.5 py-1.5 text-left transition-colors ${
                      trocando === atleta.id ? 'bg-emerald-500/15 ring-1 ring-emerald-500' : 'hover:bg-gray-800/60'
                    }`}
                  >
                    <Avatar src={atleta.foto_url} name={atleta.apelido || atleta.nome} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-[13px] font-bold ${posicao >= porTime ? 'text-gray-400' : 'text-white'}`}>
                        {nomeCurto(atleta)}
                      </span>
                      <span className="block truncate text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                        {labelPosicao(atleta.posicao) || '—'}
                        {atleta.nota ? ` · ${atleta.nota}` : ''}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
              {time.length === 0 && <li className="px-1 py-3 text-center text-xs text-gray-600">…</li>}
            </ul>
          </section>
        ))}
      </div>

      {etapa === 'pronto' && (
        <div className="space-y-2">
          {reaproveitados.length > 0 && (
            <p className="text-center text-xs text-gray-500">
              {reaproveitados.length === 1 ? `O time ${reaproveitados[0]} do racha será atualizado` : `Os times ${reaproveitados.slice(0, -1).join(', ')} e ${reaproveitados[reaproveitados.length - 1]} do racha serão atualizados`} com este sorteio.
            </p>
          )}
          <button type="button" disabled={salvando} onClick={() => void confirmar()} className="btn-primary h-12 w-full">
            <Check size={18} /> {salvando ? 'Confirmando...' : 'Confirmar times'}
          </button>
          <button type="button" onClick={() => void compartilhar()} className="btn-secondary h-11 w-full">
            <Share2 size={16} /> Compartilhar no grupo
          </button>
        </div>
      )}
    </div>
  )
}

function Contador({
  rotulo,
  valor,
  min,
  max,
  onChange,
}: {
  rotulo: string
  valor: number
  min: number
  max: number
  onChange: (valor: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-bold text-white">{rotulo}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`Menos ${rotulo.toLowerCase()}`}
          disabled={valor <= min}
          onClick={() => onChange(valor - 1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-700 text-gray-300 disabled:opacity-30"
        >
          <Minus size={16} />
        </button>
        <span className="w-6 text-center text-lg font-black tabular-nums text-white">{valor}</span>
        <button
          type="button"
          aria-label={`Mais ${rotulo.toLowerCase()}`}
          disabled={valor >= max}
          onClick={() => onChange(valor + 1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-700 text-gray-300 disabled:opacity-30"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  )
}
