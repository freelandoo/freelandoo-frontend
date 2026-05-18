"use client"

import { Check } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { CatalogCategory } from "@/components/home/machines/use-machines-catalog"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { cn } from "@/lib/utils"

interface ProfessionFilterSheetProps {
  categories: CatalogCategory[]
  selectedId: number | null
  onChange: (id: number | null) => void
  trigger: React.ReactNode
  disabled?: boolean
  accent?: string
}

export function ProfessionFilterSheet({
  categories,
  selectedId,
  onChange,
  trigger,
  disabled,
  accent,
}: ProfessionFilterSheetProps) {
  const t = useTranslations("Feed")
  const list = categories.filter((c) => c.is_active)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="max-h-[60vh] w-[min(280px,calc(100vw-2rem))] overflow-y-auto border-white/10 bg-zinc-950 p-1 text-white"
      >
        <Option
          label={t("allProfessions", "Todas as profissões")}
          selected={selectedId == null}
          onClick={() => onChange(null)}
        />
        {list.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-white/50">
            {t("chooseMachineFirst", "Escolha uma máquina primeiro.")}
          </p>
        )}
        {list.map((c) => (
          <Option
            key={c.id_category}
            label={c.desc_category}
            accent={accent}
            selected={selectedId === c.id_category}
            onClick={() => onChange(c.id_category)}
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
