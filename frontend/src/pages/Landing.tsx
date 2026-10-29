import { Link } from 'react-router-dom'
import {
  ArrowLeftRight,
  ArrowRight,
  CalendarCheck,
  DollarSign,
  LayoutGrid,
  Link2,
  Moon,
  Radio,
  Sun,
  Trophy,
  Users,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ESPORTES, getEsporte } from '../esportes'
import { AnimacaoAtiva } from '../esportes/cena'
import { useTema } from '../hooks/useTema'
import EscudoTime from '../components/EscudoTime'

const destaques = [
  { titulo: 'Ao vivo', icone: <Radio size={18} /> },
  { titulo: 'Escalação', icone: <LayoutGrid size={18} /> },
  { titulo: 'Caixa', icone: <DollarSign size={18} /> },
]

const recursos = [
  {
    titulo: 'Partida ao vivo',
    texto: 'Gols, cestas e pontos lançados na hora, com assistência, cartões e placar que todo mundo acompanha pelo celular.',
    icone: <Radio size={22} />,
    cor: 'bg-emerald-500/10 text-emerald-400',
  },
  {
    titulo: 'Escalação e substituições',
    texto: 'Monte o campo ou a quadra, mexa no banco e faça substituições durante o jogo sem perder o histórico.',
    icone: <ArrowLeftRight size={22} />,
    cor: 'bg-sky-500/10 text-sky-400',
  },
  {
    titulo: 'Agenda e presença',
    texto: 'Marque os jogos com dia e horário e veja quem confirmou, sem caçar resposta no grupo.',
    icone: <CalendarCheck size={22} />,
    cor: 'bg-violet-500/10 text-violet-400',
  },
  {
    titulo: 'Ranking',
    texto: 'Artilharia e estatísticas de cada atleta saem direto dos lances da partida.',
    icone: <Trophy size={22} />,
    cor: 'bg-amber-500/10 text-amber-400',
  },
  {
    titulo: 'Caixa organizado',
    texto: 'Mensalidades, multas de cartão e quem está pendente, tudo em um lugar.',
    icone: <DollarSign size={22} />,
    cor: 'bg-emerald-500/10 text-emerald-400',
  },
  {
    titulo: 'Times e atletas',
    texto: 'Perfil de cada atleta, times do racha e convite por um único link.',
    icone: <Users size={22} />,
    cor: 'bg-rose-500/10 text-rose-400',
  },
]

const passos = [
  { titulo: 'Crie o racha', texto: 'Futebol, basquete ou vôlei, com a modalidade certa.' },
  { titulo: 'Convide pelo link', texto: 'Mande no grupo e a galera entra sozinha.' },
  { titulo: 'Marque o jogo', texto: 'Dia, horário, local e lista de presença.' },
  { titulo: 'Comande ao vivo', texto: 'Placar, lances e substituições na hora.' },
]

// Exemplo de lances no celular da landing: o que o admin registra durante o jogo.
const lancesExemplo = [
  { minuto: "18'", tipo: 'gol', texto: 'Gol de João', detalhe: 'assist. Pedro' },
  { minuto: "15'", tipo: 'troca', texto: 'Entrou Lucas', detalhe: 'saiu Davi' },
  { minuto: "9'", tipo: 'cartao', texto: 'Cartão amarelo', detalhe: 'Caio' },
] as const

