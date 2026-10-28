import type { ComponentType } from 'react'
import type { EscalacaoEsporte } from './escalacao/tipos'

export type EsporteId = 'futebol' | 'basquete' | 'volei'

// Telas que nem todo esporte tem. Precisa bater com app/esportes no backend.
export type Recurso = 'escalacao' | 'artilharia' | 'cartoes'

export interface Modalidade {
  // Gravado em rachas.tipo; único entre todos os esportes.
  id: string
  nome: string
  descricao: string
  jogadoresPorTime: number
  // Quando existe, o admin escolhe quantos jogadores por time (ex.: society 5 a 8).
  tamanhos?: number[]
}

export interface IconeProps {
  className?: string
  size?: number
}

// Como a partida é controlada na tela de tempo: por cronômetro ou por pontos.
export type Placar =
  | {
      tipo: 'tempo'
      titulo: string
      minutos: number[]
      // Esportes jogados em partes (ex.: 4 quartos no basquete).
      periodo?: { nome: string; total: number }
    }
  | { tipo: 'pontos'; titulo: string; pontosPorSet: number[]; padrao: number }

export interface Esporte {
  id: EsporteId
  nome: string
  Icone: ComponentType<IconeProps>
  // Ilustração animada usada na landing.
  Cena: ComponentType
  modalidades: Modalidade[]
  posicoes: Record<string, string>
  posicaoPadrao: string
  // Como se chama o que o atleta marca: gols, cestas, pontos.
  pontuacao: string
  // O mesmo no singular, para um lance na partida: gol, cesta, ponto.
  lance: string
  placar: Placar
  // Presente nos esportes com o recurso 'escalacao'.
  escalacao?: EscalacaoEsporte
  recursos: Recurso[]
}
