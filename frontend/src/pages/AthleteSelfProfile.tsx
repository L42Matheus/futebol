import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { profileApi } from '../services/api'
import Avatar from '../components/Avatar'
import { Edit2, LogOut, Shield, Trophy, MapPin, Phone, Hash, Footprints, Home } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const posicaoLabels: Record<string, string> = {
  goleiro: 'Goleiro',
  zagueiro: 'Zagueiro',
  lateral: 'Lateral',
  volante: 'Volante',
  meia: 'Meia',
  atacante: 'Atacante',
  ponta: 'Ponta',
}

const pernaLabels: Record<string, string> = {
  direita: 'Direita',
  esquerda: 'Esquerda',
  ambidestra: 'Ambidestra',
}

export default function AthleteSelfProfile() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await profileApi.me()
        setProfile(res.data)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_40%)]" />
          <div className="relative p-6 md:p-8">
            <div className="flex items-center justify-between mb-4" />
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="relative">
                <Avatar src={profile?.foto_url} name={profile?.apelido || profile?.nome || 'Atleta'} size="xl" />
                <Link
                  to="/"
                  className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center text-emerald-700 hover:bg-emerald-50"
                  title="Meus rachas"
                >
                  <Home size={16} />
                </Link>
                <div className="absolute -bottom-2 -right-2 bg-emerald-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <Trophy size={12} /> Atleta
                </div>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {profile?.apelido || profile?.nome || 'Atleta'}
                </h1>
                {profile?.apelido && profile?.nome && (
                  <p className="text-sm text-gray-500">{profile.nome}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {profile?.posicao && (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                      {posicaoLabels[profile.posicao]}
                    </span>
                  )}
                  {profile?.perna_boa && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1">
                      <Footprints size={12} /> {pernaLabels[profile.perna_boa]}
                    </span>
                  )}
                  {profile?.numero_camisa && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium flex items-center gap-1">
                      <Hash size={12} /> {profile.numero_camisa}
                    </span>
                  )}
                </div>
              </div>
              <Shield className="text-emerald-600" size={24} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4">
            <p className="text-xs text-gray-500">Telefone</p>
            <div className="mt-2 flex items-center gap-2 text-gray-800">
              <Phone size={16} />
              <span>{profile?.telefone || '-'}</span>
            </div>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-500">Posição</p>
            <div className="mt-2 flex items-center gap-2 text-gray-800">
              <MapPin size={16} />
              <span>{profile?.posicao ? posicaoLabels[profile.posicao] : '-'}</span>
            </div>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-500">Perna boa</p>
            <div className="mt-2 flex items-center gap-2 text-gray-800">
              <Footprints size={16} />
              <span>{profile?.perna_boa ? pernaLabels[profile.perna_boa] : '-'}</span>
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-3">
          <h2 className="font-semibold text-gray-900">Informações básicas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div>
              <p className="text-xs text-gray-500">Nome</p>
              <p>{profile?.nome || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Apelido</p>
              <p>{profile?.apelido || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Número</p>
              <p>{profile?.numero_camisa || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <p className="text-emerald-700 font-medium">Aguardando convite</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Link to="/perfil-basico" className="btn-primary w-full flex items-center justify-center gap-2">
            <Edit2 size={18} />
            Editar perfil
          </Link>
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </div>
    </div>
  )
}
