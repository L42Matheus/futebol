// ─── Domain Types ────────────────────────────────────────────────────────────

import type { EsporteId } from '../esportes/types'

export type UserRole = 'admin' | 'atleta'

export interface User {
  id: number
  nome: string
  email: string
  telefone?: string
  role: UserRole
}

// Valores válidos de posição e modalidade vêm do registro em src/esportes.
export type Posicao = string
export type Perna = 'direita' | 'esquerda' | 'ambidestra'
export type TipoRacha = string

export interface Racha {
  id: number
  nome: string
  tipo: TipoRacha
  esporte: EsporteId
  total_atletas: number
  max_atletas: number
  escalacao_size?: number | null
  valor_mensalidade?: number
  // Se quem está logado é admin deste racha.
  is_admin?: boolean
}

export interface Atleta {
  id: number
  nome: string
  apelido?: string
  posicao: Posicao
  numero_camisa?: number
  foto_url?: string
  is_admin: boolean
  racha_id: number
  telefone?: string
}

export interface Jogo {
  id: number
  data_hora: string
  local?: string
  total_confirmados: number
  racha_id: number
  valor_campo?: number
  time_a_id?: number | null
  time_b_id?: number | null
  time_a_nome?: string
  time_b_nome?: string
  placar_time_a?: number | null
  placar_time_b?: number | null
  vencedor?: 'time_a' | 'time_b' | 'empate' | null
  finalizado?: boolean
  iniciado_em?: string | null
  // Quarto ou set em andamento na partida ao vivo.
  periodo?: number | null
  status?: string
}

export type PagamentoStatus = 'pendente' | 'aguardando_aprovacao' | 'aprovado' | 'rejeitado'
export type PagamentoTipo = 'mensalidade' | 'rateio' | 'multa_amarelo' | 'multa_vermelho' | 'outro'

export interface Pagamento {
  id: number
  atleta_id: number
  atleta_nome: string
  tipo: PagamentoTipo
  referencia: string
  valor: number
  valor_formatado: string
  status: PagamentoStatus
  comprovante_url?: string
}

export interface Saldo {
  saldo: number
  saldo_formatado: string
  pendente: number
  pendente_formatado: string
}

export interface Profile {
  id: number
  nome: string
  apelido?: string
  foto_url?: string
  email: string
  telefone?: string
  posicao?: string | null
  perna_boa?: string | null
  numero_camisa?: number | null
}

export interface AtletaHistorico {
  financeiro: {
    pagamento_confirmado_mes_atual: boolean
  }
}

export interface JogoLista {
  confirmados: Array<{ atleta_id: number; nome: string }>
  recusados: Array<{ atleta_id: number; nome: string }>
  pendentes: Array<{ atleta_id: number; nome: string }>
}

export interface Team {
  id: number
  nome: string
  racha_id: number
  temporada_id?: number | null
  cor?: string
}

// ─── Assinatura (plano SaaS do admin) ──────────────────────────────────────────

export interface AssinaturaStatus {
  subscription_status: string | null
  subscription_id: string | null
  in_trial: boolean
  trial_ends_at: string | null
  current_period_end: string | null
  access_granted: boolean
  valor: number
}

export interface AssinarResponse {
  subscription_id: string
  billing_type: 'PIX' | 'CREDIT_CARD'
  payment_status: string | null
  invoice_url: string | null
  pix: {
    payload: string | null
    encoded_image: string | null
    expiration_date: string | null
  } | null
}

// ─── Auth Types ───────────────────────────────────────────────────────────────

export interface AuthResponse {
  access_token: string
  user?: User
}

export interface InviteToken {
  token: string
  racha_id: number
  role: UserRole
}

// Partida ao vivo (GET /jogos/:id/partida).
export type TipoLance = 'gol' | 'assistencia' | 'amarelo' | 'vermelho' | 'falta' | 'substituicao'

export interface Lance {
  id: number
  lado: 'a' | 'b'
  tipo: TipoLance
  // Vazio no ponto do time do vôlei (erro do adversário).
  atleta_id?: number | null
  // Na substituição, atleta_id entrou e atleta_sai_id saiu.
  atleta_sai_id?: number | null
  valor: number
  segundos?: number | null
  // Quarto ou set do lance.
  periodo?: number | null
  created_at?: string
}

export interface NovoLance {
  tipo: TipoLance
  atleta_id?: number
  // Só no ponto do time, sem atleta.
  lado?: 'a' | 'b'
  atleta_sai_id?: number
  valor?: number
}

export interface MembroPartida {
  atleta_id: number
  nome: string
  apelido?: string | null
  foto_url?: string | null
  posicao?: string | null
  numero_camisa?: number | null
  is_titular: boolean
  posicao_escalacao?: string | null
}

export interface TimePartida {
  lado: 'a' | 'b'
  team_id?: number | null
  nome: string
  placar: number
  membros: MembroPartida[]
}

export interface Partida {
  jogo_id: number
  racha_id: number
  data_hora: string
  local?: string | null
  iniciado_em?: string | null
  finalizado: boolean
  agora: string
  is_admin: boolean
  esporte: 'futebol' | 'basquete' | 'volei'
  eventos_permitidos: TipoLance[]
  valores_pontuacao: number[]
  // Quarto (basquete) ou set (vôlei) em andamento; 1 no futebol.
  periodo: number
  periodo_nome?: 'quarto' | 'set' | null
  periodos: number
  // Vôlei: o placar dos times é de sets, e os pontos ficam nas parciais.
  placar_por_periodo: boolean
  ponto_do_time: boolean
  pontos_por_set?: number | null
  parciais: { periodo: number; a: number; b: number }[]
  times: TimePartida[]
  eventos: Lance[]
}
