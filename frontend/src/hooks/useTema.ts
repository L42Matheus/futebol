import { useEffect, useState } from 'react'

type PreferenciaTema = 'auto' | 'claro' | 'escuro'

// Mesma chave lida pelo script em index.html, que aplica o tema antes do primeiro desenho.
const CHAVE = 'quemjogafc:tema'
const SISTEMA_CLARO = '(prefers-color-scheme: light)'

function lerPreferencia(): PreferenciaTema {
  try {
    const valor = localStorage.getItem(CHAVE)
    return valor === 'claro' || valor === 'escuro' ? valor : 'auto'
  } catch {
    return 'auto'
  }
}

function aplicar(preferencia: PreferenciaTema): boolean {
  const claro = preferencia === 'claro' || (preferencia === 'auto' && window.matchMedia(SISTEMA_CLARO).matches)
  document.documentElement.classList.toggle('tema-claro', claro)
  return claro
}

// Sem escolha salva, o tema acompanha o sistema mesmo com o app aberto.
export function iniciarTema() {
  aplicar(lerPreferencia())
  window.matchMedia(SISTEMA_CLARO).addEventListener('change', () => aplicar(lerPreferencia()))
}

// Alternar grava uma escolha explícita (claro ou escuro), que passa a valer em vez do sistema.
export function useTema() {
  const [claro, setClaro] = useState(() => document.documentElement.classList.contains('tema-claro'))

  useEffect(() => {
    const atualizar = () => setClaro(document.documentElement.classList.contains('tema-claro'))
    const sistema = window.matchMedia(SISTEMA_CLARO)
    sistema.addEventListener('change', atualizar)
    return () => sistema.removeEventListener('change', atualizar)
  }, [])

  function alternar() {
    const nova: PreferenciaTema = claro ? 'escuro' : 'claro'
    try {
      localStorage.setItem(CHAVE, nova)
    } catch {
      // sem storage o tema vale só até recarregar
    }
    setClaro(aplicar(nova))
  }

  return { claro, alternar }
}
