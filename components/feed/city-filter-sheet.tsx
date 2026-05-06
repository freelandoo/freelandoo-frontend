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
import { cn } from "@/lib/utils"

interface CityFilterSheetProps {
  state: string | null
  city: string | null
  onChange: (next: { state: string | null; city: string | null }) => void
  trigger: React.ReactNode
  accent?: string
}

interface IBGEMunicipio {
  id: number
  nome: string
}

export function CityFilterSheet({
  state,
  city,
  onChange,
  trigger,
  accent,
}: CityFilterSheetProps) {
  const [open, setOpen] = useState(false)
  const [stage, setStage] = useState<"state" | "city">(state ? "city" : "state")
  const [stateFilter, setStateFilter] = useState("")
  const [cityFilter, setCityFilter] = useState("")
  const [municipios, setMunicipios] = useState<IBGEMunicipio[]>([])
  const [loadingMunicipios, setLoadingMunicipios] = useState(false)
  const [draftState, setDraftState] = useState<string | null>(state)

  useEffect(() => {
    if (!draftState) {
      setMunicipios([])
      return
    }
    let cancelled = false
    setLoadingMunicipios(true)
    fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${draftState}/municipios`
    )
      .then((r) => r.json())
      .then((data: IBGEMunicipio[]) => {
        if (cancelled) return
        setMunicipios(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) setMunicipios([])
      })
      .finally(() => {
        if (!cancelled) setLoadingMunicipios(false)
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

  const filteredCities = useMemo(() => {
    const q = cityFilter.trim().toLowerCase()
    if (!q) return municipios
    return municipios.filter((m) => m.nome.toLowerCase().includes(q))
  }, [municipios, cityFilter])

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) {
      setStage(state ? "city" : "state")
      setDraftState(state)
      setStateFilter("")
      setCityFilter("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm gap-0 border-white/10 bg-zinc-950 p-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-white">
            {stage === "state" ? "Estado" : "Cidade"}
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              value={stage === "state" ? stateFilter : cityFilter}
              onChange={(e) =>
                stage === "state"
                  ? setStateFilter(e.target.value)
                  : setCityFilter(e.target.value)
              }
              placeholder={stage === "state" ? "Buscar estado" : "Buscar cidade"}
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
            />
          </div>
        </div>

        <div className="max-h-[55vh] overflow-y-auto px-2 pb-3">
          <Option
            label={stage === "state" ? "Todos os estados" : "Todas as cidades"}
            selected={stage === "state" ? !state : !city}
            onClick={() => {
              if (stage === "state") {
                onChange({ state: null, city: null })
              } else if (draftState) {
                onChange({ state: draftState, city: null })
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
                  setStage("city")
                }}
              />
            ))}

          {stage === "city" && (
            <>
              {loadingMunicipios && (
                <p className="px-4 py-6 text-center text-sm text-white/50">
                  Carregando cidades…
                </p>
              )}
              {!loadingMunicipios && filteredCities.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-white/50">
                  Nenhuma cidade encontrada.
                </p>
              )}
              {filteredCities.map((m) => (
                <Option
                  key={m.id}
                  label={m.nome}
                  accent={accent}
                  selected={city === m.nome && state === draftState}
                  onClick={() => {
                    onChange({ state: draftState, city: m.nome })
                    setOpen(false)
                  }}
                />
              ))}
            </>
          )}
        </div>

        {stage === "city" && (
          <div className="border-t border-white/10 px-4 py-3">
            <button
              type="button"
              onClick={() => setStage("state")}
              className="text-xs font-medium text-white/60 transition hover:text-white"
            >
              ← Trocar estado
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
