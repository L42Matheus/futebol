import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { profileApi, rachasApi } from '../services/api'
import Avatar from '../components/Avatar'
import { Camera, Save, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const posicaoLabels: Record<string, string> = {
  goleiro: 'Goleiro',
  zagueiro: 'Zagueiro',
  lateral: 'Lateral',
  volante: 'Volante',
  meia: 'Meia',
  atacante: 'Atacante',
  ponta: 'Ponta',
}

const pernaLabels: Record<string, string> = {
  direita: 'Direita',
  esquerda: 'Esquerda',
  ambidestra: 'Ambidestra',
}

const MENSAGEM_CAMPO: Record<string, string> = {
  nome: 'Use até 100 caracteres.',
  apelido: 'Use até 50 caracteres.',
  telefone: 'Use até 20 caracteres.',
  posicao: 'Escolha uma posição da lista.',
  perna_boa: 'Escolha uma opção da lista.',
  numero_camisa: 'O número da camisa vai de 1 a 99.',
}

function ErroCampo({ mensagem }: { mensagem?: string }) {
  if (!mensagem) return null
  return <p className="mt-1.5 text-xs font-medium text-red-400">{mensagem}</p>
}

const OPCIONAL = <span className="font-normal text-gray-500">(opcional)</span>

export default function NoRacha() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasRacha, setHasRacha] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [form, setForm] = useState({
    nome: '',
    apelido: '',
    telefone: '',
    posicao: '',
    perna_boa: '',
    numero_camisa: '',
  })
  const [erros, setErros] = useState<Record<string, string>>({})
  const [erroGeral, setErroGeral] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, rachasRes] = await Promise.all([
          profileApi.me(),
          rachasApi.list(),
        ])
        setProfile(profileRes.data)
        setHasRacha(Array.isArray(rachasRes.data) && rachasRes.data.length > 0)
        setForm({
          nome: profileRes.data.nome || '',
          apelido: profileRes.data.apelido || '',
          telefone: profileRes.data.telefone || '',
          posicao: profileRes.data.posicao || '',
          perna_boa: profileRes.data.perna_boa || '',
          numero_camisa: profileRes.data.numero_camisa?.toString() || '',
        })
      } catch (error) {
        console.error('Erro ao carregar perfil básico:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function validar(): Record<string, string> {
    const novos: Record<string, string> = {}
    if (!form.nome.trim()) novos.nome = 'Informe seu nome.'
    if (form.numero_camisa) {
      const numero = Number(form.numero_camisa)
      if (!Number.isInteger(numero) || numero < 1 || numero > 99) {
        novos.numero_camisa = 'O número da camisa vai de 1 a 99.'
      }
    }
    return novos
  }

  async function handleSave() {
    const novos = validar()
    setErros(novos)
    setErroGeral('')
    if (Object.keys(novos).length > 0) return

    setSaving(true)
    try {
      // Campos opcionais em branco vão como null: o backend recusa "" em posição e perna boa.
      const opcional = (valor: string) => valor.trim() || null
      const res = await profileApi.update({
        nome: form.nome.trim(),
        apelido: opcional(form.apelido),
        telefone: opcional(form.telefone),
        posicao: opcional(form.posicao),
        perna_boa: opcional(form.perna_boa),
        numero_camisa: form.numero_camisa ? Number(form.numero_camisa) : null,
      } as any)
      setProfile(res.data)
      navigate('/perfil-atleta', { replace: true })
    } catch (e) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
      if (Array.isArray(detail)) {
        // 422 do FastAPI: aponta o campo com problema.
        const porCampo: Record<string, string> = {}
        for (const item of detail) {
          const campo = item?.loc?.[item.loc.length - 1]
          if (typeof campo === 'string') porCampo[campo] = MENSAGEM_CAMPO[campo] || 'Valor inválido.'
        }
        setErros(porCampo)
        setErroGeral('Confira os campos destacados.')
      } else {
        setErroGeral(typeof detail === 'string' ? detail : 'Não foi possível salvar o perfil. Tente de novo.')
      }
    } finally {
      setSaving(false)
    }
  }

  function campo(nome: keyof typeof form, valor: string) {
    setForm({ ...form, [nome]: valor })
    if (erros[nome]) setErros({ ...erros, [nome]: '' })
  }

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/app')
  }

  function handleLogoutAction() {
    logout()
    navigate('/perfil', { replace: true })
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const res = await profileApi.uploadFoto(file)
      setProfile(res.data)
    } catch {
      alert('Erro ao enviar foto.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-fundo flex flex-col">
      <div className="max-w-3xl mx-auto w-full px-4 pt-8 pb-10 space-y-6">
        <div className="card p-5">
          <h1 className="text-xl font-bold text-white">
            {hasRacha ? 'Edite seu perfil' : 'Voce ainda nao esta em nenhum racha'}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {hasRacha
              ? 'Mantenha seus dados atualizados para facilitar sua identificacao no racha.'
              : 'Peca ao administrador do racha para enviar um convite e liberar seu acesso.'}
          </p>
        </div>

        <div className="card p-6 space-y-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar src={profile?.foto_url} name={form.apelido || form.nome || 'Atleta'} size="xl" />
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-primary-700 transition-colors"
              >
                <Camera size={16} />
              </button>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Perfil basico</h2>
              <p className="text-sm text-gray-400">Complete seus dados para o admin te reconhecer.</p>
            </div>
          </div>

          <p className="text-xs text-gray-500">Só o nome é obrigatório. O resto você completa quando quiser.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="perfil-nome">Nome</label>
              <input id="perfil-nome" className={`input ${erros.nome ? '!border-red-500' : ''}`} value={form.nome} onChange={(e) => campo('nome', e.target.value)} />
              <ErroCampo mensagem={erros.nome} />
            </div>
            <div>
              <label className="label" htmlFor="perfil-apelido">Apelido {OPCIONAL}</label>
              <input id="perfil-apelido" className={`input ${erros.apelido ? '!border-red-500' : ''}`} value={form.apelido} onChange={(e) => campo('apelido', e.target.value)} />
              <ErroCampo mensagem={erros.apelido} />
            </div>
            <div>
              <label className="label" htmlFor="perfil-telefone">Telefone {OPCIONAL}</label>
              <input id="perfil-telefone" className={`input ${erros.telefone ? '!border-red-500' : ''}`} value={form.telefone} onChange={(e) => campo('telefone', e.target.value)} />
              <ErroCampo mensagem={erros.telefone} />
            </div>
            <div>
              <label className="label" htmlFor="perfil-numero">Número da camisa {OPCIONAL}</label>
              <input id="perfil-numero" className={`input ${erros.numero_camisa ? '!border-red-500' : ''}`} type="number" min="1" max="99" value={form.numero_camisa} onChange={(e) => campo('numero_camisa', e.target.value)} />
              <ErroCampo mensagem={erros.numero_camisa} />
            </div>
            <div>
              <label className="label" htmlFor="perfil-posicao">Posição {OPCIONAL}</label>
              <select id="perfil-posicao" className={`input ${erros.posicao ? '!border-red-500' : ''}`} value={form.posicao} onChange={(e) => campo('posicao', e.target.value)}>
                <option value="">Não informar</option>
                {Object.entries(posicaoLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <ErroCampo mensagem={erros.posicao} />
            </div>
            <div>
              <label className="label" htmlFor="perfil-perna">Perna boa {OPCIONAL}</label>
              <select id="perfil-perna" className={`input ${erros.perna_boa ? '!border-red-500' : ''}`} value={form.perna_boa} onChange={(e) => campo('perna_boa', e.target.value)}>
                <option value="">Não informar</option>
                {Object.entries(pernaLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <ErroCampo mensagem={erros.perna_boa} />
            </div>
          </div>

          {erroGeral && (
            <div role="alert" className="p-3 rounded-xl bg-red-500/10 text-sm text-red-400 border border-red-500/20">
              {erroGeral}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={handleBack}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {saving ? 'Salvando...' : 'Salvar perfil'}
            </button>
          </div>
        </div>

        <button onClick={handleLogoutAction} className="btn-secondary w-full flex items-center justify-center gap-2">
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </div>
  )
}
