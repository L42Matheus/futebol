import { useNavigate } from 'react-router-dom'
import { ShieldCheck, UserCircle2 } from 'lucide-react'
import { useAccountType } from '../context/AccountTypeContext'

export default function ChooseRole() {
  const navigate = useNavigate()
  const { setAccountType } = useAccountType()

  function handleChoose(value: 'ATLETA' | 'ADMIN') {
    setAccountType(value)
    navigate('/login')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Escolha seu perfil</h1>
        <p className="text-gray-500">Antes de entrar, selecione como vai usar o app</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          className="card text-left hover:shadow-md transition-shadow border border-transparent hover:border-primary-200"
          onClick={() => handleChoose('ATLETA')}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
              <UserCircle2 size={28} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Sou atleta</h2>
              <p className="text-sm text-gray-500">Quero entrar em um racha e acompanhar meus jogos</p>
            </div>
          </div>
        </button>
        <button
          className="card text-left hover:shadow-md transition-shadow border border-transparent hover:border-primary-200"
          onClick={() => handleChoose('ADMIN')}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Sou administrador</h2>
              <p className="text-sm text-gray-500">Quero criar e gerenciar um racha</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
