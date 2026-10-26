import type { Esporte } from '../types'
import Cena from './Cena'
import Icone from './Icone'

const volei: Esporte = {
  id: 'volei',
  nome: 'Vôlei',
  Icone,
  Cena,
  modalidades: [
    { id: 'volei_quadra', nome: 'Quadra 6x6', descricao: 'Vôlei de quadra tradicional', jogadoresPorTime: 6 },
    { id: 'volei_areia', nome: 'Areia 4x4', descricao: 'Vôlei de praia em quartetos', jogadoresPorTime: 4 },
  ],
  posicoes: {
    levantador: 'Levantador',
    oposto: 'Oposto',
    ponteiro: 'Ponteiro',
    central: 'Central',
    libero: 'Líbero',
  },
  posicaoPadrao: 'ponteiro',
  pontuacao: 'Pontos',
  placar: { tipo: 'pontos', titulo: 'Placar do set', pontosPorSet: [15, 21, 25], padrao: 25 },
  recursos: [],
}

export default volei
