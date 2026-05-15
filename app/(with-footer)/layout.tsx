import type { ReactNode } from "react"
import { SiteFooter } from "@/components/layout"

export default function WithFooterLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter />
    </div>
  )
}
