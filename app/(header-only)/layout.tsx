import type { ReactNode } from "react"
import { SiteHeader } from "@/components/layout"

export default function HeaderOnlyLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  )
}
