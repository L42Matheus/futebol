import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ESPORTES, type EsporteId } from '../esportes'
import { AnimacaoAtiva } from '../esportes/cena'
import { rachasApi } from '../services/api'
import { definirEsporteAtual, lerEsporteAtual } from '../utils/esporteEscolhido'

// Fundo de cada cartão: a mesma cor do topo da cena animada, para a cena emendar no cartão.
const COR_DO_ESPORTE: Record<EsporteId, string> = {
  futebol: '#0a1f1a',
  basquete: '#1e1033',
  volei: '#0c1a33',
}

// Página só para escolher o esporte. Antes do login leva para "Sou atleta / Sou administrador";
// já logado, troca o esporte do app e volta para a tela inicial.
export default function EscolherEsporte() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const atual = lerEsporteAtual()
  const [contagem, setContagem] = useState<Partial<Record<EsporteId, number>>>({})
  const prefereMenosMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Logado: mostra quantos rachas a pessoa já tem em cada esporte.
  useEffect(() => {
    if (!isAuthenticated) return
    rachasApi
      .listTodos()
      .then(({ data }) => {
        const mapa: Partial<Record<EsporteId, number>> = {}
        data.forEach((racha) => {
          mapa[racha.esporte] = (mapa[racha.esporte] ?? 0) + 1
        })
        setContagem(mapa)
      })
      .catch(() => undefined)
  }, [isAuthenticated])

  function escolher(id: EsporteId) {
    definirEsporteAtual(id)
    navigate(isAuthenticated ? '/app' : '/perfil')
  }

  return (
    // A página ocupa a altura da tela: cabeçalho curto e os três esportes dividindo o resto.
    <div className="flex min-h-[100dvh] flex-col bg-fundo px-4 pb-6 pt-4 text-white">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <Link
          to={isAuthenticated ? '/app' : '/'}
          className="inline-flex items-center gap-1.5 self-start rounded-xl py-2 pr-3 text-sm font-semibold text-gray-400 hover:text-white"
        >
          <ArrowLeft size={18} /> Voltar
        </Link>

        <header className="mt-2">
          <h1 className="text-3xl font-black tracking-tight">Qual é o seu esporte?</h1>
          <p className="mt-1.5 text-sm text-gray-400">O app mostra só os rachas, a escalação e o ranking dele.</p>
        </header>

        <AnimacaoAtiva.Provider value={!prefereMenosMovimento}>
          <ul className="mt-5 flex flex-1 flex-col gap-3">
            {ESPORTES.map(({ id, nome, Icone, Cena, modalidades }) => {
              const ativo = isAuthenticated && id === atual
              const total = contagem[id] ?? 0
              const cor = COR_DO_ESPORTE[id]
              return (
                <li key={id} className="flex flex-1">
                  <button
                    type="button"
                    onClick={() => escolher(id)}
                    aria-label={`${nome}: ${modalidades.map((m) => m.nome).join(', ')}`}
                    className={`tema-escuro group relative flex min-h-[9.5rem] w-full flex-1 overflow-hidden rounded-3xl text-left shadow-lg shadow-black/10 transition-transform active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                      ativo ? 'ring-2 ring-emerald-400' : ''
                    }`}
                    style={{ backgroundColor: cor }}
                  >
                    {/* Cena animada à direita, emendada no fundo do cartão pelo degradê. */}
                    <div className="absolute inset-y-0 right-0 aspect-square" aria-hidden="true">
                      <Cena />
                      {/* Esmaece a borda esquerda da cena na cor do cartão, sem emenda visível. */}
                      <div
                        className="absolute inset-y-0 left-0 w-1/2"
                        style={{ background: `linear-gradient(90deg, ${cor}, transparent)` }}
                      />
                    </div>

                    <div className="relative z-10 flex flex-1 flex-col justify-between p-5">
                      <div>
                        <p className="flex items-center gap-2 text-2xl font-black text-white">
                          <Icone size={22} className="text-emerald-300" />
                          {nome}
                        </p>
                        <div className="mt-2 flex max-w-[56%] flex-wrap gap-1.5">
                          {modalidades.map((m) => (
                            <span key={m.id} className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white/80">
                              {m.nome}
                            </span>
                          ))}
                        </div>
                      </div>

                      <p className="mt-3 flex items-center gap-1.5 text-sm font-bold text-white">
                        {ativo ? (
                          <>
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-slate-900">
                              <Check size={13} strokeWidth={3} />
                            </span>
                            Você está aqui
                          </>
                        ) : (
                          <>
                            {isAuthenticated && total > 0 ? `${total} racha${total === 1 ? '' : 's'} · Entrar` : 'Escolher'}
                            <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                          </>
                        )}
                      </p>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </AnimacaoAtiva.Provider>

        <p className="mt-4 text-center text-xs text-gray-500">Dá para trocar de esporte quando quiser, pela tela inicial.</p>
      </div>
    </div>
  )
}
