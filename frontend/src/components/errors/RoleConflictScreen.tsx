import { Shield, AlertTriangle } from 'lucide-react'

interface RoleConflictScreenProps {
  onContinueAsAdmin: () => void
  onUseOtherEmail: () => void
}

export default function RoleConflictScreen({
  onContinueAsAdmin,
  onUseOtherEmail,
}: RoleConflictScreenProps) {
  return (
    <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-900/40 rounded-2xl p-8 border border-gray-800">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Conta já existente</h2>
          <p className="text-gray-400 text-sm">
            Você já possui uma conta como{' '}
            <span className="text-amber-400 font-semibold">Administrador</span> com este
            email.
          </p>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-300">
              <p className="font-medium text-amber-400 mb-1">Você é um Admin!</p>
              <p>
                Administradores têm acesso completo para gerenciar rachas, atletas e
                finanças.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={onContinueAsAdmin}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Shield size={18} />
            Continuar como Admin
          </button>

          <button
            onClick={onUseOtherEmail}
            className="w-full py-3 px-4 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 font-medium rounded-xl transition-colors"
          >
            Usar outro email
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-6">
          Se precisar de uma conta de atleta separada, use um email diferente.
        </p>
      </div>
    </div>
  )
}
