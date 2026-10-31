import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Megaphone, Newspaper, Send } from 'lucide-react'
import ItemResenha from '../components/ItemResenha'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../context/ToastContext'
import { rachasApi, resenhaApi } from '../services/api'
import type { Noticia } from '../types'

export default function Resenha() {
  const { rachaId } = useParams<{ rachaId: string }>()
  const { toast } = useToast()
  const [noticias, setNoticias] = useState<Noticia[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)
  const [aviso, setAviso] = useState({ titulo: '', texto: '' })
  const [escrevendo, setEscrevendo] = useState(false)
  const [publicando, setPublicando] = useState(false)
  const [apagar, setApagar] = useState<Noticia | null>(null)

  const carregar = useCallback(async () => {
    if (!rachaId) return
    try {
      const [lista, racha] = await Promise.all([resenhaApi.listar(rachaId, 50), rachasApi.get(rachaId)])
      setNoticias(lista.data)
      setIsAdmin(Boolean(racha.data.is_admin))
      setErro(false)
    } catch {
      setErro(true)
    } finally {
      setCarregando(false)
    }
  }, [rachaId])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function publicar(e: React.FormEvent) {
    e.preventDefault()
    if (!rachaId || aviso.titulo.trim().length < 3) {
      toast('Escreva um título com pelo menos 3 letras.', 'error')
      return
    }
    setPublicando(true)
    try {
      const res = await resenhaApi.publicar(rachaId, { titulo: aviso.titulo.trim(), texto: aviso.texto.trim() || undefined })
      setNoticias((atual) => [res.data, ...atual])
      setAviso({ titulo: '', texto: '' })
      setEscrevendo(false)
      toast('Aviso publicado na Resenha.', 'success')
    } catch {
      toast('Não foi possível publicar o aviso.', 'error')
    } finally {
      setPublicando(false)
    }
  }

  async function confirmarApagar() {
    if (!rachaId || !apagar) return
    const noticia = apagar
    setApagar(null)
    try {
      await resenhaApi.apagar(rachaId, noticia.id)
      setNoticias((atual) => atual.filter((n) => n.id !== noticia.id))
    } catch {
      toast('Não foi possível apagar.', 'error')
    }
  }

  if (carregando) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-500" />
      </div>
    )
  }

  if (erro) {
    return (
      <div className="card py-10 text-center">
        <p className="font-semibold text-white">Não foi possível carregar a Resenha.</p>
        <button type="button" onClick={() => void carregar()} className="btn-secondary mt-4">
          Tentar de novo
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-24">
      {isAdmin &&
        (escrevendo ? (
          <form onSubmit={(e) => void publicar(e)} className="card space-y-3">
            <input
              className="input"
              placeholder="Ex.: Sábado o jogo muda pra Arena Society"
              maxLength={120}
              value={aviso.titulo}
              onChange={(e) => setAviso({ ...aviso, titulo: e.target.value })}
              aria-label="Título do aviso"
              autoFocus
            />
            <textarea
              className="input resize-y"
              rows={3}
              maxLength={1000}
              placeholder="Detalhes (opcional)"
              value={aviso.texto}
              onChange={(e) => setAviso({ ...aviso, texto: e.target.value })}
              aria-label="Detalhes do aviso"
            />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setEscrevendo(false)} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" disabled={publicando} className="btn-primary">
                <Send size={16} /> {publicando ? 'Publicando...' : 'Publicar'}
              </button>
            </div>
          </form>
        ) : (
          <button type="button" onClick={() => setEscrevendo(true)} className="btn-primary h-12 w-full">
            <Megaphone size={17} /> Escrever um aviso
          </button>
        ))}

      {noticias.length === 0 ? (
        <div className="card flex flex-col items-center py-10 text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-800 text-gray-500">
            <Newspaper size={24} />
          </span>
          <p className="font-bold text-white">A Resenha ainda está vazia</p>
          <p className="mt-1 max-w-xs text-sm text-gray-500">
            Resultados, destaques, marcas e novos atletas aparecem aqui sozinhos conforme o racha joga.
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-gray-800 p-0">
          {noticias.map((n) => (
            <ItemResenha key={n.id} noticia={n} rachaId={rachaId!} onApagar={isAdmin ? () => setApagar(n) : undefined} />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(apagar)}
        title="Apagar da Resenha"
        description={apagar ? `"${apagar.titulo}" sai da Resenha para todo o racha.` : ''}
        confirmLabel="Apagar"
        danger
        onConfirm={() => void confirmarApagar()}
        onCancel={() => setApagar(null)}
      />
    </div>
  )
}
