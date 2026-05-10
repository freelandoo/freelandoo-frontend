"use client"

import { useEffect, useState } from "react"
import { Check, ChevronDown, Crown, X } from "lucide-react"
import { cn } from "@/lib/utils"

type Option = { value: string; label: string }

type Field =
  | "estado"
  | "cidade"
  | "maquina"
  | "profissao"
  | "nivel"
  | null

type Estado = { uf: string; nome: string }
type Machine = { id_machine: number; name: string; is_active?: boolean }
type Category = { id_category: number; desc_category: string }
type Municipio = { id: number; nome: string }

interface FiltersMobileProps {
  // Listas
  estados: Estado[]
  municipios: Municipio[]
  machines: Machine[]
  machineCategories: Category[]
  loadingMunicipios?: boolean
  // Valores
  selectedEstado: string
  selectedCity: string
  idMachine: number | null
  idCategory: number | null
  levelMin: number | null
  premiumOnly: boolean
  // Setters
  setSelectedEstado: (v: string) => void
  setSelectedCity: (v: string) => void
  setIdMachine: (v: number | null) => void
  setIdCategory: (v: number | null) => void
  setLevelMin: (v: number | null) => void
  setPremiumOnly: (v: boolean) => void
  // Cor da máquina ativa (opcional)
  accentColor?: string
  // Total de resultados
  resultsCount: number
}

const NIVEIS: Option[] = [
  { value: "", label: "Todos os níveis" },
  { value: "1", label: "Nível 1+" },
  { value: "5", label: "Nível 5+" },
  { value: "10", label: "Nível 10+" },
  { value: "20", label: "Nível 20+" },
  { value: "30", label: "Nível 30+" },
]

export function SearchFiltersMobile(props: FiltersMobileProps) {
  const {
    estados,
    municipios,
    machines,
    machineCategories,
    loadingMunicipios,
    selectedEstado,
    selectedCity,
    idMachine,
    idCategory,
    levelMin,
    premiumOnly,
    setSelectedEstado,
    setSelectedCity,
    setIdMachine,
    setIdCategory,
    setLevelMin,
    setPremiumOnly,
    accentColor,
    resultsCount,
  } = props

  const [open, setOpen] = useState<Field>(null)

  // Lock scroll quando o sheet estiver aberto
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => { document.body.style.overflow = prev }
    }
  }, [open])

  const estadoLabel = selectedEstado || "Todos"
  const cityLabel = (() => {
    if (!selectedCity) return selectedEstado ? "Todas" : "—"
    const m = municipios.find((mu) => String(mu.id) === selectedCity)
    return m?.nome || selectedCity
  })()
  const machineLabel = (() => {
    if (idMachine == null) return "Todas"
    return machines.find((m) => m.id_machine === idMachine)?.name || "—"
  })()
  const profissaoLabel = (() => {
    if (idMachine == null) return "—"
    if (idCategory == null) return "Todas"
    return machineCategories.find((c) => c.id_category === idCategory)?.desc_category || "—"
  })()
  const nivelLabel = (() => {
    if (levelMin == null) return "Todos"
    return `${levelMin}+`
  })()

  const machineActive = idMachine != null

  return (
    <>
      <div className="md:hidden">
        <div className="-mx-4 overflow-x-auto px-4 pb-1">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <FilterChip
              label="Estado"
              value={estadoLabel}
              active={!!selectedEstado}
              onClick={() => setOpen("estado")}
              accentColor={accentColor}
            />
            <FilterChip
              label="Cidade"
              value={cityLabel}
              active={!!selectedCity}
              disabled={!selectedEstado}
              onClick={() => setOpen("cidade")}
              accentColor={accentColor}
            />
            <FilterChip
              label="Máquina"
              value={machineLabel}
              active={idMachine != null}
              onClick={() => setOpen("maquina")}
              accentColor={accentColor}
            />
            <FilterChip
              label="Profissão"
              value={profissaoLabel}
              active={idCategory != null}
              disabled={!machineActive}
              onClick={() => setOpen("profissao")}
              accentColor={accentColor}
            />
            <FilterChip
              label="Nível"
              value={nivelLabel}
              active={levelMin != null}
              onClick={() => setOpen("nivel")}
              accentColor={accentColor}
            />
            <button
              type="button"
              onClick={() => setPremiumOnly(!premiumOnly)}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition active:scale-[0.97]",
                premiumOnly
                  ? "border-amber-300/60 bg-amber-300/15 text-amber-200"
                  : "border-white/15 bg-white/[0.03] text-white/70"
              )}
            >
              <Crown className={cn("h-3.5 w-3.5", premiumOnly ? "fill-amber-300 text-amber-300" : "text-white/60")} />
              Premium
            </button>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-end px-1">
          <span className="text-[11px] uppercase tracking-wider text-white/50">
            {resultsCount} resultado{resultsCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Bottom sheets */}
      <BottomSheet
        open={open === "estado"}
        title="Estado"
        onClose={() => setOpen(null)}
      >
        <OptionList
          value={selectedEstado}
          options={[
            { value: "", label: "Todos os estados" },
            ...estados.map((e) => ({ value: e.uf, label: `${e.nome} — ${e.uf}` })),
          ]}
          onSelect={(v) => {
            setSelectedEstado(v)
            setOpen(null)
          }}
        />
      </BottomSheet>

      <BottomSheet
        open={open === "cidade"}
        title="Cidade"
        onClose={() => setOpen(null)}
      >
        {loadingMunicipios ? (
          <p className="py-6 text-center text-sm text-white/60">Carregando…</p>
        ) : (
          <OptionList
            value={selectedCity}
            options={[
              { value: "", label: selectedEstado ? "Todas as cidades" : "Selecione um estado" },
              ...municipios.map((m) => ({ value: String(m.id), label: m.nome })),
            ]}
            onSelect={(v) => {
              setSelectedCity(v)
              setOpen(null)
            }}
          />
        )}
      </BottomSheet>

      <BottomSheet
        open={open === "maquina"}
        title="Máquina"
        onClose={() => setOpen(null)}
      >
        <OptionList
          value={idMachine != null ? String(idMachine) : ""}
          options={[
            { value: "", label: "Todas as máquinas" },
            ...machines
              .filter((m) => m.is_active !== false)
              .map((m) => ({ value: String(m.id_machine), label: m.name })),
          ]}
          onSelect={(v) => {
            setIdMachine(v ? Number(v) : null)
            setIdCategory(null)
            setOpen(null)
          }}
        />
      </BottomSheet>

      <BottomSheet
        open={open === "profissao"}
        title="Profissão"
        onClose={() => setOpen(null)}
      >
        {!machineActive ? (
          <p className="py-6 text-center text-sm text-white/60">Selecione uma máquina primeiro.</p>
        ) : (
          <OptionList
            value={idCategory != null ? String(idCategory) : ""}
            options={[
              { value: "", label: "Todas as profissões" },
              ...machineCategories.map((c) => ({
                value: String(c.id_category),
                label: c.desc_category,
              })),
            ]}
            onSelect={(v) => {
              setIdCategory(v ? Number(v) : null)
              setOpen(null)
            }}
          />
        )}
      </BottomSheet>

      <BottomSheet
        open={open === "nivel"}
        title="Nível mínimo"
        onClose={() => setOpen(null)}
      >
        <OptionList
          value={levelMin != null ? String(levelMin) : ""}
          options={NIVEIS}
          onSelect={(v) => {
            setLevelMin(v ? Number(v) : null)
            setOpen(null)
          }}
        />
      </BottomSheet>
    </>
  )
}

