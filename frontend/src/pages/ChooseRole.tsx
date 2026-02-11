import { useNavigate } from 'react-router-dom'
import { useAccountType } from '../context/AccountTypeContext'

export default function ChooseRole() {
  const navigate = useNavigate()
  const { setAccountType } = useAccountType()

  function handleChoose(value: 'ATLETA' | 'ADMIN') {
    setAccountType(value)
    navigate('/login')
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Escolha seu perfil</h1>
        <p className="text-gray-500">Antes de entrar, selecione como vai usar o app</p>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <button className="card text-left hover:shadow-md transition-shadow" onClick={() => handleChoose('ATLETA')}>
          <h2 className="text-lg font-semibold text-gray-900">Sou atleta</h2>
          <p className="text-sm text-gray-500">Quero entrar em um racha e acompanhar meus jogos</p>
        </button>
        <button className="card text-left hover:shadow-md transition-shadow" onClick={() => handleChoose('ADMIN')}>
          <h2 className="text-lg font-semibold text-gray-900">Sou administrador</h2>
          <p className="text-sm text-gray-500">Quero criar e gerenciar um racha</p>
        </button>
      </div>
    </div>
  )
}
