import type { Esporte } from '../types'
import Cena from './Cena'
import Icone from './Icone'

const futebol: Esporte = {
  id: 'futebol',
  nome: 'Futebol',
  Icone,
  Cena,
  // A primeira modalidade é a sugerida ao criar um racha.
  modalidades: [
    { id: 'society', nome: 'Society', descricao: 'De 5 a 8 por time', jogadoresPorTime: 7, tamanhos: [5, 6, 7, 8] },
    { id: 'campo', nome: 'Campo', descricao: '11 contra 11', jogadoresPorTime: 11 },
    { id: 'futsal', nome: 'Futsal', descricao: '5 contra 5 na quadra', jogadoresPorTime: 5 },
  ],
  posicoes: {
    goleiro: 'Goleiro',
    zagueiro: 'Zagueiro',
    lateral: 'Lateral',
    volante: 'Volante',
    meia: 'Meia',
    atacante: 'Atacante',
    ponta: 'Ponta',
  },
  posicaoPadrao: 'meia',
  pontuacao: 'Gols',
  placar: { tipo: 'tempo', titulo: 'Tempo de jogo', minutos: [5, 10, 15, 20, 30, 45] },
  recursos: ['escalacao', 'artilharia', 'cartoes'],
}

export default futebol
