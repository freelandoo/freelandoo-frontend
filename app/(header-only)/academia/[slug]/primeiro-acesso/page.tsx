import type { Metadata } from "next"
import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { FirstAccessContent } from "./first-access-content"

// Link pessoal de primeiro acesso (vem no WhatsApp da academia): nunca indexar.
export const metadata: Metadata = {
  title: "Primeiro acesso",
  robots: { index: false, follow: false },
}

export default function AcademyFirstAccessPage() {
  return (
    <Suspense
      fallback={
        <div className="fl-root fl-paper-texture flex min-h-[100dvh] items-center justify-center">
          <Loader2 className="h-9 w-9 animate-spin text-[#F2B705]" aria-hidden />
        </div>
      }
    >
      <FirstAccessContent />
    </Suspense>
  )
}
