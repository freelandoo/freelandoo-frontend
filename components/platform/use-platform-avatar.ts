"use client"

// A FOTO DE ALGUÉM DENTRO DE UMA PLATAFORMA (mig 233) — games e Financeiro.
//
// Pedido do Alex (2026-09-09): "a foto de perfil você vai puxar do perfil
// principal, sempre. Mas, se a pessoa quiser alterar, ela altera e só altera o
// games. Assim também precisa ser no financeiro."
//
// ⚠️ A REGRA É `override ?? perfil.avatar`, e o override vem do backend
// (`GET /me/platform-avatar/<kind>`): ausência não é "sem foto", é "usa o
// rosto de sempre" — e é isso que faz quem nunca trocou nada continuar herdando
// a foto principal, inclusive quando a muda depois. Voltar a herdar é DELETE.
//
// ⚠️ PEÇA ÚNICA das duas plataformas. Nasceu dentro do headcard da Carteira e
// saiu de lá quando o games ganhou headcard próprio (2026-09-10): duas cópias
// do mesmo hook divergiriam na primeira correção — foi assim que a foto do
// perfil-conta acabou com três fontes antes da mig 215.
//
// `override` é `null` enquanto carrega e enquanto não há override: nos dois
// casos a tela desenha `perfil.avatar`, então a foto não pisca para um estado
// vazio.

import { useCallback, useEffect, useState } from "react"
import { getToken } from "@/lib/auth"

/** Espelho de PLATFORM_KINDS no backend (utils/gamesScore.js). */
export type PlatformAvatarKind = "finance" | "games"

export function usePlatformAvatar(kind: PlatformAvatarKind) {
  const [override, setOverride] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const token = getToken()
    if (!token) return
    let alive = true
    fetch(`/api/me/platform-avatar/${kind}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { avatar_url?: string | null } | null) => {
        if (alive && d?.avatar_url) setOverride(d.avatar_url)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [kind])

  const upload = useCallback(
    async (file: File) => {
      const token = getToken()
      if (!token) return false
      setBusy(true)
      try {
        const body = new FormData()
        body.append("avatar", file)
        const r = await fetch(`/api/me/platform-avatar/${kind}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
          body,
        })
        const d = (await r.json().catch(() => null)) as { avatar_url?: string | null } | null
        if (!r.ok || !d?.avatar_url) return false
        setOverride(d.avatar_url)
        return true
      } catch {
        return false
      } finally {
        setBusy(false)
      }
    },
    [kind]
  )

  const reset = useCallback(async () => {
    const token = getToken()
    if (!token) return false
    setBusy(true)
    try {
      const r = await fetch(`/api/me/platform-avatar/${kind}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!r.ok) return false
      setOverride(null)
      return true
    } catch {
      return false
    } finally {
      setBusy(false)
    }
  }, [kind])

  return { override, busy, upload, reset }
}
