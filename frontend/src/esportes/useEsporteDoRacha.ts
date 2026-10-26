import { useEffect, useState } from 'react'
import { rachasApi } from '../services/api'
import { esporteDaModalidade } from '.'
import type { Esporte } from './types'

// Um racha nunca troca de esporte (o backend impede), então a modalidade pode ficar em cache.
const modalidadePorRacha = new Map<string, Promise<string>>()

export function useEsporteDoRacha(rachaId?: number | string | null): Esporte | null {
  const [esporte, setEsporte] = useState<Esporte | null>(null)

  useEffect(() => {
    if (!rachaId) {
      setEsporte(null)
      return
    }
    const chave = String(rachaId)
    if (!modalidadePorRacha.has(chave)) {
      modalidadePorRacha.set(chave, rachasApi.get(chave).then((res) => res.data.tipo))
    }
    let ativo = true
    modalidadePorRacha
      .get(chave)!
      .then((tipo) => ativo && setEsporte(esporteDaModalidade(tipo)))
      .catch(() => modalidadePorRacha.delete(chave))
    return () => {
      ativo = false
    }
  }, [rachaId])

  return esporte
}
