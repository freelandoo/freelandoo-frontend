"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, Search } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ESTADOS_BRASIL } from "@/lib/constants/estados-brasil"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { cn } from "@/lib/utils"

// Filtro de localização por REGIÃO agregada (Estado → Região). A cidade vira só
// dado de cadastro; a vitrine/feed agrupam por região (backend mig 121).
interface RegionFilterSheetProps {
  state: string | null
  regionId: number | null
  regionName: string | null
  onChange: (next: { state: string | null; regionId: number | null; regionName: string | null }) => void
  trigger: React.ReactNode
  accent?: string
}

interface Region {
  id_region: number
  name: string
}

export function RegionFilterSheet({
  state,
  regionId,
  regionName: _regionName,
  onChange,
  trigger,
  accent,
}: RegionFilterSheetProps) {
  const t = useTranslations("Feed")
  const [open, setOpen] = useState(false)
  const [stage, setStage] = useState<"state" | "region">(state ? "region" : "state")
  const [stateFilter, setStateFilter] = useState("")
  const [regionFilter, setRegionFilter] = useState("")
  const [regions, setRegions] = useState<Region[]>([])
  const [loadingRegions, setLoadingRegions] = useState(false)
  const [draftState, setDraftState] = useState<string | null>(state)

  useEffect(() => {
    if (!draftState) {
      setRegions([])
      return
    }
    let cancelled = false
    setLoadingRegions(true)
    fetch(`/api/regions?uf=${draftState}`)
      .then((r) => r.json())
      .then((data: { regions?: Region[] }) => {
        if (cancelled) return
        setRegions(Array.isArray(data?.regions) ? data.regions : [])
      })
      .catch(() => {
        if (!cancelled) setRegions([])
      })
      .finally(() => {
        if (!cancelled) setLoadingRegions(false)
      })
    return () => {
      cancelled = true
    }
  }, [draftState])

  const filteredStates = useMemo(() => {
    const q = stateFilter.trim().toLowerCase()
    if (!q) return ESTADOS_BRASIL
    return ESTADOS_BRASIL.filter(
      (e) => e.nome.toLowerCase().includes(q) || e.uf.toLowerCase().includes(q)
    )
  }, [stateFilter])

  const filteredRegions = useMemo(() => {
    const q = regionFilter.trim().toLowerCase()
    if (!q) return regions
    return regions.filter((r) => r.name.toLowerCase().includes(q))
  }, [regions, regionFilter])

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) {
      setStage(state ? "region" : "state")
      setDraftState(state)
      setStateFilter("")
      setRegionFilter("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm gap-0 border-white/10 bg-zinc-950 p-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-white">
            {stage === "state" ? t("stateTitle", "Estado") : t("regionTitle", "Região")}
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              value={stage === "state" ? stateFilter : regionFilter}
              onChange={(e) =>
                stage === "state"
                  ? setStateFilter(e.target.value)
                  : setRegionFilter(e.target.value)
              }
              placeholder={stage === "state" ? t("searchStateLabel", "Buscar estado") : t("searchRegionLabel", "Buscar região")}
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
            />
          </div>
        </div>

        <div className="max-h-[55vh] overflow-y-auto px-2 pb-3">
          <Option
            label={stage === "state" ? t("allStates", "Todos os estados") : t("allRegions", "Todas as regiões")}
            selected={stage === "state" ? !state : !regionId}
            onClick={() => {
              if (stage === "state") {
                onChange({ state: null, regionId: null, regionName: null })
              } else if (draftState) {
                onChange({ state: draftState, regionId: null, regionName: null })
              }
              setOpen(false)
            }}
          />

          {stage === "state" &&
            filteredStates.map((e) => (
              <Option
                key={e.uf}
                label={`${e.nome} — ${e.uf}`}
                accent={accent}
                selected={draftState === e.uf}
                onClick={() => {
                  setDraftState(e.uf)
                  setStage("region")
                }}
              />
            ))}

          {stage === "region" && (
            <>
              {loadingRegions && (
                <p className="px-4 py-6 text-center text-sm text-white/50">
                  {t("loadingRegions", "Carregando regiões…")}
                </p>
              )}
              {!loadingRegions && filteredRegions.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-white/50">
                  {t("noFoundRegions", "Nenhuma região encontrada.")}
                </p>
              )}
              {filteredRegions.map((r) => (
                <Option
                  key={r.id_region}
                  label={r.name}
                  accent={accent}
                  selected={regionId === r.id_region && state === draftState}
                  onClick={() => {
                    onChange({ state: draftState, regionId: r.id_region, regionName: r.name })
                    setOpen(false)
                  }}
                />
              ))}
            </>
          )}
        </div>

        {stage === "region" && (
          <div className="border-t border-white/10 px-4 py-3">
            <button
              type="button"
              onClick={() => setStage("state")}
              className="text-xs font-medium text-white/60 transition hover:text-white"
            >
              ← {t("changeState", "Trocar estado")}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Option({
  label,
  selected,
  accent,
  onClick,
}: {
  label: string
  selected: boolean
  accent?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition",
        selected ? "bg-white/10 text-white" : "text-white/75 hover:bg-white/5"
      )}
      style={selected && accent ? { color: accent } : undefined}
    >
      <span>{label}</span>
      {selected && <Check className="h-4 w-4" />}
    </button>
  )
}
