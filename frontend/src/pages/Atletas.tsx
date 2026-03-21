import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Plus, User, Shield, Trash2 } from 'lucide-react'
import { atletasApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { POSICAO_LABELS } from '../constants'
import ConfirmDialog from '../components/ConfirmDialog'
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
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast(detail ?? 'Erro ao adicionar atleta', 'error')
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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Atletas</h1>
        {isAdmin && (
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={20} /> Adicionar
          </button>
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
              <div>
                <label className="label">Nome Completo</label>
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
                <label className="label">WhatsApp</label>
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
                  onChange={(e) => setForm({ ...form, posicao: e.target.value as Posicao })}
                  className="input"
                >
                  {(Object.entries(POSICAO_LABELS) as [Posicao, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
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
