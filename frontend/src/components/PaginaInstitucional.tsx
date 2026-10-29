import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

// Moldura das páginas públicas (privacidade, exclusão de conta): abrem sem login.
export default function PaginaInstitucional({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-fundo text-white">
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-6">
        <Link to="/" className="flex items-center gap-3">
          <img src="/icons/icon-192.png" alt="" className="h-10 w-10 rounded-xl" />
          <span className="text-lg font-black tracking-tight">
            QuemJoga<span className="text-emerald-400">FC</span>
          </span>
        </Link>
        <Link to="/app" className="text-sm font-bold text-gray-400 hover:text-white">
          Abrir o app
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-5 pb-16">
        <h1 className="text-3xl font-black tracking-tight">{titulo}</h1>
        <div className="mt-6 space-y-6 text-[15px] leading-7 text-gray-300">{children}</div>
        <footer className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t border-gray-800 pt-6 text-sm text-gray-500">
          <Link to="/privacidade" className="hover:text-white">Privacidade</Link>
          <Link to="/excluir-conta" className="hover:text-white">Excluir conta</Link>
          <Link to="/suporte" className="hover:text-white">Suporte</Link>
          <Link to="/" className="hover:text-white">Início</Link>
        </footer>
      </main>
    </div>
  )
}
