import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi, setAuthToken } from '../services/api'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    senha: '',
  })
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email && !form.telefone) {
      alert('Informe e-mail ou telefone.')
      return
    }
    setLoading(true)
    try {
      const payload = { ...form }
      const response = await authApi.register(payload)
      localStorage.setItem('auth_token', response.data.access_token)
      setAuthToken(response.data.access_token)
      navigate('/')
    } catch (error) {
      console.error('Erro ao cadastrar:', error)
      alert('Falha no cadastro. Verifique os dados.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Criar conta</h1>
        <p className="text-gray-500">E-mail ou telefone obrigat&oacute;rio</p>
      </div>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">Nome</label>
          <input name="nome" value={form.nome} onChange={handleChange} className="input" />
        </div>
        <div>
          <label className="label">E-mail</label>
          <input type="email" name="email" value={form.email} onChange={handleChange} className="input" />
        </div>
        <div>
          <label className="label">Telefone</label>
          <input name="telefone" value={form.telefone} onChange={handleChange} className="input" />
        </div>
        <div>
          <label className="label">Senha</label>
          <input type="password" name="senha" value={form.senha} onChange={handleChange} className="input" required />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Criando...' : 'Criar conta'}
        </button>
        <p className="text-sm text-gray-500 text-center">
          Já tem conta? <Link className="text-primary-600" to="/login">Entrar</Link>
        </p>
      </form>
    </div>
  )
}
