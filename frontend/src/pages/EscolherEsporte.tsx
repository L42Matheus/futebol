import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ESPORTES, type EsporteId } from '../esportes'
import CartaoEsporte from '../components/CartaoEsporte'
import { rachasApi } from '../services/api'
import { definirEsporteAtual, lerEsporteAtual } from '../utils/esporteEscolhido'
import { comTransicao, suportaTransicao } from '../utils/transicao'

// Tempo da expansão do painel tocado antes de seguir (igual ao .esporte-painel em index.css).
const EXPANSAO_MS = 450

// Página para escolher o esporte: um cartão verde por esporte, com o atleta animado.
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
    // Navegador com View Transitions: o painel tocado se transforma no cartão do esporte da
    // próxima tela (mesmo view-transition-name). Sem suporte, o painel cresce e então navega.
    if (suportaTransicao()) {
      setEscolhido(id)
      comTransicao(() => navigate(destino))
      return
    }
    setEscolhido(id)
    espera.current = window.setTimeout(() => navigate(destino), EXPANSAO_MS)
  }

  return (
    // Página clara (segue o tema do app) com os três cartões verdes; o tocado vira o cartão da próxima tela.
    <div className="fixed inset-0 flex flex-col overflow-y-auto bg-fundo text-white">
      <header
        className={`flex items-center gap-3 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))] transition-opacity duration-300 ${
          escolhido ? 'opacity-0' : ''
        }`}
      >
        <Link
          to={isAuthenticated ? '/app' : '/'}
          aria-label="Voltar"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-800/60 text-white transition-colors hover:bg-gray-800"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-black tracking-tight">Qual é o seu esporte?</h1>
          <p className="truncate text-xs text-gray-400">O app mostra só os clubes, a escalação e o ranking dele.</p>
        </div>
      </header>

      <ul className="mx-auto flex w-full max-w-md flex-1 flex-col gap-7 px-4 pb-6 pt-10">
        {ESPORTES.map(({ id, nome, modalidades }, indice) => {
          const ativo = isAuthenticated && id === atual
          const total = contagem[id] ?? 0
          const estado = escolhido === null ? 'normal' : escolhido === id ? 'expandido' : 'recolhido'
          return (
            <li
              key={id}
              className="esporte-painel flex min-h-[9.5rem]"
              data-estado={estado}
              style={{ animationDelay: `${indice * 90}ms` }}
            >
              <button
                type="button"
                onClick={() => escolher(id)}
                disabled={escolhido !== null}
                aria-label={`${nome}: ${modalidades.map((m) => m.nome).join(', ')}`}
                className={`group flex w-full flex-1 rounded-3xl text-left transition-transform active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                  ativo ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-fundo' : ''
                }`}
              >
                <CartaoEsporte
                  esporte={id}
                  animar={!prefereMenosMovimento}
                  transicao={escolhido === id}
                  className="h-full w-full"
                  classeMascote="h-[112%]"
                  // Basquete à esquerda: os cartões alternam de lado e a página fica menos repetitiva.
                  lado={id === 'basquete' ? 'esquerda' : 'direita'}
                  // Só o futebol lista as modalidades (Society · Campo · Futsal); basquete e vôlei ficam sem
                  // os formatos 5x5, 3x3, 6x6 e 4x4, que se escolhem depois, ao criar o clube.
                  subtitulo={id === 'futebol' ? modalidades.map((m) => m.nome).join(' · ') : undefined}
                >
                  <span className={`inline-flex items-center gap-1.5 ${id === 'basquete' ? 'self-end' : 'self-start'} rounded-full bg-white/20 px-3 py-1.5 text-sm font-bold text-white backdrop-blur-sm transition-colors group-hover:bg-white/30`}>
                    {ativo ? (
                      <>
                        <Check size={15} strokeWidth={3} />
                        Você está aqui
                      </>
                    ) : (
                      <>
                        {isAuthenticated && total > 0 ? `${total} clube${total === 1 ? '' : 's'} · Entrar` : 'Escolher'}
                        <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </span>
                </CartaoEsporte>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
