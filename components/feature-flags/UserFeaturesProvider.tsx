"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"

type PrefMap = Record<string, boolean>

type UserFeaturesContextValue = {
  prefs: PrefMap
  setPref: (key: string, enabled: boolean) => void
}

const UserFeaturesContext = createContext<UserFeaturesContextValue>({
  prefs: {},
  setPref: () => {},
})

const LS_KEY = "fl_user_features"

/** Chaves da seção "Funções" (mesma whitelist do backend, mig 186). */
export const USER_FEATURE_KEYS = [
  "courses",
  "store",
  "vaquinha",
  "communities",
  "wallet",
  "fitness_academias",
  "profiles",
  // Única com efeito server-side: desligada, os perfis do user somem da
  // vitrine pública pra todo mundo (SearchStorage).
  "vitrine",
] as const

/**
 * Preferências de funções POR USUÁRIO (seção "Funções" do menu lateral) —
 * análogo pessoal do FeatureFlagsProvider. Esconde pontos de entrada da
 * experiência do PRÓPRIO usuário; a flag global do admin desligada sempre
 * vence (combinar com useFeature na superfície).
 *
 * Mesma mecânica do provider global: começa vazio (SSR-safe), hidrata do
 * cache local e busca a verdade do servidor (só com token). Fail-open.
 */
export function UserFeaturesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<PrefMap>({})

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) setPrefs(JSON.parse(raw))
    } catch {
      /* cache corrompido — ignora */
    }

    const token = localStorage.getItem("token")
    if (!token) return

    let cancelled = false
    fetch("/api/users/me/features", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.features) return
        setPrefs(data.features)
        try {
          localStorage.setItem(LS_KEY, JSON.stringify(data.features))
        } catch {
          /* storage cheio/bloqueado — ok */
        }
      })
      .catch(() => {
        /* offline/erro — segue com o cache (fail-open no hook) */
      })
    return () => {
      cancelled = true
    }
  }, [])

  const setPref = useCallback((key: string, enabled: boolean) => {
    // Otimista: aplica local e persiste; o PUT corre em background.
    setPrefs((prev) => {
      const next = { ...prev, [key]: enabled }
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(next))
      } catch {
        /* ok */
      }
      return next
    })
    const token = localStorage.getItem("token")
    if (!token) return
    fetch(`/api/users/me/features/${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ enabled }),
    }).catch(() => {
      /* falha de rede — preferência local segue valendo; próximo load re-sincroniza */
    })
  }, [])

  return (
    <UserFeaturesContext.Provider value={{ prefs, setPref }}>
      {children}
    </UserFeaturesContext.Provider>
  )
}

/**
 * `true` quando a função está ligada PRA ESTE usuário. Fail-open: desconhecida
 * ou mapa não carregado = ligada. Combine com useFeature(key) onde a função
 * também tem flag global do admin.
 */
export function useUserFeature(key: string): boolean {
  const { prefs } = useContext(UserFeaturesContext)
  return prefs[key] !== false
}

/** Mapa completo + setter (pra seção "Funções" do menu). */
export function useUserFeatures(): UserFeaturesContextValue {
  return useContext(UserFeaturesContext)
}
