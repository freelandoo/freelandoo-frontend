import type { ReactNode } from "react"
import { SiteFooter } from "@/components/layout"
import { TabloidHeader } from "@/components/tabloide"

export default function WithFooterLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TabloidHeader />
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter />
    </div>
  )
}
