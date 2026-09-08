"use client"

/**
 * O AMBIENTE GAMES — quem avisa o dock de que a barra de baixo mudou.
 *
 * ─── O PROBLEMA ──────────────────────────────────────────────────────────────
 *
 * O dock (`ProfileSidebar`) é global: mora no layout raiz e se desenha em toda
 * rota. Dentro da plataforma de games ele precisa trocar de conteúdo inteiro —
 * Feed, Estante, Jogo atual, Posts games e o Game —, e para isso precisa saber
 * que a rota atual é uma comunidade de GAMES.
 *
 * Pelo caminho (`usePathname`) ele NÃO tem como saber: `/comunidades/<uuid>`
 * serve todas as modalidades, e a modalidade só aparece depois que a página
 * busca a comunidade. A alternativa seria o dock fazer essa busca por conta
 * própria — uma requisição a mais em TODA visita a qualquer comunidade, para
 * responder a uma pergunta que a página ao lado já respondeu.
 *
 * ─── A SOLUÇÃO: QUEM SABE, DECLARA ───────────────────────────────────────────
 *
 * Quem já tem a resposta é a PÁGINA. Ela monta o `<GamesShellBeacon>` quando
 * sabe que está em games, e o dock lê. É a mesma disciplina do
 * `platform-chrome`: quem declara o ambiente é a página, nunca um palpite sobre
 * o pathname — lá isso importava porque subdomínio e domínio próprio chegam por
 * reescrita; aqui, porque a modalidade não está na URL.
 *
 * ─── POR QUE UMA LOJA DE MÓDULO, E NÃO UM CONTEXT ────────────────────────────
 *
 * Um Context precisaria de um Provider no layout raiz envolvendo tudo, e a
 * página (que é filha) não teria como escrever nele sem outro nível de estado.
 * A loja aqui é lida com `useSyncExternalStore`, que é a porta oficial do React
 * para estado que vive fora dele — sem tearing e sem re-render de árvore.
 *
 * ─── A ARMADILHA DA TROCA DE PÁGINA ──────────────────────────────────────────
 *
 * Navegar de `/comunidades/<id>` para `/comunidades/<id>/posts` desmonta um
 * beacon e monta outro, e a ordem entre as duas coisas não é garantida. Com uma
 * variável só, o cleanup do antigo apagaria o registro do novo e o dock voltaria
 * ao normal no meio do ambiente. Por isso o registro é um MAPA de instâncias
 * vivas: sai a que morreu, e o ambiente só acaba quando não sobra nenhuma.
 */

import { useEffect } from "react"
import { useSyncExternalStore } from "react"

type Shell = { communityId: string }

/** Beacons vivos, por token de instância. O ambiente é o último a entrar. */
const mounted = new Map<number, string>()
let token = 0
let snapshot: Shell | null = null

const listeners = new Set<() => void>()

function recompute() {
  const last = [...mounted.values()].pop() ?? null
  const next = last ? { communityId: last } : null
  // Identidade estável: `useSyncExternalStore` compara por referência, e um
  // objeto novo a cada leitura faria o dock re-renderizar para sempre.
  if (next?.communityId === snapshot?.communityId) return
  snapshot = next
  for (const l of listeners) l()
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

function getSnapshot() {
  return snapshot
}

/** No servidor o ambiente nunca está ativo: quem o liga é um efeito. */
function getServerSnapshot(): Shell | null {
  return null
}

/** Lido pelo dock. `null` = fora do ambiente games. */
export function useGamesShell(): Shell | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/**
 * Montado pelas telas da plataforma de games. Não desenha nada — só declara.
 */
export function GamesShellBeacon({ communityId }: { communityId: string }) {
  useEffect(() => {
    const id = ++token
    mounted.set(id, communityId)
    recompute()
    return () => {
      mounted.delete(id)
      recompute()
    }
  }, [communityId])
  return null
}
