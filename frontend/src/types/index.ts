// ─── Domain Types ────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'atleta'

export interface User {
  id: number
  nome: string
  email: string
  telefone?: string
  role: UserRole
}

export type Posicao = 'goleiro' | 'zagueiro' | 'lateral' | 'volante' | 'meia' | 'atacante' | 'ponta'
export type Perna = 'direita' | 'esquerda' | 'ambidestra'
export type TipoRacha = 'campo' | 'society' | 'futsal'

export interface Racha {
  id: number
  nome: string
  tipo: TipoRacha
  total_atletas: number
  max_atletas: number
  escalacao_size?: number | null
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
  status?: string
}

export type PagamentoStatus = 'pendente' | 'aguardando_aprovacao' | 'aprovado' | 'rejeitado'
export type PagamentoTipo = 'mensalidade' | 'rateio' | 'multa_amarelo' | 'multa_vermelho' | 'outro'

export interface Pagamento {
  id: number
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
