import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Plus, User, Shield, Trash2, Link2, Copy, Check } from 'lucide-react'
import { atletasApi, authApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { POSICAO_LABELS } from '../constants'
import ConfirmDialog from '../components/ConfirmDialog'
import FormField from '../components/FormField'
import { Input, Select } from '../components/Input'
import Avatar from '../components/Avatar'
import type { Atleta, Posicao } from '../types'

interface AtletaForm {
  nome: string
  apelido: string
  telefone: string
  posicao: Posicao
}

const INITIAL_FORM: AtletaForm = { nome: '', apelido: '', telefone: '', posicao: 'meia' }

export default function Atletas() {
  const { rachaId } = useParams<{ rachaId: string }>()
  const [atletas, setAtletas] = useState<Atleta[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<AtletaForm>(INITIAL_FORM)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteCopied, setInviteCopied] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()
  const isAdmin = user?.role === 'admin'

  const loadAtletas = useCallback(async () => {
    if (!rachaId) return
    try {
      setAtletas((await atletasApi.list(rachaId)).data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [rachaId])

  useEffect(() => {
    loadAtletas()
  }, [loadAtletas])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rachaId) return
    try {
      await atletasApi.create({ ...form, racha_id: parseInt(rachaId) })
      setShowModal(false)
      setForm(INITIAL_FORM)
      loadAtletas()
      toast('Atleta adicionado com sucesso!', 'success')
    } catch (error: unknown) {
      const apiError = error as {
        message?: string
        response?: { data?: { detail?: string } }
      }
      const detail = apiError.response?.data?.detail ?? apiError.message
      console.error('Erro ao adicionar atleta:', apiError)
      toast(detail ?? 'Erro ao adicionar atleta', 'error')
    }
  }

  async function handleGenerateInvite() {
    if (!rachaId) return
    setInviteLoading(true)
    try {
      const response = await authApi.createInvite({ racha_id: parseInt(rachaId), role: 'atleta' })
      const link = `${window.location.origin}/register?invite=${response.data.token}`
      setInviteLink(link)
      setInviteCopied(false)
    } catch (error) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast(detail ?? 'Erro ao gerar convite', 'error')
    } finally {
      setInviteLoading(false)
    }
  }

  async function handleCopyInvite() {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setInviteCopied(true)
      toast('Link copiado!', 'success')
      setTimeout(() => setInviteCopied(false), 2000)
    } catch {
      toast('Não foi possível copiar. Selecione e copie manualmente.', 'error')
    }
  }

  async function handleDeleteConfirm() {
    if (deleteId === null) return
    try {
      await atletasApi.delete(deleteId)
      setDeleteId(null)
      loadAtletas()
      toast('Atleta removido.', 'success')
    } catch (error: unknown) {
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast(detail ?? 'Erro ao excluir atleta', 'error')
      setDeleteId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-white">Atletas</h1>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateInvite}
              disabled={inviteLoading}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
              title="Convidar atleta por link"
            >
              <Link2 size={18} />
              <span className="hidden sm:inline text-sm font-medium">Convidar</span>
            </button>
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
              <Plus size={20} /> Adicionar
            </button>
          </div>
        )}
      </div>

      <div className="card divide-y divide-gray-800 overflow-visible">
        {atletas.length === 0 ? (
          <div className="text-center py-8">
            <User size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">Nenhum atleta cadastrado</p>
          </div>
        ) : (
          atletas.map((a) => (
            <div key={a.id} className="relative group py-4 px-4 hover:bg-gray-800/50 transition-colors">
              <Link to={`/racha/${rachaId}/atleta/${a.id}`} className="flex items-center gap-4">
                <Avatar src={a.foto_url} name={a.apelido ?? a.nome} size="lg" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white">{a.apelido ?? a.nome}</p>
                    {a.is_admin && <Shield className="text-emerald-400" size={16} />}
                  </div>
                  <p className="text-sm text-gray-400">
                    {POSICAO_LABELS[a.posicao]}
                    {a.numero_camisa != null && ` — #${a.numero_camisa}`}
                  </p>
                </div>
              </Link>
              {isAdmin && (
                <button
                  onClick={(e) => { e.preventDefault(); setDeleteId(a.id) }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-red-500/90 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all opacity-0 group-hover:opacity-100 z-10"
                  title="Excluir Atleta"
                >
                  <Trash2 size={14} strokeWidth={3} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal novo atleta */}
      {isAdmin && showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-t-2xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Novo Atleta</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField label="Nome Completo">
                <Input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Apelido">
                <Input
                  type="text"
                  value={form.apelido}
                  onChange={(e) => setForm({ ...form, apelido: e.target.value })}
                  placeholder="Como é conhecido no racha"
                />
              </FormField>
              <FormField label="WhatsApp">
                <Input
                  type="tel"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              </FormField>
              <FormField label="Posição">
                <Select
                  value={form.posicao}
                  onChange={(e) => setForm({ ...form, posicao: e.target.value as Posicao })}
                >
                  {(Object.entries(POSICAO_LABELS) as [Posicao, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </Select>
              </FormField>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setForm(INITIAL_FORM) }}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de convite por link */}
      {isAdmin && inviteLink && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <Link2 size={20} />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-white">Convidar atleta</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Compartilhe este link. O atleta cria a própria conta e entra direto no racha.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-800/60 border border-gray-700">
              <input
                readOnly
                value={inviteLink}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 bg-transparent text-sm text-gray-200 outline-none truncate"
              />
              <button
                onClick={handleCopyInvite}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium flex items-center gap-1.5"
              >
                {inviteCopied ? <Check size={14} /> : <Copy size={14} />}
                {inviteCopied ? 'Copiado' : 'Copiar'}
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Cada clique em <span className="text-gray-400 font-medium">Convidar</span> gera um link novo.
              Você pode compartilhar o mesmo link com vários atletas.
            </p>

            <button
              onClick={() => setInviteLink(null)}
              className="w-full btn-secondary"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* ConfirmDialog substitui window.confirm */}
      <ConfirmDialog
        open={deleteId !== null}
        title="Excluir atleta"
        description="Deseja realmente excluir este atleta? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
