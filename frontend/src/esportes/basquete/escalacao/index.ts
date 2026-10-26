import type { EscalacaoEsporte, Formation } from '../../escalacao/tipos'
import QuadraBasquete from './Quadra'

// Time A atacando a cesta de cima.
const FORMACOES: Record<string, Formation[]> = {
  basquete_5x5: [
    {
      id: '1-2-2',
      name: '1-2-2',
      positions: [
        { id: 'arm', label: 'ARM', top: '46%', left: '50%' },
        { id: 'aa', label: 'AA', top: '32%', left: '10%' },
        { id: 'ala', label: 'ALA', top: '32%', left: '90%' },
        { id: 'ap', label: 'AP', top: '16%', left: '30%' },
        { id: 'piv', label: 'PIV', top: '16%', left: '70%' },
      ],
    },
    {
      id: '1-4',
      name: '1-4 aberta',
      positions: [
        { id: 'arm', label: 'ARM', top: '46%', left: '50%' },
        { id: 'aa', label: 'AA', top: '28%', left: '10%' },
        { id: 'ala', label: 'ALA', top: '28%', left: '90%' },
        { id: 'ap', label: 'AP', top: '13%', left: '32%' },
        { id: 'piv', label: 'PIV', top: '13%', left: '68%' },
      ],
    },
  ],
  basquete_3x3: [
    {
      id: 'triangulo',
      name: 'Triângulo',
      positions: [
        { id: 'arm', label: 'ARM', top: '44%', left: '50%' },
        { id: 'ala', label: 'ALA', top: '28%', left: '16%' },
        { id: 'piv', label: 'PIV', top: '15%', left: '70%' },
      ],
    },
    {
      id: 'pivo-central',
      name: 'Pivô central',
      positions: [
        { id: 'arm', label: 'ARM', top: '42%', left: '24%' },
        { id: 'ala', label: 'ALA', top: '42%', left: '76%' },
        { id: 'piv', label: 'PIV', top: '15%', left: '50%' },
      ],
    },
  ],
}

const formacoes = (tipo: string) => FORMACOES[tipo] ?? FORMACOES.basquete_5x5

export const escalacaoBasquete: EscalacaoEsporte = {
  formacoes,
  jogadoresPorTime: (tipo) => formacoes(tipo)[0].positions.length,
  Fundo: QuadraBasquete,
  local: 'quadra',
  descricao: (tipo) =>
    tipo === 'basquete_3x3' ? 'Três em quadra, atacando uma cesta só.' : 'Cinco em quadra, armador conduzindo o ataque.',
}
