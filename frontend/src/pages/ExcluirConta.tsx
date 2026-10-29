import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, Trash2 } from 'lucide-react'
import PaginaInstitucional from '../components/PaginaInstitucional'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { authApi } from '../services/api'

const PALAVRA = 'EXCLUIR'

// Página pública pedida pelas lojas: dá para excluir a conta sem instalar o app.
export default function ExcluirConta() {
  const { isAuthenticated, user, logout } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [confirmacao, setConfirmacao] = useState('')
  const [excluindo, setExcluindo] = useState(false)

  async function excluir() {
    setExcluindo(true)
    try {
      await authApi.excluirConta()
      logout()
      toast('Sua conta foi excluída.', 'success')
      navigate('/', { replace: true })
    } catch {
      toast('Não foi possível excluir a conta agora. Tente de novo.', 'error')
      setExcluindo(false)
    }
  }

  return (
    <PaginaInstitucional titulo="Excluir conta">
      <p>
        Você pode excluir sua conta do QuemJogaFC quando quiser. A exclusão é imediata e não tem volta.
      </p>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4">
          <p className="font-black text-white">O que é apagado</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            <li>Seu login (e-mail, telefone e senha)</li>
            <li>Seu perfil e sua foto</li>
            <li>Seu acesso de admin aos rachas</li>
            <li>Os avisos enviados para o seu celular</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4">
          <p className="font-black text-white">O que fica no racha</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            <li>Seu nome no histórico de jogos, presença e caixa, sem ligação com nenhuma conta</li>
            <li>Racha que ficar sem nenhum admin é desativado</li>
          </ul>
        </div>
      </section>

      {isAuthenticated ? (
        <section className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 shrink-0 text-red-400" size={20} />
            <div className="min-w-0">
              <p className="font-black text-white">Excluir a conta {user?.email || user?.telefone || ''}</p>
              <p className="mt-1 text-sm text-gray-400">
                Para confirmar, digite <strong className="text-white">{PALAVRA}</strong> abaixo.
              </p>
            </div>
          </div>
          <input
            className="input mt-4"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            placeholder={PALAVRA}
            autoCapitalize="characters"
            aria-label={`Digite ${PALAVRA} para confirmar`}
          />
          <button
            type="button"
            disabled={confirmacao.trim().toUpperCase() !== PALAVRA || excluindo}
            onClick={() => void excluir()}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-600 text-sm font-black text-branco transition-colors hover:bg-red-700 disabled:opacity-40"
          >
            <Trash2 size={17} />
            {excluindo ? 'Excluindo...' : 'Excluir minha conta'}
          </button>
        </section>
      ) : (
        <section className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5">
          <p className="font-black text-white">Entre na sua conta para excluir</p>
          <p className="mt-1 text-sm text-gray-400">
            Por segurança, a exclusão é feita com a conta aberta. Depois de entrar, você volta para esta página.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login', { state: { from: { pathname: '/excluir-conta' } } })}
            className="btn-primary mt-4 w-full"
          >
            Entrar
          </button>
        </section>
      )}

      <p className="text-sm">
        Não consegue entrar?{' '}
        <Link to="/suporte?assunto=dados&de=/excluir-conta" className="font-bold text-emerald-400 hover:underline">
          Peça a exclusão pelo suporte
        </Link>{' '}
        informando o e-mail ou telefone da conta.
      </p>

      <p className="text-sm text-gray-500">
        Veja também a <Link to="/privacidade" className="text-emerald-400 hover:underline">política de privacidade</Link>.
      </p>
    </PaginaInstitucional>
  )
}
