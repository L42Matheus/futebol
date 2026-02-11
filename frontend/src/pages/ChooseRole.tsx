import { useNavigate } from 'react-router-dom'
import { ShieldCheck, UserCircle2, Trophy } from 'lucide-react'
import { useAccountType } from '../context/AccountTypeContext'

export default function ChooseRole() {
  const navigate = useNavigate()
  const { setAccountType } = useAccountType()

  function handleChoose(value: 'ATLETA' | 'ADMIN') {
    setAccountType(value)
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex flex-col">
      {/* Header */}
      <div className="pt-12 pb-8 px-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-600 text-white flex items-center justify-center shadow-lg">
          <Trophy size={32} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">QuemJoga</h1>
        <p className="text-gray-500 mt-1">Organize seu racha sem estresse</p>
      </div>

      {/* Cards */}
      <div className="flex-1 px-4 pb-8">
        <div className="max-w-md mx-auto space-y-4">
          <p className="text-center text-sm text-gray-600 mb-6">
            Como você vai usar o app?
          </p>

          {/* Card Atleta */}
          <button
            className="w-full bg-white rounded-2xl p-6 shadow-sm border-2 border-transparent hover:border-primary-500 hover:shadow-md transition-all active:scale-[0.98]"
            onClick={() => handleChoose('ATLETA')}
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <UserCircle2 size={32} />
              </div>
              <div className="text-left flex-1">
                <h2 className="text-lg font-semibold text-gray-900">Sou Atleta</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Recebi um convite para participar de um racha
                </p>
                <ul className="mt-3 space-y-1">
                  <li className="text-xs text-gray-400 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    Confirmar presença nos jogos
                  </li>
                  <li className="text-xs text-gray-400 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    Ver calendário e estatísticas
                  </li>
                </ul>
              </div>
            </div>
          </button>

          {/* Card Admin */}
          <button
            className="w-full bg-white rounded-2xl p-6 shadow-sm border-2 border-transparent hover:border-primary-500 hover:shadow-md transition-all active:scale-[0.98]"
            onClick={() => handleChoose('ADMIN')}
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={32} />
              </div>
              <div className="text-left flex-1">
                <h2 className="text-lg font-semibold text-gray-900">Sou Administrador</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Quero criar e gerenciar meu próprio racha
                </p>
                <ul className="mt-3 space-y-1">
                  <li className="text-xs text-gray-400 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    Convidar atletas
                  </li>
                  <li className="text-xs text-gray-400 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    Gerenciar pagamentos e times
                  </li>
                </ul>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="pb-8 px-4 text-center">
        <p className="text-xs text-gray-400">
          Você pode alterar isso depois nas configurações
        </p>
      </div>
    </div>
  )
}
