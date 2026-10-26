import { useEffect, useState } from 'react'
import { Minus, Plus, RotateCcw, Trophy } from 'lucide-react'

const CHAVE = 'quemjogafc:placar_volei'
const TIMES = ['Time A', 'Time B'] as const

type Lado = 0 | 1

interface Estado {
  alvo: number
  pontos: [number, number]
  sets: [number, number]
}

function estadoInicial(alvo: number): Estado {
  return { alvo, pontos: [0, 0], sets: [0, 0] }
}

function ler(alvoPadrao: number): Estado {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? 'null') as Estado | null
    if (salvo && Array.isArray(salvo.pontos) && Array.isArray(salvo.sets) && salvo.alvo > 0) return salvo
  } catch {
    // placar salvo inválido ou storage bloqueado: começa do zero
  }
  return estadoInicial(alvoPadrao)
}

// O set acaba quando alguém chega ao alvo com 2 pontos de vantagem.
export function vencedorDoSet({ alvo, pontos: [a, b] }: Estado): Lado | null {
  if (a >= alvo && a - b >= 2) return 0
  if (b >= alvo && b - a >= 2) return 1
  return null
}

export default function PlacarVolei({ opcoes, padrao }: { opcoes: number[]; padrao: number }) {
  const [estado, setEstado] = useState(() => ler(padrao))
  const vencedor = vencedorDoSet(estado)
  const setAtual = estado.sets[0] + estado.sets[1] + 1

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(estado))
    } catch {
      // sem storage o placar só não sobrevive a um recarregamento
    }
  }, [estado])

  function marcar(lado: Lado, delta: 1 | -1) {
    if (vencedor !== null && delta > 0) return
    setEstado((e) => {
      const pontos: [number, number] = [...e.pontos]
      pontos[lado] = Math.max(0, pontos[lado] + delta)
      return { ...e, pontos }
    })
  }

  function proximoSet() {
    if (vencedor === null) return
    setEstado((e) => {
      const sets: [number, number] = [...e.sets]
      sets[vencedor] += 1
      return { ...e, pontos: [0, 0], sets }
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-gray-800 bg-gray-900/40 p-5">
        <p className="text-center text-sm font-bold text-gray-400">
          {setAtual}º set · até {estado.alvo} pontos
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {TIMES.map((nome, i) => {
            const lado = i as Lado
            const ganhou = vencedor === lado
            return (
              <div
                key={nome}
                className={`rounded-3xl border p-4 text-center transition-colors ${
                  ganhou ? 'border-emerald-400 bg-emerald-500/10' : 'border-gray-800 bg-gray-950/40'
                }`}
              >
                <p className="text-sm font-black text-white">{nome}</p>
                <p className="mt-1 text-xs font-semibold text-gray-500">
                  {estado.sets[lado]} {estado.sets[lado] === 1 ? 'set' : 'sets'}
                </p>
                <p className="my-4 text-6xl font-black tabular-nums text-white sm:text-7xl">{estado.pontos[lado]}</p>
                <button
                  type="button"
                  onClick={() => marcar(lado, 1)}
                  disabled={vencedor !== null}
                  aria-label={`Ponto para ${nome}`}
                  className="flex h-14 w-full items-center justify-center rounded-2xl bg-emerald-500 text-branco transition-colors hover:bg-emerald-600 disabled:opacity-40"
                >
                  <Plus size={26} />
                </button>
                <button
                  type="button"
                  onClick={() => marcar(lado, -1)}
                  aria-label={`Tirar ponto de ${nome}`}
                  className="mt-2 flex h-9 w-full items-center justify-center rounded-xl border border-gray-700 text-gray-400 transition-colors hover:text-white"
                >
                  <Minus size={16} />
                </button>
              </div>
            )
          })}
        </div>

        {vencedor !== null && (
          <div className="mt-5 flex flex-col items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 sm:flex-row sm:justify-between">
            <p className="flex items-center gap-2 font-black text-emerald-300">
              <Trophy size={18} /> Set do {TIMES[vencedor]}!
            </p>
            <button type="button" onClick={proximoSet} className="btn-primary w-full sm:w-auto">
              Próximo set
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <p className="px-1 text-[10px] font-black uppercase tracking-widest text-gray-500">Set de</p>
        <div className="grid grid-cols-3 gap-2">
          {opcoes.map((alvo) => (
            <button
              key={alvo}
              type="button"
              onClick={() => setEstado((e) => ({ ...e, alvo }))}
              className={`h-12 rounded-2xl border text-sm font-black transition-colors ${
                estado.alvo === alvo
                  ? 'border-emerald-400 bg-emerald-500 text-branco'
                  : 'border-gray-800 bg-gray-900/40 text-gray-300 hover:border-emerald-500/40'
              }`}
            >
              {alvo} pontos
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setEstado(estadoInicial(estado.alvo))}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-gray-700 bg-gray-950/40 text-sm font-black text-gray-200 transition-colors hover:border-gray-600 hover:text-white"
        >
          <RotateCcw size={18} /> Zerar partida
        </button>
      </div>
    </div>
  )
}
