"use client"

import dynamic from "next/dynamic"

export const WeeklyTimeGrid = dynamic(
  () => import("./WeeklyTimeGrid").then(m => m.WeeklyTimeGrid),
  {
    ssr: false,
    loading: () => (
      <div className="h-[600px] w-full rounded-xl border border-zinc-800 bg-zinc-900/50 animate-pulse flex items-center justify-center text-zinc-500 text-sm">
        Carregando calendário...
      </div>
    ),
  }
)
