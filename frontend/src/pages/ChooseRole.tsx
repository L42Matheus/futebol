import { Link, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { ArrowLeftRight, CalendarPlus, CheckCircle2, SquareUser, Layers, Radio, Trophy, UserPlus, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { getEsporte } from '../esportes'
import { AnimacaoAtiva } from '../esportes/cena'
import { COR_DO_ESPORTE } from '../esportes/cores'
import { MASCOTE_ADMIN, mascoteDoAtleta } from '../esportes/mascotes'
import { lerEsporteAtual } from '../utils/esporteEscolhido'

type Recurso = { icone: ReactNode; texto: string }

// O que cada papel faz no app, com ícone. Os do atleta usam os termos do esporte escolhido.
function ListaRecursos({ itens }: { itens: Recurso[] }) {
  return (
    <ul className="mt-3 space-y-1.5">
      {itens.map(({ icone, texto }) => (
        <li key={texto} className="flex items-start gap-2 text-[13px] leading-snug text-gray-400">
          <span className="mt-0.5 shrink-0 text-emerald-500">{icone}</span>
          {texto}
        </li>
      ))}
    </ul>
  )
}

const RECURSOS_ADMIN: Recurso[] = [
  { icone: <UserPlus size={14} />, texto: 'Convidar a galera por link' },
  { icone: <CalendarPlus size={14} />, texto: 'Marcar jogos e presença' },
  { icone: <Layers size={14} />, texto: 'Montar times e escalação' },
  { icone: <Radio size={14} />, texto: 'Comandar a partida ao vivo' },
  { icone: <Wallet size={14} />, texto: 'Controlar o caixa' },
]

export default function ChooseRole() {
  const navigate = useNavigate()
  const { isAuthenticated, loading } = useAuth()
  const escolhido = lerEsporteAtual()
  const esporte = escolhido ? getEsporte(escolhido) : null
  const mascoteAtleta = mascoteDoAtleta(escolhido)
  // "Seus gols", "Suas cestas", "Seus pontos"; sem esporte escolhido, os três.
  const pontuacao = esporte
    ? `${esporte.id === 'basquete' ? 'Suas' : 'Seus'} ${esporte.pontuacao.toLowerCase()} no ranking`
    : 'Gols, cestas e pontos no ranking'
  const recursosAtleta: Recurso[] = [
    { icone: <CheckCircle2 size={14} />, texto: 'Confirmar presença nos jogos' },
    { icone: <SquareUser size={14} />, texto: 'Sua carta com foto e notas' },
    { icone: <Trophy size={14} />, texto: pontuacao },
    { icone: <Radio size={14} />, texto: 'Placar e lances ao vivo' },
    { icone: <Wallet size={14} />, texto: 'Mensalidades em dia' },
  ]

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
              <img src="/icons/icon-192.png" alt="" className="h-9 w-9 rounded-xl" />
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
            <img src="/icons/icon-192.png" alt="" className="mx-auto mb-4 h-20 w-20 rounded-2xl shadow-lg shadow-emerald-950/30" />
            <h1 className="text-2xl font-bold text-white">QuemJoga</h1>
          </Link>
          <p className="text-gray-400 mt-1">Organize seu clube sem estresse</p>
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
              {/* Atleta do esporte escolhido (no futebol, o garoto com a bola); sem um próprio, o apito. */}
              <img
                src={mascoteAtleta.src}
                alt=""
                width={mascoteAtleta.largura}
                height={mascoteAtleta.altura}
                className={`h-20 w-20 shrink-0 object-contain ${mascoteAtleta.busto ? 'mascote-busto' : ''}`}
              />
              <div className="text-left flex-1">
                <h2 className="text-lg font-semibold text-white">Sou Atleta</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Recebi um convite para participar de um clube
                </p>
                <ListaRecursos itens={recursosAtleta} />
              </div>
            </div>
          </button>

          {/* Card Admin */}
          <button
            className="w-full bg-gray-900/40 rounded-2xl p-6 border-2 border-gray-800 hover:border-emerald-500 transition-all active:scale-[0.98]"
            onClick={() => handleChoose('admin')}
          >
            <div className="flex items-start gap-4">
              {/* Mascote de crachá ADM e notebook: o organizador do clube. */}
              <img src={MASCOTE_ADMIN.src} alt="" width={MASCOTE_ADMIN.largura} height={MASCOTE_ADMIN.altura} className="h-20 w-20 shrink-0 object-contain" />
              <div className="text-left flex-1">
                <h2 className="text-lg font-semibold text-white">Sou Administrador</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Quero criar e gerenciar meu próprio clube
                </p>
                <ListaRecursos itens={RECURSOS_ADMIN} />
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="pb-8 px-4 text-center">
        <p className="text-xs text-gray-500">
          A mesma conta pode ser atleta num clube e administrador em outro.
        </p>
      </div>
    </div>
  )
}
