"use client"

import { Check } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { CatalogMachine } from "@/components/home/machines/use-machines-catalog"
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
  const active = machines.filter((m) => m.is_active)
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm gap-0 border-white/10 bg-zinc-950 p-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-white">Máquina</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto px-2 pb-3">
          <Option
            label="Todas as máquinas"
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
        </div>
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
