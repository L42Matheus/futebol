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
  cor?: string
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
