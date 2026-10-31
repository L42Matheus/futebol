import { useState, useEffect, useRef, type ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Phone, MapPin, Hash, Footprints, Trophy, Shield, Edit2, Camera, LogOut, ChevronDown, X, Share2 } from 'lucide-react'
import Layout from '../components/Layout'
import Avatar from '../components/Avatar'
import { PERNA_LABELS } from '../constants'
import { esporteDaModalidade, labelPosicao } from '../esportes'
import { useAuth } from '../context/AuthContext'
import { atletasApi, profileApi, rachasApi, rankingApi } from '../services/api'
import type { Atleta, AtletaRanking, Profile, Racha, Ranking } from '../types'
import CartaAtleta from '../components/CartaAtleta'
import { gerarImagemCarta } from '../utils/imagemCarta'
import { useToast } from '../context/ToastContext'

const SELECTED_RACHA_KEY = 'quemjogafc:selected_racha_id'

// "Atacante" -> ATA: sigla curta para a carta.
function siglaPosicao(nome: string) {
  return nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 3).toUpperCase()
}

// Jogos, a pontuação principal do esporte (gols, pontos) e vitórias, tirados do ranking do racha.
function estatisticas(ranking: Ranking | null, atletaId?: number) {
  const eu: AtletaRanking | undefined = ranking?.atletas.find((a) => a.atleta_id === atletaId)
  const principal = ranking?.categorias[0]
  const formatar = (valor: number | null | undefined) => (valor === null || valor === undefined ? '0' : String(valor))
  return [
    { rotulo: 'Jogos', valor: String(eu?.jogos ?? 0) },
    { rotulo: principal?.nome ?? 'Pontos', valor: formatar(principal ? eu?.valores[principal.id] : 0) },
    { rotulo: 'Vitórias', valor: formatar(eu?.valores.vitorias) },
  ]
}

