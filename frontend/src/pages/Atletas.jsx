import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Plus, User, Shield } from 'lucide-react'
import { atletasApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/Avatar'

export default function Atletas() {
  const { rachaId } = useParams()
  const navigate = useNavigate()
  const [atletas, setAtletas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ nome: '', apelido: '', telefone: '', posicao: 'meia' })
  const posicaoLabels = { goleiro: 'Goleiro', zagueiro: 'Zagueiro', lateral: 'Lateral', volante: 'Volante', meia: 'Meia', atacante: 'Atacante', ponta: 'Ponta' }
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  useEffect(() => { loadAtletas() }, [rachaId])

  async function loadAtletas() {
    try { setAtletas((await atletasApi.list(rachaId)).data) } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try { await atletasApi.create({ ...form, racha_id: parseInt(rachaId) }); setShowModal(false); setForm({ nome: '', apelido: '', telefone: '', posicao: 'meia' }); loadAtletas() }
    catch (error) { alert(error.response?.data?.detail || 'Erro ao adicionar atleta') }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4"><button onClick={() => navigate(-1)} className="text-gray-500"><ArrowLeft size={24} /></button><h1 className="text-xl font-bold text-gray-900">Atletas</h1></div>
        {isAdmin && <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus size={20} />Adicionar</button>}
      </div>
      <div className="card divide-y">
        {atletas.length === 0 ? <div className="text-center py-8"><User size={48} className="mx-auto text-gray-400 mb-4" /><p className="text-gray-500">Nenhum atleta cadastrado</p></div> : atletas.map((a) => (
          <Link key={a.id} to={`/racha/${rachaId}/atleta/${a.id}`} className="py-4 flex items-center gap-4 hover:bg-gray-50 -mx-4 px-4 transition-colors">
            <Avatar src={a.foto_url} name={a.apelido || a.nome} size="lg" />
            <div className="flex-1"><div className="flex items-center gap-2"><p className="font-medium text-gray-900">{a.apelido || a.nome}</p>{a.is_admin && <Shield className="text-primary-600" size={16} />}</div><p className="text-sm text-gray-500">{posicaoLabels[a.posicao]}{a.numero_camisa && ` - #${a.numero_camisa}`}</p></div>
          </Link>
        ))}
      </div>
      {isAdmin && showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-2xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Novo Atleta</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="label">Nome Completo</label><input type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="input" required /></div>
              <div><label className="label">Apelido</label><input type="text" value={form.apelido} onChange={(e) => setForm({ ...form, apelido: e.target.value })} className="input" placeholder="Como é conhecido no racha" /></div>
              <div><label className="label">WhatsApp</label><input type="tel" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="input" placeholder="(11) 99999-9999" /></div>
              <div><label className="label">Posição</label><select value={form.posicao} onChange={(e) => setForm({ ...form, posicao: e.target.value })} className="input">{Object.entries(posicaoLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
              <div className="flex gap-3 pt-2"><button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button><button type="submit" className="btn-primary flex-1">Adicionar</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
