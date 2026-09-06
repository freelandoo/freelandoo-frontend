"use client"

// O próximo horário livre da equipe, lido do backend pelo NAVEGADOR.
//
// ═══ POR QUE NÃO VEM COM A PÁGINA ═══
//
// A página pública é servida com ISR de 10 minutos. Um horário embutido no HTML
// seria servido por até 10 minutos depois de a vaga ter sido tomada, e o
// visitante clicaria em "Agendar agora" para descobrir que o horário não existe
// mais. Aqui a resposta é sempre de agora.
//
// É UMA chamada por visita, não um poll: não há intervalo, não há reconsulta em
// foco. A regra de economia do projeto (recorrente vai por socket, nunca por
// polling) continua valendo — isto não é recorrente.

import { useEffect, useState } from "react"

export type NextSlot = {
  /** `AAAA-MM-DD`. */
  date: string
  /** `HH:MM`. */
  start: string
  is_today: boolean
  professional: {
    id_profile: string
    name: string
    profession: string | null
    avatar_url: string | null
  }
}

export function useNextSlot(communityId: string | null): {
  slot: NextSlot | null
  loading: boolean
} {
  const [slot, setSlot] = useState<NextSlot | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!communityId) {
      setSlot(null)
      return
    }
    // `cancelled` em vez de AbortController: trocar de comunidade no construtor
    // não pode fazer a resposta antiga chegar depois e sobrescrever a nova.
    let cancelled = false
    setLoading(true)
    fetch(`/api/communities/${communityId}/site/next-slot`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return
        setSlot(d?.slot || null)
      })
      .catch(() => {
        // Backend fora do ar não pode quebrar a página: sem horário, o cartão
        // volta ao texto que o líder escreveu.
        if (!cancelled) setSlot(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [communityId])

  return { slot, loading }
}