export default function AthleteSelfProfile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasRacha, setHasRacha] = useState(false)
  const [rachas, setRachas] = useState<Racha[]>([])
  const [selectedRachaId, setSelectedRachaId] = useState('')
  const [uploading, setUploading] = useState(false)
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Carta e números do atleta no racha selecionado.
  const [meuAtleta, setMeuAtleta] = useState<Atleta | null>(null)
  const [ranking, setRanking] = useState<Ranking | null>(null)
  const [gerandoImagem, setGerandoImagem] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!selectedRachaId) return
    setMeuAtleta(null)
    setRanking(null)
    atletasApi.meu(selectedRachaId).then((res) => setMeuAtleta(res.data)).catch(() => setMeuAtleta(null))
    rankingApi.get(selectedRachaId).then((res) => setRanking(res.data)).catch(() => setRanking(null))
  }, [selectedRachaId])

  async function compartilharCarta() {
    if (!meuAtleta) return
    setGerandoImagem(true)
    try {
      const esporte = esporteDaModalidade(rachas.find((r) => String(r.id) === selectedRachaId)?.tipo)
      const imagem = await gerarImagemCarta({
        nome: meuAtleta.apelido || meuAtleta.nome,
        fotoUrl: meuAtleta.foto_url,
        posicao: siglaPosicao(labelPosicao(meuAtleta.posicao)),
        nota: meuAtleta.nota,
        atributos: meuAtleta.atributos,
        lista: esporte.atributos,
        racha: rachas.find((r) => String(r.id) === selectedRachaId)?.nome,
      })
      const arquivo = new File([imagem], 'minha-carta.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], title: 'Minha carta' })
      } else {
        const link = document.createElement('a')
        link.href = URL.createObjectURL(arquivo)
        link.download = arquivo.name
        link.click()
        URL.revokeObjectURL(link.href)
      }
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') toast('Não foi possível gerar a imagem da carta.', 'error')
    } finally {
      setGerandoImagem(false)
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, rachasRes] = await Promise.all([
          profileApi.me(),
          rachasApi.list(),
        ])
        const rachasList: Racha[] = Array.isArray(rachasRes.data) ? rachasRes.data : []
        const savedRachaId = localStorage.getItem(SELECTED_RACHA_KEY)
        const selectedRacha =
          rachasList.find((racha) => String(racha.id) === savedRachaId) || rachasList[0]

        setProfile(profileRes.data)
        setRachas(rachasList)
        setSelectedRachaId(selectedRacha ? String(selectedRacha.id) : '')
        setHasRacha(rachasList.length > 0)
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

  function handleSelectRacha(event: ChangeEvent<HTMLSelectElement>) {
    const rachaId = event.target.value
    localStorage.setItem(SELECTED_RACHA_KEY, rachaId)
    setSelectedRachaId(rachaId)
  }

  async function handlePhotoUpload(e: ChangeEvent<HTMLInputElement>) {
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
      <Layout title="Meu Perfil" showBack={false}>
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <p className="text-gray-400 mb-4">Carregando perfil...</p>
          <button
            onClick={() => navigate('/perfil-basico')}
            className="text-emerald-500 hover:underline"
          >
            Editar perfil
          </button>
        </div>
      </Layout>
    )
  }

  const selectedRacha = rachas.find((racha) => String(racha.id) === selectedRachaId)

  return (
    <Layout title="Meu Perfil" showBack={false}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="relative overflow-hidden bg-gray-900/40 rounded-[2.5rem] border border-gray-800 shadow-sm">
          <div className="h-32 bg-emerald-600 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-fundo to-transparent opacity-60"></div>
          </div>
          <div className="px-6 pb-8 -mt-12 relative flex flex-col items-center text-center">
            <div className="relative">
              <button
                type="button"
                onClick={() => profile.foto_url && setPhotoPreviewOpen(true)}
                disabled={!profile.foto_url}
                aria-label={profile.foto_url ? 'Visualizar foto em tamanho grande' : 'Sem foto'}
                className="rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-default"
              >
                <Avatar src={profile.foto_url} name={profile.apelido || profile.nome || 'Atleta'} size="xl" />
              </button>
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
                className="absolute bottom-0 right-0 bg-emerald-600 p-2.5 rounded-full shadow-lg text-branco border-2 border-fundo hover:bg-emerald-700 transition-colors"
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
              {profile.posicao && (
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
                  {labelPosicao(profile.posicao)}
                </span>
              )}
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

        {selectedRacha && (
          <div className={`relative rounded-[2rem] border border-gray-800 bg-gray-900/40 p-4 transition-colors ${rachas.length > 1 ? 'cursor-pointer hover:border-emerald-500/40' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 shadow-inner shadow-emerald-950/30">
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6 text-emerald-300"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 3v3.5l3 2.2 2 3.3-1 3.5-4 1.5-4-1.5-1-3.5 2-3.3 3-2.2Z" />
                  <path d="M12 6.5 8.5 9 10 13l4 0 1.5-4Z" fill="currentColor" stroke="none" opacity="0.4" />
                </svg>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase font-black tracking-[0.22em] text-emerald-400">Racha selecionado</p>
                <p className="text-xl font-black text-white truncate">
                  {selectedRacha.nome}
                </p>
              </div>

              {rachas.length > 1 && (
                <ChevronDown size={24} className="shrink-0 text-gray-400" />
              )}
            </div>

            {rachas.length > 1 && (
              <select
                aria-label="Selecionar racha"
                value={selectedRachaId}
                onChange={handleSelectRacha}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              >
                {rachas.map((racha) => (
                  <option key={racha.id} value={String(racha.id)}>
                    {racha.nome}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

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

        {meuAtleta && (
          <section className="space-y-3">
            <CartaAtleta
              nome={meuAtleta.apelido || meuAtleta.nome}
              fotoUrl={meuAtleta.foto_url}
              posicao={siglaPosicao(labelPosicao(meuAtleta.posicao))}
              nota={meuAtleta.nota}
              atributos={meuAtleta.atributos}
              lista={esporteDaModalidade(selectedRacha?.tipo).atributos}
            />
            {meuAtleta.nota ? (
              <div className="flex justify-center">
                <button type="button" onClick={() => void compartilharCarta()} disabled={gerandoImagem} className="btn-secondary">
                  <Share2 size={16} /> {gerandoImagem ? 'Gerando...' : 'Compartilhar minha carta'}
                </button>
              </div>
            ) : (
              <p className="text-center text-xs text-gray-500">O admin do racha dá as notas da sua carta.</p>
            )}
          </section>
        )}

        <section className="bg-gray-900/40 p-6 rounded-[2.5rem] border border-gray-800">
          <div className="flex items-center gap-2 mb-6">
            <Trophy size={20} className="text-amber-500" />
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Estatísticas</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {estatisticas(ranking, meuAtleta?.id).map(({ rotulo, valor }) => (
              <div key={rotulo} className="text-center">
                <p className="text-3xl font-black tabular-nums text-white tracking-tighter">{valor}</p>
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">{rotulo}</p>
              </div>
            ))}
          </div>
          {!meuAtleta && hasRacha && (
            <p className="text-xs text-gray-500 mt-4 text-center">Você ainda não é atleta deste racha.</p>
          )}
        </section>


        <div className="flex flex-col gap-3 pt-4 pb-8">
          <button
            onClick={() => navigate('/perfil-basico')}
            className="w-full bg-emerald-600 text-branco py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/40"
          >
            <Edit2 size={20} /> Editar Perfil
          </button>
          <button
            onClick={handleLogoutAction}
            className="w-full bg-red-600/10 text-red-500 border border-red-500/20 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-600 hover:text-branco transition-all"
          >
            <LogOut size={20} /> Encerrar Sessao
          </button>
          <div className="flex justify-center gap-5 pt-2 text-xs font-semibold text-gray-500">
            <Link to="/suporte?de=/perfil-atleta" className="hover:text-white">Ajuda e suporte</Link>
            <Link to="/privacidade" className="hover:text-white">Privacidade</Link>
            <Link to="/excluir-conta" className="hover:text-red-400">Excluir minha conta</Link>
          </div>
        </div>
      </div>

      {photoPreviewOpen && profile.foto_url && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setPhotoPreviewOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <button
            type="button"
            onClick={() => setPhotoPreviewOpen(false)}
            aria-label="Fechar"
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X size={20} />
          </button>
          <img
            src={
              profile.foto_url.startsWith('/uploads')
                ? `${import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8000'}${profile.foto_url}`
                : profile.foto_url
            }
            alt={profile.nome || 'Foto do perfil'}
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
          />
        </div>
      )}
    </Layout>
  )
}
