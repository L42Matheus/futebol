import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Award, Check, Clock, Share2, Users, Vote } from 'lucide-react'
import { format, formatDistanceToNowStrict } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Avatar from '../components/Avatar'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../context/ToastContext'
import { destaquesApi, rachasApi } from '../services/api'
import { labelPosicao } from '../esportes'
import { compartilharImagem, gerarImagemDestaques } from '../utils/imagemDestaques'
import type { AtletaDestaque, Destaque, DestaquesPartida } from '../types'

const CORES_PODIO = ['#e0a526', '#b8c2cc', '#c2773c']
const ORIGEM: Record<Destaque['origem'], string> = {
  votacao: 'Votação da galera',
  admin: 'Escolha do admin',
  lances: 'Pelos lances da partida',
}

function nomeCurto(a: AtletaDestaque) {
  return a.apelido?.trim() || a.nome.split(' ').slice(0, 2).join(' ')
}

// No pódio o nome quebra em duas linhas; palavra comprida diminui a letra para não partir no meio.
function tamanhoNome(nome: string, primeiro: boolean) {
  const maior = Math.max(...nome.split(/\s+/).map((p) => p.length))
  if (maior > 9) return 'text-xs'
  if (maior > 7) return 'text-sm'
  return primeiro ? 'text-base' : 'text-sm'
}

function erroDaApi(e: unknown, padrao: string) {
  const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  return typeof detail === 'string' ? detail : padrao
}

