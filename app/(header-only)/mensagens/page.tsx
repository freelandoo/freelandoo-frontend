import { Suspense } from "react"
import MensagensClient from "@/components/mensagens/MensagensClient"

export const metadata = {
  title: "Mensagens — Freelandoo",
  description: "Suas conversas no Freelandoo.",
}

export const dynamic = "force-dynamic"

export default function MensagensPage() {
  return (
    <main data-tour="messages-root" className="bg-neutral-950 text-white">
      <Suspense fallback={null}>
        <MensagensClient />
      </Suspense>
    </main>
  )
}
