import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, Edit2, Save, X, Trophy, CreditCard, AlertTriangle } from 'lucide-react'
import { atletasApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/Avatar'

interface Atleta {
  id: number
  nome: string
  apelido?: string
  telefone?: string
  posicao: string
  numero_camisa?: number
  foto_url?: string
  user_id?: number
  is_admin: boolean
}

interface Historico {
  presencas: {
    total_jogos: number
    confirmados: number
    taxa_presenca: string
  }
  financeiro: {
    pago_formatado: string
    pendente_formatado: string
  }
  cartoes: {
    amarelos: number
    vermelhos: number
  }
}

const posicaoLabels: Record<string, string> = {
  goleiro: 'Goleiro',
  zagueiro: 'Zagueiro',
  lateral: 'Lateral',
  volante: 'Volante',
  meia: 'Meia',
  atacante: 'Atacante',
  ponta: 'Ponta'
}

export default function AtletaProfile() {
  const { rachaId, atletaId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [atleta, setAtleta] = useState<Atleta | null>(null)
  const [historico, setHistorico] = useState<Historico | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ nome: '', apelido: '', telefone: '', posicao: 'meia', numero_camisa: '' })

  const isAdminView = user?.role === 'admin'
  const canEdit = atleta?.user_id === user?.id || isAdminView

  useEffect(() => {
    loadAtleta()
  }, [atletaId])

  async function loadAtleta() {
    try {
      const [atletaRes, historicoRes] = await Promise.all([
        atletasApi.get(atletaId),
        atletasApi.getHistorico(atletaId)
      ])
      setAtleta(atletaRes.data)
      setHistorico(historicoRes.data)
      setForm({
        nome: atletaRes.data.nome || '',
        apelido: atletaRes.data.apelido || '',
        telefone: atletaRes.data.telefone || '',
        posicao: atletaRes.data.posicao || 'meia',
        numero_camisa: atletaRes.data.numero_camisa?.toString() || ''
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!atleta) return
    try {
      const updateData = {
        ...form,
        numero_camisa: form.numero_camisa ? parseInt(form.numero_camisa) : null
      }
      const res = await atletasApi.update(atleta.id, updateData)
      setAtleta(res.data)
      setEditing(false)
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Erro ao salvar')
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !atleta) return

    // Validação básica
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Imagem muito grande. Máximo 5MB')
      return
    }

    setUploading(true)
    try {
      const res = await atletasApi.uploadFoto(atleta.id, file)
      setAtleta(res.data)
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Erro ao enviar foto')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!atleta) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Atleta não encontrado</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-gray-500">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Perfil</h1>
        </div>
        {canEdit && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <Edit2 size={18} />
            Editar
          </button>
        )}
      </div>

      {/* Foto e Info Principal */}
      <div className="card p-6">
        <div className="flex flex-col items-center">
          {/* Foto com opção de upload */}
          <div className="relative">
            <Avatar
              src={atleta.foto_url}
              name={atleta.apelido || atleta.nome}
              size="xl"
            />
            {canEdit && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-primary-700 transition-colors"
                >
                  {uploading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <Camera size={16} />
                  )}
                </button>
              </>
            )}
          </div>
          {canEdit && atleta.foto_url && (
            <button
              onClick={async () => {
                if (!window.confirm('Remover foto?')) return
                try {
                  const res = await atletasApi.removerFoto(atleta.id)
                  setAtleta(res.data)
                } catch (e: any) {
                  alert(e.response?.data?.detail || 'Erro ao remover foto')
                }
              }}
              className="mt-3 text-xs text-red-600"
            >
              Remover foto
            </button>
          )}

          {/* Nome e Posição */}
          {editing ? (
            <div className="mt-4 w-full max-w-sm space-y-4">
              <div>
                <label className="label">Nome</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Apelido</label>
                <input
                  type="text"
                  value={form.apelido}
                  onChange={(e) => setForm({ ...form, apelido: e.target.value })}
                  className="input"
                  placeholder="Como é conhecido no racha"
                />
              </div>
              <div>
                <label className="label">Telefone</label>
                <input
                  type="tel"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  className="input"
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <label className="label">Posição</label>
                <select
                  value={form.posicao}
                  onChange={(e) => setForm({ ...form, posicao: e.target.value })}
                  className="input"
                >
                  {Object.entries(posicaoLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Número da Camisa</label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={form.numero_camisa}
                  onChange={(e) => setForm({ ...form, numero_camisa: e.target.value })}
                  className="input"
                  placeholder="Ex: 10"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="btn-secondary flex-1 flex items-center justify-center gap-2"
                >
                  <X size={18} />
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Salvar
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="mt-4 text-xl font-bold text-gray-900">
                {atleta.apelido || atleta.nome}
              </h2>
              {atleta.apelido && (
                <p className="text-sm text-gray-500">{atleta.nome}</p>
              )}
              <div className="mt-2 flex items-center gap-3">
                <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                  {posicaoLabels[atleta.posicao]}
                </span>
                {atleta.numero_camisa && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                    #{atleta.numero_camisa}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Estatísticas */}
      {historico && (
        <div className="grid grid-cols-3 gap-4">
          {/* Presenças */}
          <div className="card p-4 text-center">
            <Trophy className="mx-auto text-primary-600 mb-2" size={24} />
            <p className="text-2xl font-bold text-gray-900">{historico.presencas.confirmados}</p>
            <p className="text-xs text-gray-500">Jogos</p>
            <p className="text-xs text-primary-600 mt-1">{historico.presencas.taxa_presenca}</p>
          </div>

          {/* Financeiro */}
          <div className="card p-4 text-center">
            <CreditCard className="mx-auto text-green-600 mb-2" size={24} />
            <p className="text-lg font-bold text-gray-900">{historico.financeiro.pago_formatado}</p>
            <p className="text-xs text-gray-500">Pago</p>
            {historico.financeiro.pendente_formatado !== 'R$ 0.00' && (
              <p className="text-xs text-amber-600 mt-1">{historico.financeiro.pendente_formatado} pendente</p>
            )}
          </div>

          {/* Cartões */}
          <div className="card p-4 text-center">
            <AlertTriangle className="mx-auto text-amber-500 mb-2" size={24} />
            <div className="flex justify-center gap-3">
              <div>
                <span className="inline-block w-4 h-5 bg-yellow-400 rounded-sm"></span>
                <p className="text-sm font-bold">{historico.cartoes.amarelos}</p>
              </div>
              <div>
                <span className="inline-block w-4 h-5 bg-red-500 rounded-sm"></span>
                <p className="text-sm font-bold">{historico.cartoes.vermelhos}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Cartões</p>
          </div>
        </div>
      )}
    </div>
  )
}
