import type { Esporte } from '../types'
import Cena from './Cena'
import { escalacaoBasquete } from './escalacao'
import Icone from './Icone'

const basquete: Esporte = {
  id: 'basquete',
  nome: 'Basquete',
  Icone,
  Cena,
  modalidades: [
    { id: 'basquete_5x5', nome: 'Quadra 5x5', descricao: 'Jogo tradicional, quadra inteira', jogadoresPorTime: 5 },
    { id: 'basquete_3x3', nome: '3x3', descricao: 'Meia quadra, uma cesta', jogadoresPorTime: 3 },
  ],
  posicoes: {
    armador: 'Armador',
    ala_armador: 'Ala-armador',
    ala: 'Ala',
    ala_pivo: 'Ala-pivô',
    pivo: 'Pivô',
  },
  posicaoPadrao: 'ala',
  pontuacao: 'Cestas',
  lance: 'Cesta',
  placar: { tipo: 'tempo', titulo: 'Tempo do quarto', minutos: [5, 8, 10, 12], periodo: { nome: 'quarto', total: 4 } },
  escalacao: escalacaoBasquete,
  recursos: ['escalacao'],
}

export default basquete
