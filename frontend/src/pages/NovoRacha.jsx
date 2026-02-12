import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { rachasApi, authApi } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function NovoRacha() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [inviteLinks, setInviteLinks] = useState(null)
  const [createdRacha, setCreatedRacha] = useState(null)
  const [form, setForm] = useState({ nome: '', tipo: 'society', valor_mensalidade: 0, valor_cartao_amarelo: 1000, valor_cartao_vermelho: 2000 })
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await rachasApi.create(form)
      setCreatedRacha(response.data)
      const [inviteAtleta, inviteAdmin] = await Promise.all([
        authApi.createInvite({ racha_id: response.data.id, role: 'atleta' }),
        authApi.createInvite({ racha_id: response.data.id, role: 'admin' }),
      ])
      const base = window.location.origin
      setInviteLinks({
        atleta: `${base}/register?invite=${inviteAtleta.data.token}`,
        admin: `${base}/register?invite=${inviteAdmin.data.token}`,
      })
    } catch (error) {
      console.error('Erro ao criar racha:', error)
      alert('Erro ao criar racha. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: name.includes('valor') ? parseInt(value) * 100 : value }))
  }

  if (user && !isAdmin) {
    return (
      <div className="card bg-gray-900/40 border border-gray-800 text-center py-10">
        <h1 className="text-xl font-semibold text-white mb-2">Acesso restrito</h1>
        <p className="text-gray-400">Apenas administradores podem criar rachas.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Novo Racha</h1>
      {!inviteLinks && (
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div><label className="label">Nome do Racha</label><input type="text" name="nome" value={form.nome} onChange={handleChange} placeholder="Ex: Racha do Sábado" className="input" required /></div>
        <div><label className="label">Tipo de Racha</label>
          <select name="tipo" value={form.tipo} onChange={handleChange} className="input">
            <option value="campo">Campo (11x11) - até 40 atletas</option>
            <option value="society">Society (7x7) - até 30 atletas</option>
            <option value="futsal">Futsal (5x5) - até 20 atletas</option>
          </select>
        </div>
        <div><label className="label">Mensalidade (R$)</label><input type="number" name="valor_mensalidade" value={form.valor_mensalidade / 100} onChange={handleChange} placeholder="0" className="input" min="0" /><p className="text-xs text-gray-500 mt-1">Deixe 0 se não cobra mensalidade fixa</p></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Multa Amarelo (R$)</label><input type="number" name="valor_cartao_amarelo" value={form.valor_cartao_amarelo / 100} onChange={handleChange} className="input" min="0" /></div>
          <div><label className="label">Multa Vermelho (R$)</label><input type="number" name="valor_cartao_vermelho" value={form.valor_cartao_vermelho / 100} onChange={handleChange} className="input" min="0" /></div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Criando...' : 'Criar Racha'}</button>
      </form>
      )}
      {inviteLinks && createdRacha && (
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Racha criado com sucesso</h2>
          <p className="text-gray-500">Compartilhe os links abaixo para que atletas e administradores criem a conta.</p>
          <div>
            <label className="label">Link para Atletas</label>
            <input className="input" readOnly value={inviteLinks.atleta} onFocus={(e) => e.target.select()} />
          </div>
          <div>
            <label className="label">Link para Administradores</label>
            <input className="input" readOnly value={inviteLinks.admin} onFocus={(e) => e.target.select()} />
          </div>
          <button className="btn-primary w-full" onClick={() => navigate(`/racha/${createdRacha.id}`)}>Ir para o Racha</button>
        </div>
      )}
    </div>
  )
}
