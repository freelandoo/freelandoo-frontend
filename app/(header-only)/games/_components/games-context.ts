"use client"

// O DONO DO CONTEXTO da plataforma de games — o `?de=@fulano` da URL.
//
// Visitar o games de alguém não é entrar num espaço dele (ele não tem um): é
// olhar o RECORTE dele dentro da casa que é de todos. O feed continua o de
// todos; o que troca é a metade pessoal — o jogo atual e a vitrine de posts.
//
// ⚠️ PEÇA ÚNICA das páginas que aceitam o contexto (`/games/jogo` e
// `/games/posts`). Escrito solto em cada uma, a que esquecesse mostraria o
// recorte de quem olha dentro do games de outra pessoa, sem erro nenhum.
//
// Lido do WINDOW e uma vez só: `useSearchParams` obriga Suspense e tira a rota
// do pré-render (o build já quebrou assim com `?tipo=condo`).
//
// `undefined` = ainda resolvendo (a tela ESPERA, senão buscaria o recorte de
// quem olha e o trocaria por baixo); `null` = sem contexto, o recorte próprio.
// Contexto que não resolve cai no recorte próprio, nunca numa parede.

import { useEffect, useState } from "react"
import { getToken } from "@/lib/auth"

export type GamesOwner = {
  id_user: string
  username: string
  name?: string | null
  avatar_url?: string | null
}

export type GamesSubject = {
  platform?: string | null
  game_title?: string | null
  gamertag?: string | null
} | null

export function useGamesContext() {
  const [owner, setOwner] = useState<GamesOwner | null | undefined>(undefined)
  const [subject, setSubject] = useState<GamesSubject>(null)

  useEffect(() => {
    const who = new URLSearchParams(window.location.search).get("de")
    if (!who) {
      setOwner(null)
      return
    }
    const token = getToken()
    if (!token) {
      setOwner(null)
      return
    }
    let alive = true
    fetch(`/api/gamer/profile/${encodeURIComponent(who.replace(/^@/, ""))}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return
        // `is_me` vem do SERVIDOR: comparar ids carregados de origens
        // diferentes no front abriria o "Salvar" do jogo de um sobre a linha
        // de outro no dia em que discordassem.
        if (d?.owner?.id_user && !d?.is_me) {
          setOwner(d.owner)
          setSubject(d.subject ?? null)
        } else {
          setOwner(null)
        }
      })
      .catch(() => {
        if (alive) setOwner(null)
      })
    return () => {
      alive = false
    }
  }, [])

  return { owner, subject }
}

/** O rótulo de quem é o recorte: o nome, ou o @ quando não há nome. */
export function ownerLabel(owner: GamesOwner): string {
  return owner.name || `@${owner.username}`
}

/** O `?de=` preservado ao navegar entre as salas do mesmo contexto. */
export function withOwner(href: string, owner: GamesOwner | null | undefined): string {
  return owner ? `${href}?de=${encodeURIComponent(owner.username)}` : href
}
