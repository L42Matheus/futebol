import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ESPORTES, type EsporteId } from '../esportes'
import { AnimacaoAtiva } from '../esportes/cena'
import { rachasApi } from '../services/api'
import { definirEsporteAtual, lerEsporteAtual } from '../utils/esporteEscolhido'

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
    <div className="min-h-screen bg-fundo px-4 pb-10 pt-6 text-white">
      <div className="mx-auto max-w-md">
        <Link
          to={isAuthenticated ? '/app' : '/'}
          className="inline-flex items-center gap-1.5 rounded-xl py-2 pr-3 text-sm font-semibold text-gray-400 hover:text-white"
        >
          <ArrowLeft size={18} /> Voltar
        </Link>

        <header className="mt-4 text-center">
          <h1 className="text-3xl font-black tracking-tight">Qual é o seu esporte?</h1>
          <p className="mt-2 text-sm text-gray-400">
            O app mostra só o que é dele: rachas, escalação, placar e ranking.
            {isAuthenticated ? ' Dá para trocar quando quiser.' : ''}
          </p>
        </header>

        <AnimacaoAtiva.Provider value={!prefereMenosMovimento}>
          <ul className="mt-6 space-y-3">
            {ESPORTES.map(({ id, nome, Icone, Cena, modalidades }) => {
              const ativo = isAuthenticated && id === atual
              const total = contagem[id] ?? 0
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => escolher(id)}
                    className={`flex w-full items-center gap-4 overflow-hidden rounded-3xl border-2 bg-gray-900/40 p-3 text-left transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                      ativo ? 'border-emerald-500' : 'border-gray-800 hover:border-gray-600'
                    }`}
                  >
                    <div className="tema-escuro h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-950">
                      <Cena />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-xl font-black">
                        <Icone size={20} className="text-emerald-400" />
                        {nome}
                      </p>
                      <p className="mt-1 truncate text-sm text-gray-400">{modalidades.map((m) => m.nome).join(' · ')}</p>
                      {isAuthenticated && (
                        <p className="mt-1.5 text-xs font-semibold text-gray-500">
                          {total === 0 ? 'Nenhum racha ainda' : `${total} racha${total === 1 ? '' : 's'}`}
                        </p>
                      )}
                    </div>
                    {ativo ? (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-branco">
                        <Check size={18} />
                      </span>
                    ) : (
                      <ChevronRight size={22} className="shrink-0 text-gray-500" />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </AnimacaoAtiva.Provider>
      </div>
    </div>
  )
}
