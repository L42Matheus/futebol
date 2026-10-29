import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Send } from 'lucide-react'
import PaginaInstitucional from '../components/PaginaInstitucional'
import { useAuth } from '../context/AuthContext'
import { suporteApi } from '../services/api'

const ASSUNTOS = [
  ['duvida', 'Dúvida'],
  ['problema', 'Problema no app'],
  ['sugestao', 'Sugestão'],
  ['dados', 'Excluir conta ou dados'],
  ['outro', 'Outro'],
] as const

type Assunto = (typeof ASSUNTOS)[number][0]

// Aberta sem login: serve também como contato da loja e da política de privacidade.
export default function Suporte() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const assuntoInicial = ASSUNTOS.some(([id]) => id === params.get('assunto')) ? (params.get('assunto') as Assunto) : 'duvida'
  const [form, setForm] = useState({
    nome: user?.nome || '',
    email: user?.email || '',
    assunto: assuntoInicial as Assunto,
    mensagem: '',
    site: '',
  })
  const [erros, setErros] = useState<Record<string, string>>({})
  const [erroGeral, setErroGeral] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [protocolo, setProtocolo] = useState<string | null>(null)

  // O login carrega depois da página: preenche nome e e-mail quando chegar, sem apagar o que já foi digitado.
  useEffect(() => {
    if (!user) return
    setForm((atual) => ({
      ...atual,
      nome: atual.nome || user.nome || '',
      email: atual.email || user.email || '',
    }))
  }, [user])

  function validar() {
    const novos: Record<string, string> = {}
    if (form.nome.trim().length < 2) novos.nome = 'Informe seu nome.'
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) novos.email = 'Informe um e-mail válido para a resposta.'
    if (form.mensagem.trim().length < 10) novos.mensagem = 'Conte um pouco mais (pelo menos 10 letras).'
    return novos
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    const novos = validar()
    setErros(novos)
    setErroGeral('')
    if (Object.keys(novos).length > 0) return
    setEnviando(true)
    try {
      const res = await suporteApi.enviar({
        nome: form.nome.trim(),
        email: form.email.trim(),
        assunto: form.assunto,
        mensagem: form.mensagem.trim(),
        pagina: params.get('de') || undefined,
        site: form.site || undefined,
      })
      setProtocolo(res.data.protocolo)
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
      setErroGeral(typeof detail === 'string' ? detail : 'Não foi possível enviar agora. Tente de novo em instantes.')
    } finally {
      setEnviando(false)
    }
  }

  if (protocolo) {
    return (
      <PaginaInstitucional titulo="Suporte">
        <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
          <CheckCircle2 size={40} className="mx-auto text-emerald-400" />
          <p className="mt-3 text-lg font-black text-white">Mensagem enviada!</p>
          <p className="mt-1 text-sm text-gray-400">
            Protocolo <strong className="text-white">{protocolo}</strong>. A resposta chega no e-mail {form.email}.
          </p>
          <Link to={user ? '/app' : '/'} className="btn-primary mt-5">
            Voltar
          </Link>
        </section>
      </PaginaInstitucional>
    )
  }

  const campo = (nome: keyof typeof form) => ({
    value: form[nome],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm({ ...form, [nome]: e.target.value })
      if (erros[nome]) setErros({ ...erros, [nome]: '' })
    },
  })

  return (
    <PaginaInstitucional titulo="Suporte">
      <p>Teve um problema, ficou com dúvida ou tem uma ideia para o app? Manda aqui que a gente responde por e-mail.</p>

      <form onSubmit={(e) => void enviar(e)} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="suporte-nome">Nome</label>
            <input id="suporte-nome" className={`input ${erros.nome ? '!border-red-500' : ''}`} {...campo('nome')} />
            {erros.nome && <p className="mt-1.5 text-xs font-medium text-red-400">{erros.nome}</p>}
          </div>
          <div>
            <label className="label" htmlFor="suporte-email">E-mail para resposta</label>
            <input
              id="suporte-email"
              type="email"
              inputMode="email"
              className={`input ${erros.email ? '!border-red-500' : ''}`}
              {...campo('email')}
            />
            {erros.email && <p className="mt-1.5 text-xs font-medium text-red-400">{erros.email}</p>}
          </div>
        </div>

        <div>
          <p className="label">Assunto</p>
          <div className="flex flex-wrap gap-2">
            {ASSUNTOS.map(([id, nome]) => (
              <button
                key={id}
                type="button"
                onClick={() => setForm({ ...form, assunto: id })}
                className={`rounded-full border px-3.5 py-2 text-sm font-bold transition-colors ${
                  form.assunto === id
                    ? 'border-emerald-400 bg-emerald-500 text-branco'
                    : 'border-gray-700 text-gray-300 hover:border-emerald-500/40'
                }`}
              >
                {nome}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="suporte-mensagem">Mensagem</label>
          <textarea
            id="suporte-mensagem"
            rows={6}
            maxLength={4000}
            placeholder={
              form.assunto === 'problema'
                ? 'O que aconteceu? Em qual tela? Se puder, conte o passo a passo.'
                : 'Escreva sua mensagem.'
            }
            className={`input resize-y ${erros.mensagem ? '!border-red-500' : ''}`}
            {...campo('mensagem')}
          />
          {erros.mensagem && <p className="mt-1.5 text-xs font-medium text-red-400">{erros.mensagem}</p>}
        </div>

        {/* Armadilha para robôs: escondida de pessoas e de leitores de tela. */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
          value={form.site}
          onChange={(e) => setForm({ ...form, site: e.target.value })}
        />

        {erroGeral && (
          <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {erroGeral}
          </div>
        )}

        <button type="submit" disabled={enviando} className="btn-primary h-12 w-full">
          <Send size={17} /> {enviando ? 'Enviando...' : 'Enviar mensagem'}
        </button>
      </form>
    </PaginaInstitucional>
  )
}