export default function Destaques() {
  const { rachaId, jogoId } = useParams<{ rachaId: string; jogoId: string }>()
  const { toast } = useToast()
  const [dados, setDados] = useState<DestaquesPartida | null>(null)
  const [nomeRacha, setNomeRacha] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  // Quem está sendo escolhido, na ordem do 1º ao 3º.
  const [escolha, setEscolha] = useState<number[]>([])
  // votar (atleta) ou definir (admin escolhendo no lugar da votação).
  const [modo, setModo] = useState<'votar' | 'definir' | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [confirmarEncerrar, setConfirmarEncerrar] = useState(false)

  const carregar = useCallback(async () => {
    if (!jogoId || !rachaId) return
    try {
      const [res, racha] = await Promise.all([destaquesApi.get(jogoId), rachasApi.get(rachaId)])
      setDados(res.data)
      setNomeRacha(racha.data.nome)
      setErro('')
    } catch (e) {
      setErro(erroDaApi(e, 'Não foi possível carregar os destaques.'))
    } finally {
      setCarregando(false)
    }
  }, [jogoId, rachaId])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const candidatos = useMemo(() => {
    if (!dados) return []
    // Quem vota não aparece na própria lista.
    return modo === 'votar' ? dados.candidatos.filter((c) => c.atleta_id !== dados.meu_atleta_id) : dados.candidatos
  }, [dados, modo])

  function alternar(atletaId: number) {
    setEscolha((atual) =>
      atual.includes(atletaId) ? atual.filter((id) => id !== atletaId) : atual.length < 3 ? [...atual, atletaId] : atual,
    )
  }

  async function enviar() {
    if (!jogoId || !modo || escolha.length === 0) return
    setEnviando(true)
    try {
      const res = modo === 'votar' ? await destaquesApi.votar(jogoId, escolha) : await destaquesApi.definir(jogoId, escolha)
      setDados(res.data)
      setModo(null)
      setEscolha([])
      toast(modo === 'votar' ? 'Voto registrado.' : 'Destaques definidos.', 'success')
    } catch (e) {
      toast(erroDaApi(e, 'Não foi possível salvar.'), 'error')
    } finally {
      setEnviando(false)
    }
  }

  async function encerrarVotacao() {
    if (!jogoId) return
    setConfirmarEncerrar(false)
    try {
      const res = await destaquesApi.encerrarVotacao(jogoId)
      setDados(res.data)
      toast('Votação encerrada.', 'success')
    } catch (e) {
      toast(erroDaApi(e, 'Não foi possível encerrar a votação.'), 'error')
    }
  }

  async function compartilhar() {
    if (!dados) return
    try {
      const imagem = await gerarImagemDestaques({
        destaques: dados.destaques,
        placar: `${dados.time_a_nome} ${dados.placar_a} x ${dados.placar_b} ${dados.time_b_nome}`,
        racha: nomeRacha,
      })
      await compartilharImagem(imagem, 'destaques-da-partida.png', 'Destaques da partida')
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') toast('Não foi possível gerar a imagem.', 'error')
    }
  }

  if (carregando) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-500" />
      </div>
    )
  }

  if (!dados) {
    return (
      <div className="card py-10 text-center">
        <p className="font-semibold text-white">{erro || 'Partida não encontrada.'}</p>
        <button type="button" onClick={() => void carregar()} className="btn-secondary mt-4">
          Tentar de novo
        </button>
      </div>
    )
  }

  const placar = (
    <p className="text-center text-sm font-bold text-gray-400">
      {dados.time_a_nome} <span className="text-white">{dados.placar_a} x {dados.placar_b}</span> {dados.time_b_nome}
    </p>
  )
  const prazo = dados.votacao_ate ? new Date(dados.votacao_ate) : null

  // Escolhendo (votar ou definir): lista de quem jogou, tocando para ordenar do 1º ao 3º.
  if (modo) {
    return (
      <div className="space-y-4 pb-24">
        {placar}
        <div className="card space-y-1 text-center">
          <p className="text-base font-black text-white">{modo === 'votar' ? 'Seu voto' : 'Escolha do admin'}</p>
          <p className="text-sm text-gray-400">Toque no 1º, depois no 2º e no 3º. Toque de novo para tirar.</p>
        </div>
        <ul className="card divide-y divide-gray-800 p-0">
          {candidatos.map((c) => {
            const lugar = escolha.indexOf(c.atleta_id)
            return (
              <li key={c.atleta_id}>
                <button
                  type="button"
                  onClick={() => alternar(c.atleta_id)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${lugar >= 0 ? 'bg-emerald-500/10' : 'hover:bg-gray-800/50'}`}
                >
                  <Avatar src={c.foto_url} name={c.apelido || c.nome} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-white">{nomeCurto(c)}</span>
                    <span className="block truncate text-xs text-gray-500">
                      {[c.lado === 'a' ? dados.time_a_nome : c.lado === 'b' ? dados.time_b_nome : null, c.resumo]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  {lugar >= 0 ? (
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-black text-slate-900"
                      style={{ backgroundColor: CORES_PODIO[lugar] }}
                    >
                      {lugar + 1}º
                    </span>
                  ) : (
                    <span className="h-8 w-8 rounded-full border border-gray-700" aria-hidden="true" />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
        {/* Presa acima do menu de baixo: com o elenco todo na lista, os botões ficam sempre à mão. */}
        <div className="sticky bottom-24 z-20 grid grid-cols-2 gap-2 rounded-2xl border border-gray-800 bg-fundo/95 p-2 shadow-lg backdrop-blur md:bottom-4">
          <button type="button" onClick={() => { setModo(null); setEscolha([]) }} className="btn-secondary h-12">
            Cancelar
          </button>
          <button type="button" disabled={enviando || escolha.length === 0} onClick={() => void enviar()} className="btn-primary h-12">
            <Check size={17} /> {modo === 'votar' ? 'Votar' : 'Salvar'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-24">
      {placar}

      {dados.situacao === 'aguardando' && (
        <div className="card py-8 text-center">
          <Clock size={28} className="mx-auto text-gray-500" />
          <p className="mt-3 font-bold text-white">A partida ainda não acabou</p>
          <p className="mt-1 text-sm text-gray-500">Quando o admin encerrar, abre a votação dos três melhores.</p>
        </div>
      )}

      {dados.situacao === 'votacao' && (
        <section className="card space-y-4 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
            <Vote size={24} />
          </span>
          <div>
            <p className="text-lg font-black text-white">Votação aberta</p>
            {prazo && (
              <p className="text-sm text-gray-400">
                Até {format(prazo, "EEEE 'às' HH:mm", { locale: ptBR })} · faltam {formatDistanceToNowStrict(prazo, { locale: ptBR })}
              </p>
            )}
          </div>
          <p className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-gray-300">
            <Users size={15} /> {dados.votantes} de {dados.total_participantes} já votaram
          </p>
          {dados.pode_votar ? (
            <>
              {dados.meu_voto.length > 0 && (
                <p className="text-sm text-gray-400">
                  Seu voto:{' '}
                  {dados.meu_voto
                    .map((id, i) => `${i + 1}º ${nomeCurto(dados.candidatos.find((c) => c.atleta_id === id) ?? ({ nome: '?' } as AtletaDestaque))}`)
                    .join(' · ')}
                </p>
              )}
              <button
                type="button"
                onClick={() => { setEscolha(dados.meu_voto); setModo('votar') }}
                className="btn-primary h-12 w-full"
              >
                <Vote size={17} /> {dados.meu_voto.length ? 'Mudar meu voto' : 'Votar nos três melhores'}
              </button>
            </>
          ) : (
            <p className="text-xs text-gray-500">Só quem jogou a partida vota.</p>
          )}
          {dados.is_admin && (
            <div className="grid grid-cols-2 gap-2 border-t border-gray-800 pt-4">
              <button type="button" onClick={() => setConfirmarEncerrar(true)} className="btn-secondary text-sm">
                Encerrar agora
              </button>
              <button type="button" onClick={() => { setEscolha([]); setModo('definir') }} className="btn-secondary text-sm">
                Eu escolho
              </button>
            </div>
          )}
        </section>
      )}

      {dados.situacao === 'encerrada' && (
        <>
          {dados.destaques.length === 0 ? (
            <div className="card py-8 text-center">
              <Award size={28} className="mx-auto text-gray-500" />
              <p className="mt-3 font-bold text-white">Sem destaques nesta partida</p>
              {dados.is_admin && (
                <button type="button" onClick={() => { setEscolha([]); setModo('definir') }} className="btn-primary mt-4">
                  Escolher os destaques
                </button>
              )}
            </div>
          ) : (
            <>
              <section className="grid grid-cols-3 items-end gap-2">
                {[2, 1, 3].map((colocacao) => {
                  const d = dados.destaques.find((x) => x.colocacao === colocacao)
                  if (!d) return <div key={colocacao} />
                  const primeiro = colocacao === 1
                  return (
                    <div
                      key={colocacao}
                      className={`flex flex-col items-center rounded-[1.5rem] border bg-gray-900/40 px-2 text-center ${primeiro ? 'border-2 pb-4 pt-3' : 'border-gray-800 pb-3 pt-4'}`}
                      style={primeiro ? { borderColor: CORES_PODIO[0] } : undefined}
                    >
                      {primeiro && (
                        <span className="mb-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-400">
                          Melhor jogador
                        </span>
                      )}
                      <div className="relative">
                        <span
                          className="block rounded-full p-0.5"
                          style={{ backgroundColor: CORES_PODIO[colocacao - 1] }}
                        >
                          <Avatar src={d.foto_url} name={d.apelido || d.nome} size={primeiro ? 'lg' : 'md'} />
                        </span>
                        <span
                          className="absolute -bottom-1 left-1/2 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full text-[11px] font-black text-slate-900"
                          style={{ backgroundColor: CORES_PODIO[colocacao - 1] }}
                        >
                          {colocacao}º
                        </span>
                      </div>
                      <p className={`mt-3 line-clamp-2 w-full break-words font-black leading-tight text-white ${tamanhoNome(nomeCurto(d), primeiro)}`}>{nomeCurto(d)}</p>
                      <p className="w-full truncate text-[11px] text-gray-500">{d.resumo || labelPosicao(d.posicao)}</p>
                      {d.pontos ? <p className="text-[11px] font-bold text-gray-400">{d.pontos} {d.pontos === 1 ? 'ponto' : 'pontos'} de voto</p> : null}
                    </div>
                  )
                })}
              </section>
              <p className="text-center text-xs font-semibold text-gray-500">{ORIGEM[dados.destaques[0].origem]}</p>
              <div className="grid grid-cols-1 gap-2">
                <button type="button" onClick={() => void compartilhar()} className="btn-primary h-12">
                  <Share2 size={17} /> Compartilhar no grupo
                </button>
                {dados.is_admin && (
                  <button type="button" onClick={() => { setEscolha(dados.destaques.map((d) => d.atleta_id)); setModo('definir') }} className="btn-secondary h-11">
                    Trocar destaques
                  </button>
                )}
              </div>
            </>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmarEncerrar}
        title="Encerrar votação"
        description={`${dados.votantes} de ${dados.total_participantes} votaram. O pódio sai dos votos que chegaram até agora.`}
        confirmLabel="Encerrar"
        onConfirm={() => void encerrarVotacao()}
        onCancel={() => setConfirmarEncerrar(false)}
      />
    </div>
  )
}
