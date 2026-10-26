import type { EscalacaoEsporte, Formation } from '../../escalacao/tipos'
import QuadraVolei from './Quadra'

// Time A na metade de baixo, de frente para a rede: linha de frente 4-3-2, fundo 5-6-1.
const FRENTE = '65%'
const FUNDO = '87%'

const FORMACOES: Record<string, Formation[]> = {
  volei_quadra: [
    {
      id: '5-1',
      name: '5-1',
      positions: [
        { id: 'p4', label: 'OPO', top: FRENTE, left: '18%' },
        { id: 'p3', label: 'CEN', top: FRENTE, left: '50%' },
        { id: 'p2', label: 'PON', top: FRENTE, left: '82%' },
        { id: 'p5', label: 'PON', top: FUNDO, left: '18%' },
        { id: 'p6', label: 'CEN', top: FUNDO, left: '50%' },
        { id: 'p1', label: 'LEV', top: FUNDO, left: '82%' },
      ],
    },
    {
      id: '4-2',
      name: '4-2',
      positions: [
        { id: 'p4', label: 'LEV', top: FRENTE, left: '18%' },
        { id: 'p3', label: 'CEN', top: FRENTE, left: '50%' },
        { id: 'p2', label: 'PON', top: FRENTE, left: '82%' },
        { id: 'p5', label: 'PON', top: FUNDO, left: '18%' },
        { id: 'p6', label: 'CEN', top: FUNDO, left: '50%' },
        { id: 'p1', label: 'LEV', top: FUNDO, left: '82%' },
      ],
    },
  ],
  volei_areia: [
    {
      id: 'losango',
      name: 'Losango',
      positions: [
        { id: 'lev', label: 'LEV', top: '62%', left: '50%' },
        { id: 'ata1', label: 'ATA', top: '74%', left: '16%' },
        { id: 'ata2', label: 'ATA', top: '74%', left: '84%' },
        { id: 'def', label: 'DEF', top: '88%', left: '50%' },
      ],
    },
    {
      id: 'quadrado',
      name: 'Quadrado',
      positions: [
        { id: 'ata1', label: 'ATA', top: '65%', left: '26%' },
        { id: 'lev', label: 'LEV', top: '65%', left: '74%' },
        { id: 'def', label: 'DEF', top: '87%', left: '26%' },
        { id: 'ata2', label: 'ATA', top: '87%', left: '74%' },
      ],
    },
  ],
}

const formacoes = (tipo: string) => FORMACOES[tipo] ?? FORMACOES.volei_quadra

export const escalacaoVolei: EscalacaoEsporte = {
  formacoes,
  jogadoresPorTime: (tipo) => formacoes(tipo)[0].positions.length,
  Fundo: QuadraVolei,
  local: 'quadra',
  descricao: (tipo) =>
    tipo === 'volei_areia' ? 'Quatro na areia, cobrindo a quadra inteira.' : 'Seis em quadra, nas posições de rodízio.',
}