export default function Landing() {
  const { isAuthenticated } = useAuth()
  const appPath = isAuthenticated ? '/app' : '/perfil'
  const { claro, alternar: alternarTema } = useTema()
  const prefereMenosMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const BolaFutebol = getEsporte('futebol').Icone

  return (
    <div className="min-h-screen overflow-hidden bg-fundo text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute top-80 -left-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-20 -right-24 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <header className="relative mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-5 sm:px-5">
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <img src="/icons/icon-192.png" alt="" className="h-10 w-10 shrink-0 rounded-xl shadow-lg shadow-emerald-950/30" />
          <span className="truncate text-lg font-black tracking-tight sm:text-xl">
            QuemJoga<span className="text-emerald-400">FC</span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={alternarTema}
            aria-label={claro ? 'Usar tema escuro' : 'Usar tema claro'}
            title={claro ? 'Tema escuro' : 'Tema claro'}
            className="rounded-xl p-2.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          >
            {claro ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <Link
            to="/perfil"
            className="hidden rounded-xl px-3 py-2 text-sm font-bold text-gray-300 transition-colors hover:text-white sm:inline-flex"
          >
            Entrar
          </Link>
          <Link
            to={appPath}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-sm font-black text-branco shadow-lg shadow-emerald-950/30 transition-transform active:scale-[0.98]"
          >
            Começar <ArrowRight size={15} />
          </Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 pb-10 sm:px-5">
        <section className="grid items-center gap-10 pb-10 pt-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
          <div className="text-center lg:text-left">
            <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
              {ESPORTES.map(({ id, nome, Icone }) => (
                <span
                  key={id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-emerald-300"
                >
                  <Icone size={14} />
                  {nome}
                </span>
              ))}
            </div>

            <h1 className="mx-auto mt-6 max-w-xl text-[2.5rem] font-black leading-[1.02] tracking-tight text-white sm:text-6xl lg:mx-0">
              Seu racha organizado, do convite ao placar ao vivo.
            </h1>

            <p className="mx-auto mt-5 max-w-lg text-base font-medium leading-7 text-gray-400 sm:text-lg lg:mx-0">
              Agenda, presença, escalação, partida ao vivo, ranking e caixa num app só, para quem quer jogar e não
              perder tempo organizando.
            </p>

            <div className="mx-auto mt-8 flex max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center lg:justify-start">
              <Link
                to={appPath}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-4 text-base font-black text-branco shadow-xl shadow-emerald-950/30 transition-transform active:scale-[0.98]"
              >
                Criar meu racha <ArrowRight size={19} />
              </Link>
              <Link
                to="/perfil"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-700 bg-gray-900/60 px-6 py-4 text-base font-black text-gray-100 transition-colors hover:border-emerald-500/40"
              >
                Já tenho conta
              </Link>
            </div>

            <div className="mx-auto mt-8 grid max-w-sm grid-cols-3 gap-2 lg:mx-0">
              {destaques.map((item) => (
                <div
                  key={item.titulo}
                  className="flex flex-col items-center gap-1.5 rounded-2xl border border-gray-800 bg-gray-900/40 px-2 py-3"
                >
                  <span className="text-emerald-400">{item.icone}</span>
                  <span className="text-xs font-bold text-gray-300">{item.titulo}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Celular de exemplo: sempre escuro, como o placar ao vivo no app. */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute inset-6 rounded-[3rem] bg-emerald-500/25 blur-3xl" />
            <div className="tema-escuro relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-950 p-4 shadow-2xl shadow-black/40">
              <div className="rounded-[1.75rem] bg-gradient-to-br from-sky-900 via-slate-900 to-emerald-800 px-4 py-5 text-center">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Ao vivo
                  </span>
                  <span className="text-sm font-black tabular-nums text-white/80">32:14</span>
                </div>
                <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <EscudoTime nome="Verde" cor="emerald" />
                  <p className="text-5xl font-black leading-none tabular-nums text-white">
                    2<span className="mx-2 align-middle text-2xl text-white/40">x</span>1
                  </p>
                  <EscudoTime nome="Azul" cor="sky" />
                </div>
              </div>

              <p className="mb-2 mt-4 px-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/50">Lances</p>
              <ul className="space-y-2">
                {lancesExemplo.map((lance) => (
                  <li key={lance.minuto} className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-3 py-2.5">
                    <span className="w-7 text-xs font-black tabular-nums text-white/50">{lance.minuto}</span>
                    {lance.tipo === 'gol' && (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                        <BolaFutebol size={15} />
                      </span>
                    )}
                    {lance.tipo === 'troca' && (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/15 text-sky-300">
                        <ArrowLeftRight size={14} />
                      </span>
                    )}
                    {lance.tipo === 'cartao' && (
                      <span className="flex h-7 w-7 items-center justify-center">
                        <span className="h-4 w-3 rounded-[3px] bg-yellow-400" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">{lance.texto}</span>
                    <span className="shrink-0 text-xs text-white/50">{lance.detalhe}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  ['Atletas', '18'],
                  ['Caixa', 'R$ 420'],
                  ['Artilheiro', 'João'],
                ].map(([rotulo, valor]) => (
                  <div key={rotulo} className="rounded-2xl bg-white/[0.04] px-2 py-2.5 text-center">
                    <p className="text-[9px] font-black uppercase tracking-wider text-white/45">{rotulo}</p>
                    <p className="mt-0.5 truncate text-sm font-black text-white">{valor}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-6">
          <div className="rounded-[2rem] border border-gray-800 bg-gray-900/40 p-3 sm:rounded-[2.5rem] sm:p-6">
            <div className="mb-4 px-2 text-center sm:mb-6 sm:flex sm:items-end sm:justify-between sm:text-left">
              <h2 className="text-2xl font-black sm:text-3xl">Uma arena, três quadras.</h2>
              <p className="mt-1 text-sm font-medium text-gray-400">Racha de futebol, basquete ou vôlei no mesmo app.</p>
            </div>
            <AnimacaoAtiva.Provider value={!prefereMenosMovimento}>
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {ESPORTES.map(({ id, nome, Icone, Cena }) => (
                  <figure key={id} className="overflow-hidden rounded-[1.25rem] border border-gray-800 bg-fundo sm:rounded-[2rem]">
                    <div className="aspect-square">
                      <Cena />
                    </div>
                    <figcaption className="flex items-center justify-center gap-1.5 border-t border-gray-800/80 py-2.5 text-[10px] font-black uppercase tracking-[0.06em] text-gray-300 sm:py-3 sm:text-xs sm:tracking-[0.18em]">
                      <Icone size={15} />
                      {nome}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </AnimacaoAtiva.Provider>
          </div>
        </section>

        <section className="py-10">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-black sm:text-3xl">Tudo que o racha precisa</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">Do grupo bagunçado ao jogo comandado pelo celular.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recursos.map((recurso) => (
              <div key={recurso.titulo} className="flex gap-4 rounded-[1.5rem] border border-gray-800 bg-gray-900/40 p-4">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${recurso.cor}`}>
                  {recurso.icone}
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-white">{recurso.titulo}</h3>
                  <p className="mt-1 text-sm leading-6 text-gray-400">{recurso.texto}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-gray-800 bg-gray-900/40 p-5 sm:p-8">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
              <Link2 size={22} />
            </div>
            <h2 className="text-2xl font-black sm:text-3xl">Do convite ao placar, em quatro passos</h2>
          </div>

          <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {passos.map((passo, index) => (
              <li key={passo.titulo} className="flex gap-3 rounded-2xl border border-gray-800 bg-fundo/70 p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-black text-branco">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-black text-white">{passo.titulo}</p>
                  <p className="mt-0.5 text-sm text-gray-400">{passo.texto}</p>
                </div>
              </li>
            ))}
          </ol>

          <Link
            to={appPath}
            className="mx-auto mt-6 flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-4 text-base font-black text-branco shadow-xl shadow-emerald-950/30 transition-transform active:scale-[0.98]"
          >
            Criar meu racha <ArrowRight size={19} />
          </Link>
        </section>
      </main>

      <footer className="relative mx-auto flex max-w-6xl flex-col items-center gap-3 border-t border-gray-800 px-5 py-6 text-sm text-gray-500 sm:flex-row sm:justify-between">
        <span>© {new Date().getFullYear()} QuemJogaFC</span>
        <nav className="flex gap-5">
          <Link to="/privacidade" className="hover:text-white">Privacidade</Link>
          <Link to="/excluir-conta" className="hover:text-white">Excluir conta</Link>
          <Link to="/suporte?de=/" className="hover:text-white">Suporte</Link>
        </nav>
      </footer>
    </div>
  )
}
