import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { rachasApi } from '../services/api'

export default function NovoRacha() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ nome: '', tipo: 'society', valor_mensalidade: 0, valor_cartao_amarelo: 1000, valor_cartao_vermelho: 2000 })

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await rachasApi.create(form)
      navigate(`/racha/${response.data.id}`)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="text-gray-500"><ArrowLeft size={24} /></button>
        <h1 className="text-2xl font-bold text-gray-900">Novo Racha</h1>
      </div>
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
    </div>
  )
}
