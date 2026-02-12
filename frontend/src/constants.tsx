import { Home, User, PlusCircle } from 'lucide-react'

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

export const NAV_ITEMS = [
  {
    path: '/',
    label: 'Início',
    icon: <Home size={20} />,
  },
  {
    path: '/perfil-atleta',
    label: 'Perfil',
    icon: <User size={20} />,
    athleteOnly: true,
  },
  {
    path: '/novo',
    label: 'Novo Racha',
    icon: <PlusCircle size={20} />,
    adminOnly: true,
  },
]
