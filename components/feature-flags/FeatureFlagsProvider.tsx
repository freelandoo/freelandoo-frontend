"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

type FlagMap = Record<string, boolean>

const FeatureFlagsContext = createContext<FlagMap>({})

const LS_KEY = "fl_feature_flags"

/**
 * Provider global das feature flags (Painel de Controle do admin). Busca o mapa
 * público { flag_key: is_enabled } uma vez e o expõe via contexto. Montado no
 * layout raiz — client-only, NÃO lê cookies/headers (não re-dinamiza rotas, F3.S5).
 *
 * Hidratação: começa vazio ({}) para bater com o SSR e evitar hydration
 * mismatch; no efeito, hidrata do cache local (evita flash em visitas
 * repetidas) e então busca a verdade do servidor.
 */
export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<FlagMap>({})

  useEffect(() => {
    // 1) cache local: pinta o estado conhecido antes da rede responder.
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) setFlags(JSON.parse(raw))
    } catch {
      /* cache corrompido — ignora */
    }

    // 2) verdade do servidor.
    let cancelled = false
    fetch("/api/feature-flags", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.flags) return
        setFlags(data.flags)
        try {
          localStorage.setItem(LS_KEY, JSON.stringify(data.flags))
        } catch {
          /* storage cheio/bloqueado — ok */
        }
      })
      .catch(() => {
        /* offline/erro — segue com o que tiver (fail-open no hook) */
      })
    return () => {
      cancelled = true
    }
  }, [])

  return <FeatureFlagsContext.Provider value={flags}>{children}</FeatureFlagsContext.Provider>
}

/**
 * `true` quando a responsabilidade está ligada. Fail-open: enquanto o mapa não
 * carregou (ou a flag não existe), tratamos como LIGADO — só esconde quando o
 * backend disse explicitamente `false`. Evita esconder tudo por erro de rede.
 */
export function useFeature(key: string): boolean {
  const flags = useContext(FeatureFlagsContext)
  return flags[key] !== false
}
