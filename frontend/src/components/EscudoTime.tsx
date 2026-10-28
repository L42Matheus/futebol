// Escudo simples do time: as iniciais do nome numa cor por lado (A verde, B azul).
export default function EscudoTime({ nome, cor }: { nome: string; cor: 'emerald' | 'sky' }) {
  const partes = nome.split(/\s+/).filter(Boolean)
  // "Time Verde" -> TV; nome de uma palavra só usa as duas primeiras letras ("AB", "CO").
  const iniciais = (partes.length > 1 ? partes[0][0] + partes[1][0] : (partes[0] ?? '').slice(0, 2)).toUpperCase()
  return (
    <div className="flex min-w-0 flex-col items-center gap-2">
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-black text-branco shadow-lg ${
          cor === 'emerald' ? 'bg-emerald-500 shadow-emerald-950/40' : 'bg-sky-500 shadow-sky-950/40'
        }`}
      >
        {iniciais || '?'}
      </span>
      <p className="w-full truncate text-xs font-black uppercase tracking-wide text-white">{nome}</p>
    </div>
  )
}
