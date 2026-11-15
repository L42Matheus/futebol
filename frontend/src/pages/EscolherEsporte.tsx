import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ESPORTES, type EsporteId } from '../esportes'
import { AnimacaoAtiva } from '../esportes/cena'
import { rachasApi } from '../services/api'
import { definirEsporteAtual, lerEsporteAtual } from '../utils/esporteEscolhido'

// Fundo de cada painel: a mesma cor do topo da cena animada, para a cena emendar no painel.
const COR_DO_ESPORTE: Record<EsporteId, string> = {
  futebol: '#0a1f1a',
  basquete: '#1e1033',
  volei: '#0c1a33',
}

// Tempo da expansão do painel tocado antes de seguir (igual ao .esporte-painel em index.css).
const EXPANSAO_MS = 450

// Página imersiva para escolher o esporte: tela cheia, sempre escura, um painel por esporte.
// Antes do login leva para "Sou atleta / Sou administrador"; logado, troca o esporte e volta ao início.
export default function EscolherEsporte() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const atual = lerEsporteAtual()
  const [contagem, setContagem] = useState<Partial<Record<EsporteId, number>>>({})
  // Esporte tocado: o painel dele cresce até ocupar a tela e então a navegação acontece.
  const [escolhido, setEscolhido] = useState<EsporteId | null>(null)
  const espera = useRef<number>()
  const prefereMenosMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => () => window.clearTimeout(espera.current), [])

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
    if (escolhido) return
    definirEsporteAtual(id)
    const destino = isAuthenticated ? '/app' : '/perfil'
    if (prefereMenosMovimento) {
      navigate(destino)
      return
    }
    setEscolhido(id)
    espera.current = window.setTimeout(() => navigate(destino), EXPANSAO_MS)
  }

  return (
    <div className="tema-escuro fixed inset-0 flex flex-col overflow-hidden bg-[#0b0f1a] text-white">
      {/* Topo sobre os painéis: voltar e a pergunta. Some quando um esporte é escolhido. */}
      <header
        className={`relative z-20 flex items-center gap-3 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] transition-opacity duration-300 ${
          escolhido ? 'opacity-0' : ''
        }`}
      >
        <Link
          to={isAuthenticated ? '/app' : '/'}
          aria-label="Voltar"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-black tracking-tight">Qual é o seu esporte?</h1>
          <p className="truncate text-xs text-white/55">O app mostra só os rachas, a escalação e o ranking dele.</p>
        </div>
      </header>

      <AnimacaoAtiva.Provider value={!prefereMenosMovimento}>
        <ul className="flex flex-1 flex-col">
          {ESPORTES.map(({ id, nome, Icone, Cena, modalidades }, indice) => {
            const ativo = isAuthenticated && id === atual
            const total = contagem[id] ?? 0
            const cor = COR_DO_ESPORTE[id]
            const estado = escolhido === null ? 'normal' : escolhido === id ? 'expandido' : 'recolhido'
            return (
              <li
                key={id}
                className="esporte-painel flex min-h-0"
                data-estado={estado}
                style={{ animationDelay: `${indice * 90}ms` }}
              >
                <button
                  type="button"
                  onClick={() => escolher(id)}
                  disabled={escolhido !== null}
                  aria-label={`${nome}: ${modalidades.map((m) => m.nome).join(', ')}`}
                  className="group relative flex w-full flex-1 overflow-hidden text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400"
                  style={{ backgroundColor: cor }}
                >
                  {/* Cena grande à direita, com a borda esquerda esmaecida na cor do painel. */}
                  <div className="esporte-cena absolute inset-y-0 -right-6 aspect-square" aria-hidden="true">
                    <Cena />
                    <div
                      className="absolute inset-y-0 left-0 w-1/2"
                      style={{ background: `linear-gradient(90deg, ${cor}, transparent)` }}
                    />
                  </div>
                  {/* Escurece o pé do painel para o texto ler bem sobre a cena. */}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent" aria-hidden="true" />

                  {ativo && <span className="absolute inset-y-0 left-0 w-1.5 bg-emerald-400" aria-hidden="true" />}

                  <div className="relative z-10 flex flex-1 flex-col justify-end p-5 pb-6">
                    <p className="flex items-center gap-2 text-4xl font-black tracking-tight text-white">
                      <Icone size={30} className="text-emerald-300" />
                      {nome}
                    </p>
                    <p className="mt-1.5 max-w-[60%] text-sm font-semibold text-white/65">
                      {modalidades.map((m) => m.nome).join(' · ')}
                    </p>
                    <p className="mt-3 inline-flex items-center gap-1.5 self-start rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold text-white backdrop-blur-sm transition-colors group-hover:bg-white/20">
                      {ativo ? (
                        <>
                          <Check size={15} strokeWidth={3} className="text-emerald-300" />
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
    </div>
  )
}
