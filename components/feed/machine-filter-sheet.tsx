"use client"

import { Check } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { CatalogMachine } from "@/components/home/machines/use-machines-catalog"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { cn } from "@/lib/utils"

interface MachineFilterSheetProps {
  machines: CatalogMachine[]
  selectedId: number | null
  onChange: (id: number | null) => void
  trigger: React.ReactNode
}

export function MachineFilterSheet({
  machines,
  selectedId,
  onChange,
  trigger,
}: MachineFilterSheetProps) {
  const t = useTranslations("Feed")
  const active = machines.filter((m) => m.is_active)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="max-h-[60vh] w-[min(260px,calc(100vw-2rem))] overflow-y-auto border-white/10 bg-zinc-950 p-1 text-white"
      >
        <Option
          label={t("allMachines", "Todos os enxames")}
          selected={selectedId == null}
          onClick={() => onChange(null)}
        />
        {active.map((m) => {
          const accent = m.color_accent || "#fbbf24"
          return (
            <Option
              key={m.id_machine}
              label={m.name}
              accent={accent}
              selected={selectedId === m.id_machine}
              onClick={() => onChange(m.id_machine)}
            />
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
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
        "flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm transition",
        selected ? "bg-white/10 text-white" : "text-white/75 hover:bg-white/5"
      )}
      style={selected && accent ? { color: accent } : undefined}
    >
      <span>{label}</span>
      {selected && <Check className="h-4 w-4" />}
    </button>
  )
}
