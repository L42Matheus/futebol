import type { CSSProperties, ReactNode } from 'react'
import { getEsporte, type EsporteId } from '../esportes'
import CenarioCartao from '../esportes/CenarioCartao'
import { mascoteDoAtleta } from '../esportes/mascotes'

// Cartão verde do esporte: cenário do esporte, atleta em 3D saindo pelo topo e o conteúdo à esquerda.
// É o mesmo cartão na página de escolha do esporte (/esporte) e na tela Sou atleta / Sou administrador,
// e com `transicao` ele, o nome e o mascote viram os da outra tela na transição entre as duas.
interface CartaoEsporteProps {
  esporte: EsporteId
  // Linha abaixo do nome (modalidades, frase).
  subtitulo?: ReactNode
  // Rodapé do cartão: botão ou etiqueta de ação.
  children?: ReactNode
  // Movimento do mascote ligado ao esporte (chute, drible, salto).
  animar?: boolean
  transicao?: boolean
  // Classes de altura do mascote (passa do topo do cartão quando maior que ele).
  classeMascote?: string
  // Lado do atleta; com 'esquerda' o texto vai para a direita e o cenário espelha.
  lado?: 'direita' | 'esquerda'
  className?: string
  style?: CSSProperties
}

export default function CartaoEsporte({
  esporte: id,
  subtitulo,
  children,
  animar = false,
  transicao = false,
  classeMascote = 'h-[118%]',
  lado = 'direita',
  className = '',
  style,
}: CartaoEsporteProps) {
  const esporte = getEsporte(id)
  const mascote = mascoteDoAtleta(id)
  const esquerda = lado === 'esquerda'

  return (
    <div className={`relative ${className}`} style={style}>
      <div
        className="tema-escuro relative h-full overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-900 shadow-lg shadow-emerald-950/20"
        style={{ viewTransitionName: transicao ? 'esporte-cartao' : undefined }}
      >
        <div
          className={`pointer-events-none absolute inset-0 ${
            esquerda
              ? 'bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.22),transparent_55%)]'
              : 'bg-[radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.22),transparent_55%)]'
          }`}
          aria-hidden="true"
        />
        {/* Espelhado com o atleta à esquerda: trave, tabela ou rede ficam atrás dele. */}
        <div className={`absolute inset-0 ${esquerda ? '-scale-x-100' : ''}`}>
          <CenarioCartao esporte={id} />
        </div>
        <div className={`relative z-10 flex h-full max-w-[60%] flex-col justify-between p-5 ${esquerda ? 'ml-auto items-end text-right' : ''}`}>
          <div>
            <p
              className={`flex items-center gap-2 text-3xl font-black tracking-tight text-white ${esquerda ? 'self-end' : 'self-start'}`}
              style={{ viewTransitionName: transicao ? 'esporte-nome' : undefined }}
            >
              <esporte.Icone size={26} className="shrink-0" />
              {esporte.nome}
            </p>
            {subtitulo && <div className="mt-1.5 text-xs font-medium leading-snug text-white/85">{subtitulo}</div>}
          </div>
          {children}
        </div>
      </div>
      {/* Fora do recorte do cartão, para a cabeça passar da borda de cima. */}
      <div
        className={`pointer-events-none absolute bottom-0 flex items-end ${esquerda ? '-left-1' : '-right-1'} ${classeMascote}`}
        style={{ viewTransitionName: transicao ? 'esporte-mascote' : undefined }}
        aria-hidden="true"
      >
        <img
          src={mascote.src}
          alt=""
          width={mascote.largura}
          height={mascote.altura}
          className={`mascote-busto h-full w-auto ${animar ? `mascote-mov mascote-mov-${id}` : ''}`}
        />
      </div>
    </div>
  )
}
