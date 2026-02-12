import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, MapPin, Hash, Footprints, Trophy, Shield, Edit2, Camera } from 'lucide-react'
import Layout from '../components/Layout'
import Avatar from '../components/Avatar'
import { POSICAO_LABELS, PERNA_LABELS } from '../constants'
import { useAuth } from '../context/AuthContext'
import { profileApi, rachasApi } from '../services/api'

export default function AthleteSelfProfile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hasRacha, setHasRacha] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, rachasRes] = await Promise.all([
          profileApi.me(),
          rachasApi.list(),
        ])
        setProfile(profileRes.data)
        setHasRacha(Array.isArray(rachasRes.data) && rachasRes.data.length > 0)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleLogoutAction = () => {
    logout()
    navigate('/perfil')
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Imagem muito grande. Máximo 5MB')
      return
    }
    setUploading(true)
    try {
      const res = await profileApi.uploadFoto(file)
      setProfile(res.data)
    } catch (err) {
      alert('Erro ao enviar foto')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse flex flex-col items-center py-20">
          <div className="w-24 h-24 bg-gray-200 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
        </div>
      </Layout>
    )
  }

  if (!profile) {
    return (
      <Layout>
        <div>Atleta não encontrado</div>
      </Layout>
    )
  }

  return (
    <Layout title="Meu Perfil" showBack={false}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="relative overflow-hidden bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="h-32 bg-emerald-600 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0 0 L100 0 L100 100 L0 100 Z" fill="url(#grad)" />
                <defs>
                  <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: 'white' }} />
                    <stop offset="100%" style={{ stopColor: 'transparent' }} />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
          <div className="px-6 pb-6 -mt-12 relative flex flex-col items-center text-center">
            <div className="relative">
              <Avatar src={profile.foto_url} name={profile.apelido || profile.nome || 'Atleta'} size="xl" />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-lg text-emerald-600 border border-gray-100 hover:bg-emerald-50"
              >
                {uploading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-600 border-t-transparent"></div>
                ) : (
                  <Camera size={16} />
                )}
              </button>
            </div>

            <h1 className="mt-4 text-2xl font-bold text-gray-900">{profile.apelido || profile.nome}</h1>
            {profile.apelido && <p className="text-gray-500">{profile.nome}</p>}

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold">
                {POSICAO_LABELS[profile.posicao] || '-'}
              </span>
              <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                <Footprints size={12} /> {PERNA_LABELS[profile.perna_boa || 'direita']}
              </span>
              {profile.numero_camisa && (
                <span className="bg-gray-50 text-gray-600 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                  <Hash size={12} /> {profile.numero_camisa}
                </span>
              )}
              {user?.role === 'admin' && (
                <span className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                  <Shield size={12} /> Admin
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center">
              <Phone size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">WhatsApp</p>
              <p className="text-gray-900 font-semibold">{profile.telefone || '-'}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center">
              <MapPin size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Status</p>
              <p className="text-emerald-600 font-bold">{hasRacha ? 'Ativo no Racha' : 'Aguardando convite'}</p>
            </div>
          </div>
        </div>

        <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Trophy size={20} className="text-orange-500" /> Estatísticas Gerais
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">0</p>
              <p className="text-xs text-gray-400 font-medium mt-1">Jogos</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">0</p>
              <p className="text-xs text-gray-400 font-medium mt-1">Gols</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">0%</p>
              <p className="text-xs text-gray-400 font-medium mt-1">Presença</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4 text-center">Em breve com dados reais.</p>
        </section>

        <div className="flex flex-col gap-3 pt-4">
          <button
            onClick={() => navigate('/perfil-basico')}
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100"
          >
            <Edit2 size={20} /> Editar Perfil
          </button>
          <button
            onClick={handleLogoutAction}
            className="w-full bg-white text-gray-600 border border-gray-100 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
          >
            Log Out
          </button>
        </div>
      </div>
    </Layout>
  )
}
