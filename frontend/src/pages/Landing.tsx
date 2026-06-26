import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const features = [
  {
    title: 'Agenda sem bagunça',
    description: 'Marque jogos, acompanhe confirmações e deixe todo mundo na mesma página.',
    icon: <CalendarCheck size={22} />,
  },
  {
    title: 'Atletas organizados',
    description: 'Centralize perfis, presença, posição, número e participação de cada jogador.',
    icon: <Users size={22} />,
  },
  {
    title: 'Times e temporada',
    description: 'Crie times, registre resultados e evolua para campeões do mês.',
    icon: <Trophy size={22} />,
  },
  {
    title: 'Caixa mais claro',
    description: 'Visualize pendências e deixe o financeiro preparado organizado.',
    icon: <DollarSign size={22} />,
  },
]

const steps = [
  'Crie seu racha',
  'Convide atletas',
  'Marque jogos',
  'Acompanhe ranking, caixa e temporada',
]

export default function Landing() {
  const { isAuthenticated } = useAuth()
  const appPath = isAuthenticated ? '/app' : '/perfil'

  return (
    <div className="min-h-screen overflow-hidden bg-[#0b0f1a] text-white">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute top-80 -left-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-20 -right-24 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 font-black text-white shadow-lg shadow-emerald-950/40">
            QJ
          </div>
          <span className="text-xl font-black tracking-tight">
            QuemJoga<span className="text-emerald-400">FC</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to="/perfil"
            className="hidden rounded-2xl px-4 py-2 text-sm font-bold text-gray-300 transition-colors hover:text-white sm:inline-flex"
          >
            Entrar
          </Link>
          <Link
            to={appPath}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-black text-white shadow-lg shadow-emerald-950/40 transition-transform active:scale-[0.98]"
          >
            Começar <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-5 pb-16">
        <section className="grid items-center gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
              <Sparkles size={14} />
              Para campo, society e futsal
            </div>

            <h1 className="max-w-3xl text-4xl font-black leading-[0.98] tracking-tight text-white sm:text-6xl">
              Organize seu racha sem planilha, cobrança no grito ou grupo bagunçado.
            </h1>

            <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-gray-400">
              O QuemJogaFC junta agenda, atletas, times, placares, ranking e caixa em uma
              experiência simples para quem só quer jogar e organizar melhor.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to={appPath}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-4 text-base font-black text-white shadow-2xl shadow-emerald-950/40 transition-transform active:scale-[0.98]"
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

            <div className="mt-8 flex flex-wrap gap-3 text-sm font-bold text-gray-400">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 size={17} className="text-emerald-400" /> Gerencie seu time
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 size={17} className="text-emerald-400" /> Tenha seu perfil de atleta
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 size={17} className="text-emerald-400" /> Acompanhe progresso e presença
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute inset-0 rounded-[3rem] bg-emerald-500/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2.5rem] border border-gray-800 bg-gray-950/80 p-4 shadow-2xl shadow-black/40">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-400">
                    Racha selecionado
                  </p>
                  <p className="text-xl font-black">LombaFC 7x7</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-sm font-black text-emerald-300">
                  LM
                </div>
              </div>

              <div className="rounded-[2rem] border border-emerald-500/20 bg-gradient-to-br from-gray-900 to-emerald-950/40 p-5">
                <p className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-400">
                  Próximo jogo
                </p>
                <p className="text-3xl font-black">Sábado, 16:00</p>
                <p className="mt-2 text-sm font-semibold text-gray-400">Arena Society</p>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-gray-800">
                  <div className="h-full w-3/4 rounded-full bg-emerald-400" />
                </div>
                <button className="mt-5 w-full rounded-2xl bg-emerald-500 py-3 text-sm font-black">
                  Ver chamada
                </button>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  ['Atletas', '18'],
                  ['Caixa', 'R$ 420'],
                  ['Ranking', 'João #1'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-gray-800 bg-gray-900/60 p-3">
                    <p className="text-[10px] font-black uppercase text-gray-500">{label}</p>
                    <p className="mt-1 text-lg font-black">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-[2rem] border border-gray-800 bg-gray-900/40 p-5">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                {feature.icon}
              </div>
              <h3 className="text-lg font-black">{feature.title}</h3>
              <p className="mt-2 text-sm font-medium leading-6 text-gray-400">{feature.description}</p>
            </div>
          ))}
        </section>

        <section className="my-10 overflow-hidden rounded-[2.5rem] border border-gray-800 bg-gray-900/40 p-6 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
                <ClipboardList size={24} />
              </div>
              <h2 className="text-3xl font-black">Do convite ao placar, em poucos toques.</h2>
              <p className="mt-3 text-gray-400">
                A ideia é tirar o peso da organização e deixar o racha com cara de app de verdade.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {steps.map((step, index) => (
                <div key={step} className="rounded-3xl border border-gray-800 bg-[#0b0f1a]/70 p-5">
                  <p className="text-sm font-black text-emerald-400">0{index + 1}</p>
                  <p className="mt-2 text-lg font-black">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[2.5rem] border border-emerald-500/20 bg-emerald-500/10 p-6 text-center sm:p-10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white">
            <ShieldCheck size={28} />
          </div>
          <h2 className="text-3xl font-black">Pronto para testar com sua galera?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-gray-300">
            Crie o racha, convide os atletas e valide o fluxo completo antes de ir para produção.
          </p>
          <Link
            to={appPath}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-base font-black text-gray-950 transition-transform active:scale-[0.98]"
          >
            Começar agora <ArrowRight size={19} />
          </Link>
        </section>
      </main>
    </div>
  )
}
