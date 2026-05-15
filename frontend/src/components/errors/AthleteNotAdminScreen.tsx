import { Users, UserX } from 'lucide-react'

interface AthleteNotAdminScreenProps {
  onContinueAsAthlete: () => void
  onUseOtherEmail: () => void
}

export default function AthleteNotAdminScreen({
  onContinueAsAthlete,
  onUseOtherEmail,
}: AthleteNotAdminScreenProps) {
  return (
    <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-900/40 rounded-2xl p-8 border border-gray-800">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center">
            <UserX className="w-8 h-8 text-blue-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Você não é administrador</h2>
          <p className="text-gray-400 text-sm">
            Sua conta está cadastrada como{' '}
            <span className="text-blue-400 font-semibold">Atleta</span>, não como
            administrador.
          </p>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-300">
              <p className="font-medium text-blue-400 mb-1">Quer criar seu próprio racha?</p>
              <p>
                Para ser administrador, você precisa criar uma nova conta com outro email
                ou pedir para um admin existente te promover.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={onContinueAsAthlete}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Users size={18} />
            Continuar como Atleta
          </button>

          <button
            onClick={onUseOtherEmail}
            className="w-full py-3 px-4 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 font-medium rounded-xl transition-colors"
          >
            Usar outro email
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-6">
          Se você deveria ser admin, entre em contato com o organizador do racha.
        </p>
      </div>
    </div>
  )
}
