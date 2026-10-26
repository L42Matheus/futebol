import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, TimerReset } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocalTimer } from '../hooks/useLocalTimer'
import { formatTimer } from '../utils/localTimer'
import { getEsporte, type Esporte } from '../esportes'
import { useEsporteDoRacha } from '../esportes/useEsporteDoRacha'
import PlacarVolei from '../esportes/volei/Placar'

const SELECTED_RACHA_KEY = 'quemjogafc:selected_racha_id'
const PERIODO_KEY = 'quemjogafc:periodo'
// Classes completas para o Tailwind; a quantidade de opções muda com o esporte.
const GRID_COLS: Record<number, string> = { 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6' }

function lerRachaSelecionado() {
  try {
    return localStorage.getItem(SELECTED_RACHA_KEY)
  } catch {
    return null
  }
}

export default function Tempo() {
  const navigate = useNavigate()
  const esporte = useEsporteDoRacha(lerRachaSelecionado()) ?? getEsporte('futebol')
  const { placar, Icone } = esporte

  return (
    <div className="min-h-[calc(100vh-9rem)] flex flex-col justify-center">
      <div className="mx-auto w-full max-w-xl space-y-8">
        <div className="text-center">
          <p className="inline-flex items-center gap-1.5 text-[10px] uppercase font-black tracking-[0.24em] text-emerald-400">
            <Icone size={14} /> {esporte.nome}
          </p>
          <h1 className="mt-2 text-2xl font-black text-white">{placar.titulo}</h1>
        </div>

        {placar.tipo === 'pontos' ? (
          <PlacarVolei opcoes={placar.pontosPorSet} padrao={placar.padrao} />
        ) : (
          <Cronometro esporte={esporte} />
        )}

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-full rounded-2xl border border-gray-800 bg-gray-900/40 px-4 py-4 text-sm font-black text-gray-300 transition-colors hover:border-gray-700 hover:text-white"
        >
          Voltar
        </button>
      </div>
    </div>
  )
}

function lerPeriodo() {
  try {
    return Math.max(1, Number(localStorage.getItem(PERIODO_KEY)) || 1)
  } catch {
    return 1
  }
}

function Cronometro({ esporte }: { esporte: Esporte }) {
  const placar = esporte.placar
  const minutosPreset = placar.tipo === 'tempo' ? placar.minutos : []
  const periodo = placar.tipo === 'tempo' ? placar.periodo : undefined
  const { timer, setDuration, start, pause, reset } = useLocalTimer()
  const [periodoAtual, setPeriodoAtual] = useState(lerPeriodo)

  useEffect(() => {
    try {
      localStorage.setItem(PERIODO_KEY, String(periodoAtual))
    } catch {
      // sem storage o período só não sobrevive a um recarregamento
    }
  }, [periodoAtual])

  function mudarPeriodo(delta: 1 | -1) {
    if (!periodo) return
    const proximo = Math.min(periodo.total, Math.max(1, periodoAtual + delta))
    if (proximo === periodoAtual) return
    setPeriodoAtual(proximo)
    reset()
  }
  const [customMinutes, setCustomMinutes] = useState(String(Math.floor(timer.durationSeconds / 60)))

  const durationMinutes = Math.floor(timer.durationSeconds / 60)
  const elapsedSeconds = timer.durationSeconds - timer.remainingSeconds
  const progress = useMemo(() => {
    if (timer.durationSeconds <= 0) return 0
    return Math.min(100, Math.max(0, (elapsedSeconds / timer.durationSeconds) * 100))
  }, [elapsedSeconds, timer.durationSeconds])

  function handleSetPreset(minutes: number) {
    setCustomMinutes(String(minutes))
    setDuration(minutes)
  }

  function handleCustomApply() {
    const minutes = Number(customMinutes)
    if (!Number.isFinite(minutes) || minutes <= 0) return
    setDuration(minutes)
  }

  const statusLabel =
    timer.status === 'running'
      ? 'Rodando'
      : timer.status === 'paused'
        ? 'Pausado'
        : timer.status === 'finished'
          ? periodo ? `Fim do ${periodoAtual}º ${periodo.nome}` : 'Tempo encerrado'
          : 'Pronto'

  return (
    <>
      <div className="rounded-[2rem] border border-gray-800 bg-gray-900/40 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-gray-400">{durationMinutes} min</p>
            <p className="mt-1 text-xs font-semibold text-emerald-400">{statusLabel}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
            <TimerReset size={24} />
          </div>
        </div>

        {periodo && (
          <div className="mt-5 flex items-center justify-between rounded-2xl border border-gray-800 bg-gray-950/40 p-1.5">
            <button
              type="button"
              onClick={() => mudarPeriodo(-1)}
              disabled={periodoAtual === 1}
              aria-label={`${periodo.nome} anterior`}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-300 hover:bg-gray-800 disabled:opacity-30"
            >
              <ChevronLeft size={20} />
            </button>
            <p className="text-sm font-black text-white">
              {periodoAtual}º {periodo.nome} <span className="font-semibold text-gray-500">de {periodo.total}</span>
            </p>
            <button
              type="button"
              onClick={() => mudarPeriodo(1)}
              disabled={periodoAtual === periodo.total}
              aria-label={`Próximo ${periodo.nome}`}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-300 hover:bg-gray-800 disabled:opacity-30"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        <div className="py-10 text-center">
          <p className="text-7xl font-black tabular-nums text-white sm:text-8xl">
            {formatTimer(timer.remainingSeconds)}
          </p>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={timer.status === 'running' ? pause : start}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 font-black text-white transition-colors hover:bg-emerald-600"
          >
            {timer.status === 'running' ? <Pause size={22} /> : <Play size={22} />}
            {timer.status === 'running' ? 'Pausar' : 'Iniciar'}
          </button>
          <button
            type="button"
            onClick={() => {
              reset()
              setPeriodoAtual(1)
            }}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-gray-700 bg-gray-950/40 px-4 font-black text-gray-200 transition-colors hover:border-gray-600 hover:text-white"
          >
            <RotateCcw size={20} />
            Zerar
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <p className="px-1 text-[10px] uppercase font-black tracking-widest text-gray-500">
          {periodo ? `Duração do ${periodo.nome}` : 'Duração'}
        </p>
        <div className={`grid gap-2 ${GRID_COLS[minutosPreset.length] ?? 'grid-cols-4'}`}>
          {minutosPreset.map((minutes) => (
            <button
              key={minutes}
              type="button"
              onClick={() => handleSetPreset(minutes)}
              className={`h-12 rounded-2xl border text-sm font-black transition-colors ${
                durationMinutes === minutes
                  ? 'border-emerald-400 bg-emerald-500 text-white'
                  : 'border-gray-800 bg-gray-900/40 text-gray-300 hover:border-emerald-500/40'
              }`}
            >
              {minutes}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            inputMode="numeric"
            value={customMinutes}
            onChange={(event) => setCustomMinutes(event.target.value)}
            onBlur={handleCustomApply}
            className="input h-12 flex-1"
            aria-label="Minutos do cronometro"
          />
          <button
            type="button"
            onClick={handleCustomApply}
            className="h-12 rounded-2xl bg-gray-800 px-5 text-sm font-black text-gray-100 transition-colors hover:bg-gray-700"
          >
            Definir
          </button>
        </div>
      </div>
    </>
  )
}
