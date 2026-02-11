import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { jogosApi } from '../services/api'

export default function NovoJogo() {
  const navigate = useNavigate()
  const { rachaId } = useParams()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    data_hora: '',
    local: '',
    endereco: '',
    valor_campo: '',
    observacoes: '',
  })

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = { ...form, racha_id: Number(rachaId) }
      const response = await jogosApi.create(payload)
      navigate(`/racha/${rachaId}/jogos`)
    } catch (error) {
      console.error('Erro ao criar jogo:', error)
      alert('Erro ao criar jogo. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e) {
    const { name, value } = e.target
    if (name === 'valor_campo') {
      setForm((prev) => ({ ...prev, [name]: value === '' ? '' : parseInt(value) * 100 }))
      return
    }
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="text-gray-500"><ArrowLeft size={24} /></button>
        <h1 className="text-2xl font-bold text-gray-900">Novo Jogo</h1>
      </div>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">Data</label>
          <input type="date" name="data_hora" value={form.data_hora} onChange={handleChange} className="input" required />
        </div>
        <div>
          <label className="label">Local</label>
          <input type="text" name="local" value={form.local} onChange={handleChange} placeholder="Ex: Plinio Lemos" className="input" />
        </div>
        <div>
          <label className="label">Endereço</label>
          <input type="text" name="endereco" value={form.endereco} onChange={handleChange} placeholder="Ex: Campina Grande PB" className="input" />
        </div>
        <div>
          <label className="label">Valor do Campo (R$) - opcional</label>
          <input type="number" name="valor_campo" value={form.valor_campo === '' ? '' : form.valor_campo / 100} onChange={handleChange} className="input" min="0" />
        </div>
        <div>
          <label className="label">Observações</label>
          <textarea name="observacoes" value={form.observacoes} onChange={handleChange} className="input" rows="3" />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Salvando...' : 'Criar Jogo'}
        </button>
      </form>
    </div>
  )
}
