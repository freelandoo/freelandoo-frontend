"use client"

/**
 * PÁGINA DE FUNDO CLARO — quem avisa o dock de que os ícones brancos sumiriam.
 *
 * O dock (`ProfileSidebar`) é transparente e desenha tinta branca; numa pele
 * clara (comunidade Pet, Condomínio) ele fica invisível. Pelo caminho ele não
 * sabe: `/comunidades/<uuid>` serve todas as modalidades e a pele só aparece
 * depois que a página busca a comunidade. Então, como no `community-shell`,
 * QUEM SABE DECLARA: a página monta o `<LightSurfaceBeacon>` e o dock lê.
 *
 * Registro por instância (e não um booleano) pela mesma armadilha da troca de
 * página descrita no `community-shell`: o cleanup do beacon antigo pode rodar
 * depois do mount do novo.
 */

import { useEffect, useSyncExternalStore } from "react"

const mounted = new Set<number>()
let token = 0
let snapshot = false
const listeners = new Set<() => void>()

function recompute() {
  const next = mounted.size > 0
  if (next === snapshot) return
  snapshot = next
  for (const l of listeners) l()
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

/** Lido pelo dock. `true` = a página atual tem fundo claro. */
export function useLightSurface(): boolean {
  return useSyncExternalStore(subscribe, () => snapshot, () => false)
}

/** Montado pelas telas de fundo claro. Não desenha nada — só declara. */
export function LightSurfaceBeacon() {
  useEffect(() => {
    const id = ++token
    mounted.add(id)
    recompute()
    return () => {
      mounted.delete(id)
      recompute()
    }
  }, [])
  return null
}
