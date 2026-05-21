"use client"

import { Briefcase, Package, GraduationCap } from "lucide-react"
import { cn } from "@/lib/utils"

export type SearchTab = "services" | "products" | "courses"

interface Props {
  tab: SearchTab
  onTabChange: (tab: SearchTab) => void
  accent?: string
}

const TABS: { id: SearchTab; label: string; icon: React.ComponentType<{ className?: string }>; dataTour: string }[] = [
  { id: "services", label: "Serviços", icon: Briefcase, dataTour: "search-tab-services" },
  { id: "products", label: "Produtos", icon: Package, dataTour: "search-tab-products" },
  { id: "courses", label: "Cursos", icon: GraduationCap, dataTour: "search-tab-courses" },
]

export function SearchTabsBar({ tab, onTabChange, accent = "#fbbf24" }: Props) {
  return (
    <div className="sticky top-0 z-30 border-b border-white/[0.06] bg-zinc-950/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[640px] items-stretch md:max-w-[760px] lg:max-w-[1080px]">
        {TABS.map((t) => {
          const active = t.id === tab
          const Icon = t.icon
          return (
            <button
              key={t.id}
              type="button"
              data-tour={t.dataTour}
              onClick={() => onTabChange(t.id)}
              className={cn(
                "group relative flex flex-1 items-center justify-center gap-1.5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors",
                active ? "text-white" : "text-white/45 hover:text-white/80",
              )}
              style={{ transition: "color 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t.label}</span>
              {active && (
                <span
                  aria-hidden
                  className="absolute inset-x-4 bottom-0 h-[2px] rounded-full"
                  style={{ background: accent, boxShadow: `0 0 12px ${accent}55` }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
