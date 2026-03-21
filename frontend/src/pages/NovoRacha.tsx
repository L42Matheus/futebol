import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { rachasApi, authApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import FormField from '../components/FormField'
import { Input, Select } from '../components/Input'
import type { TipoRacha } from '../types'

interface RachaForm {
  nome: string
  tipo: TipoRacha
  valor_mensalidade: number
  valor_cartao_amarelo: number
  valor_cartao_vermelho: number
}

interface InviteLinks {
  atleta: string
  admin: string
}

export default function NovoRacha() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [inviteLinks, setInviteLinks] = useState<InviteLinks | null>(null)
  const [createdRachaId, setCreatedRachaId] = useState<number | null>(null)
  const [form, setForm] = useState<RachaForm>({
    nome: '',
    tipo: 'society',
    valor_mensalidade: 0,
    valor_cartao_amarelo: 1000,
    valor_cartao_vermelho: 2000,
  })
  const { user } = useAuth()
  const { toast } = useToast()
  const isAdmin = user?.role === 'admin'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await rachasApi.create(form)
      setCreatedRachaId(response.data.id)
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
      toast('Erro ao criar racha. Tente novamente.', 'error')
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: name.includes('valor') ? parseInt(value) * 100 : value,
    }))
  }

  if (user && !isAdmin) {
    return (
      <div className="card text-center py-10">
        <h1 className="text-xl font-semibold text-white mb-2">Acesso restrito</h1>
        <p className="text-gray-400">Apenas administradores podem criar rachas.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Novo Racha</h1>

      {!inviteLinks ? (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <FormField label="Nome do Racha">
            <Input
              type="text"
              name="nome"
              value={form.nome}
              onChange={handleChange}
              placeholder="Ex: Racha do Sábado"
              required
            />
          </FormField>
          <FormField label="Tipo de Racha">
            <Select name="tipo" value={form.tipo} onChange={handleChange}>
              <option value="campo">Campo (11x11) — até 40 atletas</option>
              <option value="society">Society (7x7) — até 30 atletas</option>
              <option value="futsal">Futsal (5x5) — até 20 atletas</option>
            </Select>
          </FormField>
          <FormField label="Mensalidade (R$)" hint="Deixe 0 se não cobra mensalidade fixa">
            <Input
              type="number"
              name="valor_mensalidade"
              value={form.valor_mensalidade / 100}
              onChange={handleChange}
              placeholder="0"
              min="0"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Multa Amarelo (R$)">
              <Input
                type="number"
                name="valor_cartao_amarelo"
                value={form.valor_cartao_amarelo / 100}
                onChange={handleChange}
                min="0"
              />
            </FormField>
            <FormField label="Multa Vermelho (R$)">
              <Input
                type="number"
                name="valor_cartao_vermelho"
                value={form.valor_cartao_vermelho / 100}
                onChange={handleChange}
                min="0"
              />
            </FormField>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Criando...' : 'Criar Racha'}
          </button>
        </form>
      ) : (
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-white">Racha criado com sucesso!</h2>
          <p className="text-gray-400">
            Compartilhe os links abaixo para que atletas e administradores criem a conta.
          </p>
          <FormField label="Link para Atletas">
            <Input readOnly value={inviteLinks.atleta} onFocus={(e) => e.currentTarget.select()} />
          </FormField>
          <FormField label="Link para Administradores">
            <Input readOnly value={inviteLinks.admin} onFocus={(e) => e.currentTarget.select()} />
          </FormField>
          <button
            className="btn-primary w-full"
            onClick={() => createdRachaId && navigate(`/racha/${createdRachaId}`)}
          >
            Ir para o Racha
          </button>
        </div>
      )}
    </div>
  )
}
