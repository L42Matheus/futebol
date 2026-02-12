import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, MapPin, Hash, Footprints, Trophy, Shield, Edit2, Camera, LogOut } from 'lucide-react'
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
      alert('Imagem muito grande. Maximo 5MB')
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
          <div className="w-24 h-24 bg-gray-800 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-gray-800 rounded"></div>
        </div>
      </Layout>
    )
  }

  if (!profile) {
    return (
      <Layout>
        <div className="text-gray-400">Atleta nao encontrado</div>
      </Layout>
    )
  }

  return (
    <Layout title="Meu Perfil" showBack={false}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="relative overflow-hidden bg-gray-900/40 rounded-[2.5rem] border border-gray-800 shadow-sm">
          <div className="h-32 bg-emerald-600 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f1a] to-transparent opacity-60"></div>
          </div>
          <div className="px-6 pb-8 -mt-12 relative flex flex-col items-center text-center">
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
                className="absolute bottom-0 right-0 bg-emerald-600 p-2.5 rounded-full shadow-lg text-white border-2 border-[#0b0f1a] hover:bg-emerald-700 transition-colors"
              >
                {uploading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : (
                  <Camera size={18} />
                )}
              </button>
            </div>

            <h1 className="mt-4 text-2xl font-black text-white">{profile.apelido || profile.nome}</h1>
            {profile.apelido && <p className="text-gray-500 font-medium">{profile.nome}</p>}

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
                {POSICAO_LABELS[profile.posicao] || '-'}
              </span>
              <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Footprints size={12} /> {PERNA_LABELS[profile.perna_boa || 'direita']}
              </span>
              {profile.numero_camisa && (
                <span className="bg-gray-800 text-gray-400 border border-gray-700 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Hash size={12} /> {profile.numero_camisa}
                </span>
              )}
              {user?.role === 'admin' && (
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Shield size={12} /> Admin
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-900/40 p-5 rounded-3xl border border-gray-800 flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-800 text-emerald-500 rounded-2xl flex items-center justify-center">
              <Phone size={24} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-black tracking-wider">WhatsApp</p>
              <p className="text-white font-bold">{profile.telefone || '-'}</p>
            </div>
          </div>
          <div className="bg-gray-900/40 p-5 rounded-3xl border border-gray-800 flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-800 text-emerald-500 rounded-2xl flex items-center justify-center">
              <MapPin size={24} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-black tracking-wider">Status</p>
              <p className="text-emerald-400 font-bold uppercase tracking-tight">
                {hasRacha ? 'Ativo no Racha' : 'Aguardando convite'}
              </p>
            </div>
          </div>
        </div>

        <section className="bg-gray-900/40 p-8 rounded-[2.5rem] border border-gray-800">
          <div className="flex items-center gap-2 mb-8">
            <Trophy size={20} className="text-amber-500" />
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Estatisticas</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-3xl font-black text-white tracking-tighter">0</p>
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Jogos</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-black text-white tracking-tighter">0</p>
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Gols</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-black text-white tracking-tighter">0%</p>
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Presenca</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4 text-center">Em breve com dados reais.</p>
        </section>

        <div className="flex flex-col gap-3 pt-4 pb-8">
          <button
            onClick={() => navigate('/perfil-basico')}
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/40"
          >
            <Edit2 size={20} /> Editar Perfil
          </button>
          <button
            onClick={handleLogoutAction}
            className="w-full bg-red-600/10 text-red-500 border border-red-500/20 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-600 hover:text-white transition-all"
          >
            <LogOut size={20} /> Encerrar Sessao
          </button>
        </div>
      </div>
    </Layout>
  )
}
