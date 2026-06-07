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

export function SearchTabsBar({ tab, onTabChange }: Props) {
  return (
    <div className="fl-root sticky top-0 z-30 border-b-2 border-[#0B0B0D] bg-[#0b0804]/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[640px] items-stretch gap-1.5 px-3 py-2.5 md:max-w-[760px] lg:max-w-[1080px]">
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
                "group flex flex-1 items-center justify-center gap-1.5 border-2 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] transition-transform hover:-translate-y-0.5",
                active
                  ? "border-[#0B0B0D] bg-[#F2B705] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D]"
                  : "border-[#F1EDE2]/20 bg-transparent text-[#C9C2B6] hover:border-[#F1EDE2] hover:text-[#F1EDE2]",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
