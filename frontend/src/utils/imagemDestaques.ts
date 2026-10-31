import { urlFoto } from '../components/Avatar'
import { carregarImagem } from './imagemCarta'
import type { Destaque } from '../types'

const LARGURA = 1080
const ALTURA = 1350
const CORES = ['#e0a526', '#b8c2cc', '#c2773c']

// Pódio dos destaques como PNG (1080 x 1350) para compartilhar no grupo.
export async function gerarImagemDestaques(dados: {
  destaques: Destaque[]
  placar: string
  racha?: string
}): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = LARGURA
  canvas.height = ALTURA
  const ctx = canvas.getContext('2d')!
  const fonte = '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif'

  const fundo = ctx.createLinearGradient(0, 0, 0, ALTURA)
  fundo.addColorStop(0, '#0b2e1f')
  fundo.addColorStop(1, '#05110b')
  ctx.fillStyle = fundo
  ctx.fillRect(0, 0, LARGURA, ALTURA)

  ctx.textAlign = 'center'
  ctx.fillStyle = '#fbd77a'
  ctx.font = `800 40px ${fonte}`
  ctx.fillText('DESTAQUES DA PARTIDA', LARGURA / 2, 150)
  ctx.fillStyle = '#ffffff'
  ctx.font = `900 64px ${fonte}`
  ctx.fillText(dados.placar, LARGURA / 2, 240)

  // 2º à esquerda, 1º no meio e mais alto, 3º à direita.
  const lugares = [
    { colocacao: 2, x: 250, y: 700, raio: 130 },
    { colocacao: 1, x: 540, y: 600, raio: 175 },
    { colocacao: 3, x: 830, y: 700, raio: 130 },
  ]
  for (const lugar of lugares) {
    const d = dados.destaques.find((x) => x.colocacao === lugar.colocacao)
    if (!d) continue
    const cor = CORES[lugar.colocacao - 1]
    ctx.save()
    ctx.beginPath()
    ctx.arc(lugar.x, lugar.y, lugar.raio, 0, Math.PI * 2)
    ctx.fillStyle = '#065f46'
    ctx.fill()
    ctx.clip()
    const foto = d.foto_url ? await carregarImagem(urlFoto(d.foto_url)) : null
    if (foto) {
      const lado = Math.min(foto.width, foto.height)
      ctx.drawImage(foto, (foto.width - lado) / 2, (foto.height - lado) / 2, lado, lado, lugar.x - lugar.raio, lugar.y - lugar.raio, lugar.raio * 2, lugar.raio * 2)
    } else {
      ctx.fillStyle = '#ffffff'
      ctx.font = `900 ${Math.round(lugar.raio * 0.7)}px ${fonte}`
      ctx.textBaseline = 'middle'
      ctx.fillText(d.nome.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase(), lugar.x, lugar.y + 4)
      ctx.textBaseline = 'alphabetic'
    }
    ctx.restore()
    ctx.beginPath()
    ctx.arc(lugar.x, lugar.y, lugar.raio, 0, Math.PI * 2)
    ctx.lineWidth = 10
    ctx.strokeStyle = cor
    ctx.stroke()

    // Selo da colocação
    ctx.beginPath()
    ctx.arc(lugar.x, lugar.y + lugar.raio, 36, 0, Math.PI * 2)
    ctx.fillStyle = cor
    ctx.fill()
    ctx.fillStyle = '#10161a'
    ctx.font = `900 38px ${fonte}`
    ctx.fillText(`${lugar.colocacao}º`, lugar.x, lugar.y + lugar.raio + 14)

    const nome = (d.apelido || d.nome.split(' ')[0]).toUpperCase()
    ctx.fillStyle = '#ffffff'
    ctx.font = `900 ${lugar.colocacao === 1 ? 58 : 44}px ${fonte}`
    ctx.fillText(nome, lugar.x, lugar.y + lugar.raio + 110)
    if (d.resumo) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.font = `700 32px ${fonte}`
      ctx.fillText(d.resumo, lugar.x, lugar.y + lugar.raio + 158)
    }
    if (lugar.colocacao === 1) {
      ctx.fillStyle = cor
      ctx.font = `800 36px ${fonte}`
      ctx.fillText('MELHOR JOGADOR', lugar.x, lugar.y - lugar.raio - 40)
    }
  }

  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.font = `700 34px ${fonte}`
  ctx.fillText(dados.racha ? `${dados.racha} · QuemJogaFC` : 'QuemJogaFC', LARGURA / 2, ALTURA - 70)

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar a imagem'))), 'image/png'),
  )
}

// Abre o compartilhar do celular; no computador, baixa a imagem.
export async function compartilharImagem(imagem: Blob, nomeArquivo: string, titulo: string) {
  const arquivo = new File([imagem], nomeArquivo, { type: 'image/png' })
  if (navigator.canShare?.({ files: [arquivo] })) {
    await navigator.share({ files: [arquivo], title: titulo })
    return
  }
  const link = document.createElement('a')
  link.href = URL.createObjectURL(arquivo)
  link.download = arquivo.name
  link.click()
  URL.revokeObjectURL(link.href)
}