function FilterChip({
  label,
  value,
  active,
  disabled,
  onClick,
  accentColor,
}: {
  label: string
  value: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  accentColor?: string
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition active:scale-[0.97]",
        disabled
          ? "border-white/10 bg-white/[0.02] text-white/30 cursor-not-allowed"
          : active
            ? "text-white"
            : "border-white/15 bg-white/[0.03] text-white/80"
      )}
      style={
        active && !disabled
          ? {
              backgroundColor: accentColor ? `${accentColor}1f` : "rgba(242,196,9,0.12)",
              borderColor: accentColor ? `${accentColor}55` : "rgba(242,196,9,0.4)",
            }
          : undefined
      }
    >
      <span className="text-white/55">{label}</span>
      <span className="max-w-[110px] truncate">{value}</span>
      <ChevronDown className="h-3.5 w-3.5 opacity-60" />
    </button>
  )
}

function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Fechar filtro"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-in fade-in"
      />
      <div className="absolute inset-x-0 bottom-0 max-h-[78vh] overflow-hidden rounded-t-3xl border-t border-white/10 bg-zinc-950 shadow-[0_-20px_50px_-20px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/60 hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[calc(78vh-3.5rem)] overflow-y-auto px-2 py-2">
          {children}
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1.5 h-1 w-10 -translate-x-1/2 rounded-full bg-white/20"
        />
      </div>
    </div>
  )
}

function OptionList({
  value,
  options,
  onSelect,
}: {
  value: string
  options: Option[]
  onSelect: (v: string) => void
}) {
  return (
    <ul className="flex flex-col gap-0.5">
      {options.map((opt) => {
        const isActive = opt.value === value
        return (
          <li key={opt.value || "all"}>
            <button
              type="button"
              onClick={() => onSelect(opt.value)}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm transition active:scale-[0.99]",
                isActive ? "bg-primary/15 text-primary" : "text-white/85 hover:bg-white/5"
              )}
            >
              <span className="truncate pr-2">{opt.label}</span>
              {isActive && <Check className="h-4 w-4 shrink-0" />}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
