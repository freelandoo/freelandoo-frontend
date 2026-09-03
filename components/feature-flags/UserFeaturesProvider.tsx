"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

type PrefMap = Record<string, boolean>

type UserFeaturesContextValue = {
  /**
   * Posse (Loja de Funções, mig 191): owned[key]=false quando a função está à
   * venda e o usuário NÃO comprou — a linha do menu e os pontos de entrada
   * somem. Fail-open: mapa vazio/chave ausente = possuída.
   *
   * É o ÚNICO gate por usuário que sobrou. A preferência pessoal da mig 186
   * (o liga/desliga da seção "Funções") foi descontinuada na mig 218: função
   * de usuário é sempre ligada.
   */
  owned: PrefMap
}

const UserFeaturesContext = createContext<UserFeaturesContextValue>({
  owned: {},
})

const LS_OWNED_KEY = "fl_user_features_owned"

/** Chaves da seção "Funções" (mesma whitelist do backend, mig 186). */
export const USER_FEATURE_KEYS = [
  "courses",
  "store",
  "services",
  "vaquinha",
  "communities",
  "wallet",
  "fitness_academias",
  "profiles",
  "agenda",
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
  const [owned, setOwned] = useState<PrefMap>({})

  useEffect(() => {
    try {
      const rawOwned = localStorage.getItem(LS_OWNED_KEY)
      if (rawOwned) setOwned(JSON.parse(rawOwned))
    } catch {
      /* cache corrompido — ignora */
    }
    // Cache da preferência descontinuada (mig 218): apagado no primeiro load
    // pós-deploy. Sem isso, um `false` guardado no navegador continuaria
    // escondendo a função até alguém limpar o storage na mão.
    try {
      localStorage.removeItem("fl_user_features")
    } catch {
      /* ok */
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
        if (cancelled || !data?.owned) return
        setOwned(data.owned)
        try {
          localStorage.setItem(LS_OWNED_KEY, JSON.stringify(data.owned))
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

  return (
    <UserFeaturesContext.Provider value={{ owned }}>
      {children}
    </UserFeaturesContext.Provider>
  )
}

/**
 * `true` quando a função vale PRA ESTE usuário: comprada na Loja de Funções —
 * ou grátis (`is_for_sale = FALSE`, caso da Carteira na mig 216 e da Academia
 * e da Vaquinha na mig 217). Fail-open: chave desconhecida ou mapa ainda não
 * carregado = ligada.
 *
 * NÃO existe mais desligar por usuário (mig 218). Combine com `useFeature(key)`
 * onde a função também tem flag global do admin — essa continua valendo e
 * vence tudo.
 */
export function useUserFeature(key: string): boolean {
  const { owned } = useContext(UserFeaturesContext)
  return owned[key] !== false
}

/** Mapa de posse completo (pra lista de funções do menu). */
export function useUserFeatures(): UserFeaturesContextValue {
  return useContext(UserFeaturesContext)
}
