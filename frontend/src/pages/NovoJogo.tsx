import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { jogosApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import FormField from '../components/FormField'
import { Input, Textarea } from '../components/Input'

interface JogoForm {
  data_hora: string
  local: string
  endereco: string
  valor_campo: number | ''
  observacoes: string
}

export default function NovoJogo() {
  const navigate = useNavigate()
  const { rachaId } = useParams<{ rachaId: string }>()
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()
  const isAdmin = user?.role === 'admin'
  const [form, setForm] = useState<JogoForm>({
    data_hora: '',
    local: '',
    endereco: '',
    valor_campo: '',
    observacoes: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rachaId) return
    setLoading(true)
    try {
      const payload = { ...form, racha_id: Number(rachaId) }
      await jogosApi.create(payload)
      navigate(`/racha/${rachaId}/jogos`)
    } catch (error) {
      console.error('Erro ao criar jogo:', error)
      toast('Erro ao criar jogo. Tente novamente.', 'error')
    } finally {
      setLoading(false)
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target
    if (name === 'valor_campo') {
      setForm((prev) => ({
        ...prev,
        [name]: value === '' ? '' : parseInt(value) * 100,
      }))
      return
    }
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  if (user && !isAdmin) {
    return (
      <div className="card text-center py-10">
        <h1 className="text-xl font-semibold text-white mb-2">Acesso restrito</h1>
        <p className="text-gray-400">Apenas administradores podem criar jogos.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Novo Jogo</h1>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <FormField label="Data">
          <Input type="date" name="data_hora" value={form.data_hora} onChange={handleChange} required />
        </FormField>
        <FormField label="Local">
          <Input type="text" name="local" value={form.local} onChange={handleChange} placeholder="Ex: Plinio Lemos" />
        </FormField>
        <FormField label="Endereço">
          <Input type="text" name="endereco" value={form.endereco} onChange={handleChange} placeholder="Ex: Campina Grande PB" />
        </FormField>
        <FormField label="Valor do Campo (R$) — opcional">
          <Input
            type="number"
            name="valor_campo"
            value={form.valor_campo === '' ? '' : form.valor_campo / 100}
            onChange={handleChange}
            min="0"
          />
        </FormField>
        <FormField label="Observações">
          <Textarea name="observacoes" value={form.observacoes} onChange={handleChange} rows={3} />
        </FormField>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Salvando...' : 'Criar Jogo'}
        </button>
      </form>
    </div>
  )
}
