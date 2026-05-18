"use client"

import type { ReactNode } from "react"
import { Check } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export const LEVEL_FILTER_OPTIONS = [
  { value: null, label: "Todos os níveis" },
  { value: 1, label: "Nível 1+" },
  { value: 5, label: "Nível 5+" },
  { value: 10, label: "Nível 10+" },
  { value: 20, label: "Nível 20+" },
  { value: 30, label: "Nível 30+" },
] as const

interface LevelFilterSheetProps {
  selectedLevel: number | null
  onChange: (level: number | null) => void
  trigger: ReactNode
  accent?: string
}

export function LevelFilterSheet({
  selectedLevel,
  onChange,
  trigger,
  accent,
}: LevelFilterSheetProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="w-[min(220px,calc(100vw-2rem))] border-white/10 bg-zinc-950 p-1 text-white"
      >
        {LEVEL_FILTER_OPTIONS.map((option) => (
          <Option
            key={option.value ?? "all"}
            label={option.label}
            selected={selectedLevel === option.value}
            accent={accent}
            onClick={() => onChange(option.value)}
          />
        ))}
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
        "flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm transition active:scale-[0.98]",
        selected ? "bg-white/10 text-white" : "text-white/75 hover:bg-white/5"
      )}
      style={selected && accent ? { color: accent } : undefined}
    >
      <span>{label}</span>
      {selected && <Check className="h-4 w-4" />}
    </button>
  )
}
