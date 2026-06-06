"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"

interface SiteAssetsValue {
  assets: Record<string, string>
  setAsset: (slot: string, url: string) => void
}

const Ctx = createContext<SiteAssetsValue | null>(null)

export function useSiteAssets() {
  const v = useContext(Ctx)
  if (!v) throw new Error("useSiteAssets fora do SiteAssetsProvider")
  return v
}

export function SiteAssetsProvider({ children }: { children: React.ReactNode }) {
  const [assets, setAssets] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch("/api/site-assets", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.assets) setAssets(d.assets)
      })
      .catch(() => {})
  }, [])

  const setAsset = useCallback((slot: string, url: string) => {
    setAssets((prev) => ({ ...prev, [slot]: url }))
  }, [])

  return <Ctx.Provider value={{ assets, setAsset }}>{children}</Ctx.Provider>
}
