import { createContext, useContext } from 'react'
import { membro, type No } from './corpo'

export interface Tons {
  base: string
  sombra: string
  brilho: string
}

// Parte do corpo com volume: base, faixa de sombra de um lado e brilho do outro.
// `lado` inverte a luz quando o membro aponta para o outro sentido.
export function Parte({ nos, tons, lado = 1 }: { nos: readonly No[]; tons: Tons; lado?: 1 | -1 }) {
  return (
    <g>
      <path d={membro(nos)} fill={tons.base} />
      <path d={membro(nos, { deslocamento: -0.2 * lado, escala: 0.55 })} fill={tons.sombra} opacity="0.6" />
      <path d={membro(nos, { deslocamento: 0.26 * lado, escala: 0.22 })} fill={tons.brilho} opacity="0.45" />
    </g>
  )
}

// Desliga as animações das cenas (ex.: quem pediu "reduzir movimento" no sistema).
export const AnimacaoAtiva = createContext(true)

const EASE = '0.45 0 0.55 1'

function splines(values: string) {
  return Array(values.split(';').length - 1).fill(EASE).join(';')
}

interface AnimarProps {
  values: string
  keyTimes: string
  dur: string
  // Bola em voo fica melhor sem easing.
  linear?: boolean
  // Uma curva por trecho, no formato do keySplines do SVG; sem isso usa ease-in-out.
  curvas?: string
  // Atraso inicial; negativo começa no meio do ciclo (útil para desencontrar elementos iguais).
  inicio?: string
}

export function useAnimacaoAtiva() {
  return useContext(AnimacaoAtiva)
}

export function Animar({ tipo, values, keyTimes, dur, linear, curvas, inicio }: AnimarProps & { tipo: 'translate' | 'rotate' | 'scale' }) {
  if (!useContext(AnimacaoAtiva)) return null
  return (
    <animateTransform
      attributeName="transform"
      type={tipo}
      values={values}
      keyTimes={keyTimes}
      dur={dur}
      begin={inicio}
      repeatCount="indefinite"
      additive="sum"
      calcMode={linear ? 'linear' : 'spline'}
      keySplines={linear ? undefined : curvas ?? splines(values)}
    />
  )
}

// Ponto que percorre um caminho; sem animação ele simplesmente não aparece.
export function PontoNoCaminho({ caminho, dur, inicio, r, cor }: { caminho: string; dur: string; inicio?: string; r: number; cor: string }) {
  if (!useContext(AnimacaoAtiva)) return null
  return (
    <circle r={r} fill={cor}>
      <animateMotion path={caminho} dur={dur} begin={inicio} repeatCount="indefinite" />
    </circle>
  )
}

export function Girar({ dur, sentido = 1 }: { dur: string; sentido?: 1 | -1 }) {
  if (!useContext(AnimacaoAtiva)) return null
  return (
    <animateTransform
      attributeName="transform"
      type="rotate"
      values={`0;${360 * sentido}`}
      dur={dur}
      repeatCount="indefinite"
      additive="sum"
    />
  )
}

export function AnimarAtributo({ atributo, values, keyTimes, dur, inicio }: AnimarProps & { atributo: string }) {
  if (!useContext(AnimacaoAtiva)) return null
  return (
    <animate
      attributeName={atributo}
      values={values}
      keyTimes={keyTimes}
      dur={dur}
      begin={inicio}
      repeatCount="indefinite"
    />
  )
}
