import { Link, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { ShieldCheck, UserCircle2, Trophy, ArrowLeftRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getEsporte } from '../esportes'
import { AnimacaoAtiva } from '../esportes/cena'
import { COR_DO_ESPORTE } from '../esportes/cores'
import { lerEsporteAtual } from '../utils/esporteEscolhido'

export default function ChooseRole() {
  const navigate = useNavigate()
  const { isAuthenticated, loading } = useAuth()
  const escolhido = lerEsporteAtual()
  const esporte = escolhido ? getEsporte(escolhido) : null

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/app', { replace: true })
    }
  }, [isAuthenticated, loading, navigate])

  function handleChoose(role: 'atleta' | 'admin') {
    navigate(`/login?fromRole=${role}`)
  }

  return (
    <div className="min-h-screen bg-fundo flex flex-col">
      {esporte && escolhido ? (
        // Esporte escolhido na página /esporte: o painel tocado lá se transforma neste cartão.
        <div className="px-4 pt-6">
          <div className="mx-auto max-w-md">
            <Link to="/" aria-label="Ir para a página inicial" className="inline-flex items-center gap-2 text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-branco">
                <Trophy size={16} />
              </span>
              <span className="text-lg font-black">QuemJoga</span>
            </Link>

            <div
              className="tema-escuro relative mt-5 flex h-36 overflow-hidden rounded-3xl"
              style={{ backgroundColor: COR_DO_ESPORTE[escolhido], viewTransitionName: 'esporte-cartao' }}
            >
              <div className="absolute inset-y-0 -right-4 aspect-square" aria-hidden="true">
                <AnimacaoAtiva.Provider value={!window.matchMedia('(prefers-reduced-motion: reduce)').matches}>
                  <esporte.Cena />
                </AnimacaoAtiva.Provider>
                <div
                  className="absolute inset-y-0 left-0 w-1/2"
                  style={{ background: `linear-gradient(90deg, ${COR_DO_ESPORTE[escolhido]}, transparent)` }}
                />
              </div>
              <div className="relative z-10 flex flex-1 flex-col justify-between p-5">
                <p
                  className="flex items-center gap-2 self-start text-3xl font-black tracking-tight text-white"
                  style={{ viewTransitionName: 'esporte-nome' }}
                >
                  <esporte.Icone size={26} className="text-emerald-300" />
                  {esporte.nome}
                </p>
                <Link
                  to="/esporte"
                  className="inline-flex items-center gap-1.5 self-start rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm hover:bg-white/20"
                >
                  <ArrowLeftRight size={13} /> Trocar esporte
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="pt-12 pb-8 px-6 text-center">
          <Link to="/" aria-label="Ir para a página inicial" className="inline-block">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-600 text-branco flex items-center justify-center shadow-lg">
              <Trophy size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white">QuemJoga</h1>
          </Link>
          <p className="text-gray-400 mt-1">Organize seu time sem estresse</p>
        </div>
      )}

      {/* Cards */}
      <div className="flex-1 px-4 pb-8">
        <div className="max-w-md mx-auto space-y-4">
          <p className={`text-sm text-gray-500 ${esporte ? 'mt-6 mb-3 px-1 font-bold uppercase tracking-wider text-xs' : 'text-center mb-6'}`}>
            Como você vai usar o app?
          </p>

          {/* Card Atleta */}
          <button
            className="w-full bg-gray-900/40 rounded-2xl p-6 border-2 border-gray-800 hover:border-emerald-500 transition-all active:scale-[0.98]"
            onClick={() => handleChoose('atleta')}
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0">
                <UserCircle2 size={32} />
              </div>
              <div className="text-left flex-1">
                <h2 className="text-lg font-semibold text-white">Sou Atleta</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Recebi um convite para participar de um clube
                </p>
                <ul className="mt-3 space-y-1">
                  <li className="text-xs text-gray-500 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                    Confirmar presença nos jogos
                  </li>
                  <li className="text-xs text-gray-500 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                    Ver calendário e estatísticas
                  </li>
                </ul>
              </div>
            </div>
          </button>

          {/* Card Admin */}
          <button
            className="w-full bg-gray-900/40 rounded-2xl p-6 border-2 border-gray-800 hover:border-emerald-500 transition-all active:scale-[0.98]"
            onClick={() => handleChoose('admin')}
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={32} />
              </div>
              <div className="text-left flex-1">
                <h2 className="text-lg font-semibold text-white">Sou Administrador</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Quero criar e gerenciar meu próprio clube
                </p>
                <ul className="mt-3 space-y-1">
                  <li className="text-xs text-gray-500 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                    Convidar atletas
                  </li>
                  <li className="text-xs text-gray-500 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                    Gerenciar pagamentos e times
                  </li>
                </ul>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="pb-8 px-4 text-center">
        <p className="text-xs text-gray-500">
          Você pode alterar isso depois nas configurações
        </p>
      </div>
    </div>
  )
}
