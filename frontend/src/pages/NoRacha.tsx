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
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const payload: any = { ...form }
      payload.numero_camisa = form.numero_camisa ? parseInt(form.numero_camisa) : null
      const res = await profileApi.update(payload)
      setProfile(res.data)
      navigate('/perfil-atleta', { replace: true })
    } catch (e) {
      alert('Erro ao salvar perfil.')
    } finally {
      setSaving(false)
    }
  }

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/')
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
    <div className="min-h-screen bg-[#0b0f1a] flex flex-col">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Nome</label>
              <input className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div>
              <label className="label">Apelido</label>
              <input className="input" value={form.apelido} onChange={(e) => setForm({ ...form, apelido: e.target.value })} />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input className="input" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            </div>
            <div>
              <label className="label">Numero da camisa</label>
              <input className="input" type="number" min="1" max="99" value={form.numero_camisa} onChange={(e) => setForm({ ...form, numero_camisa: e.target.value })} />
            </div>
            <div>
              <label className="label">Posicao</label>
              <select className="input" value={form.posicao} onChange={(e) => setForm({ ...form, posicao: e.target.value })}>
                <option value="">Selecione</option>
                {Object.entries(posicaoLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Perna boa</label>
              <select className="input" value={form.perna_boa} onChange={(e) => setForm({ ...form, perna_boa: e.target.value })}>
                <option value="">Selecione</option>
                {Object.entries(pernaLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

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
