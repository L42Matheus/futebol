import { Home, User, PlusCircle, Trophy, DollarSign } from 'lucide-react'

export const POSICAO_LABELS: Record<string, string> = {
  goleiro: 'Goleiro',
  zagueiro: 'Zagueiro',
  lateral: 'Lateral',
  volante: 'Volante',
  meia: 'Meia',
  atacante: 'Atacante',
  ponta: 'Ponta',
}

export const PERNA_LABELS: Record<string, string> = {
  direita: 'Direita',
  esquerda: 'Esquerda',
  ambidestra: 'Ambidestra',
}

export const TIPO_RACHA_LABELS: Record<string, string> = {
  campo: 'Campo (11x11)',
  society: 'Society (7x7)',
  futsal: 'Futsal (5x5)',
}

export const PAGAMENTO_TIPO_LABELS: Record<string, string> = {
  mensalidade: 'Mensalidade',
  rateio: 'Rateio',
  multa_amarelo: 'Multa Amarelo',
  multa_vermelho: 'Multa Vermelho',
  outro: 'Outro',
}

export const NAV_ITEMS = [
  { path: '/', label: 'Inicio', icon: <Home size={20} /> },
  { path: '/artilharia', label: 'Ranking', icon: <Trophy size={20} /> },
  { path: '/novo', label: 'Novo', icon: <PlusCircle size={24} />, adminOnly: true, isFab: true },
  { path: '/financeiro', label: 'Caixa', icon: <DollarSign size={20} /> },
  { path: '/perfil-atleta', label: 'Perfil', icon: <User size={20} /> },
]
