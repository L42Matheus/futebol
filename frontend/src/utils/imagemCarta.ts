import { urlFoto } from '../components/Avatar'
import { CORES_NIVEL, estrelas, nivel } from './carta'

interface DadosCarta {
  nome: string
  fotoUrl?: string | null
  posicao?: string
  nota?: number | null
  atributos?: Record<string, number> | null
  lista: { sigla: string; nome: string }[]
  racha?: string
}

const LARGURA = 1080
const ALTURA = 1350

function carregarImagem(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    // Sem crossOrigin a foto "suja" o canvas e o toBlob falha.
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function estrela(ctx: CanvasRenderingContext2D, x: number, y: number, raio: number) {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? raio : raio * 0.45
    const angulo = (Math.PI / 5) * i - Math.PI / 2
    ctx.lineTo(x + r * Math.cos(angulo), y + r * Math.sin(angulo))
  }
  ctx.closePath()
}

// Gera a carta como PNG (1080 x 1350, formato de post) para compartilhar no grupo.
export async function gerarImagemCarta(dados: DadosCarta): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = LARGURA
  canvas.height = ALTURA
  const ctx = canvas.getContext('2d')!
  const cores = CORES_NIVEL[nivel(dados.nota)]
  const fonte = '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif'

  const fundo = ctx.createLinearGradient(0, 0, 0, ALTURA)
  fundo.addColorStop(0, '#0b2e1f')
  fundo.addColorStop(1, '#05110b')
  ctx.fillStyle = fundo
  ctx.fillRect(0, 0, LARGURA, ALTURA)

  // Carta
  const x = 150
  const y = 110
  const w = LARGURA - 300
  const h = ALTURA - 260
  const carta = ctx.createLinearGradient(0, y, 0, y + h)
  carta.addColorStop(0, '#0f5132')
  carta.addColorStop(0.55, '#06281a')
  carta.addColorStop(1, '#030b07')
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, 64)
  ctx.fillStyle = carta
  ctx.fill()
  ctx.lineWidth = 10
  ctx.strokeStyle = cores.moldura
  ctx.stroke()

  // Nota e posição
  ctx.textAlign = 'left'
  ctx.fillStyle = cores.destaque
  ctx.font = `900 150px ${fonte}`
  ctx.fillText(String(dados.nota ?? '–'), x + 60, y + 190)
  if (dados.posicao) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.font = `800 44px ${fonte}`
    ctx.fillText(dados.posicao.toUpperCase(), x + 66, y + 250)
  }

  // Foto
  const cx = LARGURA / 2
  const cy = y + 390
  const raio = 165
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, raio, 0, Math.PI * 2)
  ctx.closePath()
  ctx.fillStyle = '#065f46'
  ctx.fill()
  ctx.clip()
  const foto = dados.fotoUrl ? await carregarImagem(urlFoto(dados.fotoUrl)) : null
  if (foto) {
    const lado = Math.min(foto.width, foto.height)
    ctx.drawImage(foto, (foto.width - lado) / 2, (foto.height - lado) / 2, lado, lado, cx - raio, cy - raio, raio * 2, raio * 2)
  } else {
    ctx.fillStyle = '#ffffff'
    ctx.font = `900 120px ${fonte}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(dados.nome.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase(), cx, cy + 6)
    ctx.textBaseline = 'alphabetic'
  }
  ctx.restore()
  ctx.beginPath()
  ctx.arc(cx, cy, raio, 0, Math.PI * 2)
  ctx.lineWidth = 8
  ctx.strokeStyle = cores.moldura
  ctx.stroke()

  // Nome
  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  let tamanho = 76
  ctx.font = `900 ${tamanho}px ${fonte}`
  const nome = dados.nome.toUpperCase()
  while (ctx.measureText(nome).width > w - 120 && tamanho > 40) {
    tamanho -= 4
    ctx.font = `900 ${tamanho}px ${fonte}`
  }
  ctx.fillText(nome, cx, y + 680)

  // Estrelas
  const total = estrelas(dados.nota)
  for (let i = 0; i < 5; i++) {
    estrela(ctx, cx + (i - 2) * 70, y + 760, 28)
    ctx.fillStyle = i < total ? cores.destaque : 'rgba(255,255,255,0.18)'
    ctx.fill()
  }

  // Atributos
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(x + 60, y + 830)
  ctx.lineTo(x + w - 60, y + 830)
  ctx.stroke()
  const coluna = (w - 120) / dados.lista.length
  dados.lista.forEach(({ sigla }, i) => {
    const px = x + 60 + coluna * i + coluna / 2
    ctx.fillStyle = cores.destaque
    ctx.font = `800 36px ${fonte}`
    ctx.fillText(sigla.toUpperCase(), px, y + 905)
    ctx.fillStyle = '#ffffff'
    ctx.font = `900 54px ${fonte}`
    ctx.fillText(String(dados.atributos?.[sigla] ?? '–'), px, y + 975)
  })

  // Rodapé
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.font = `700 34px ${fonte}`
  ctx.fillText(dados.racha ? `${dados.racha} · QuemJogaFC` : 'QuemJogaFC', cx, ALTURA - 70)

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar a imagem'))), 'image/png'),
  )
}
