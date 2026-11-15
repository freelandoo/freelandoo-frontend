"use client"

// /feed/junto/[id] — a sessão de feed sincronizado (F6). Tela cheia; o
// componente é carregado só nesta rota.

import dynamic from "next/dynamic"
import { use } from "react"
import { Loader2 } from "lucide-react"
import { PageBackLink } from "@/components/tabloide"

const SyncFeed = dynamic(() => import("@/components/feed/interativo/sync-feed").then((m) => m.SyncFeed), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#0b0804] md:left-[80px]">
      <Loader2 className="h-6 w-6 animate-spin text-[#9A938A]" />
    </div>
  ),
})

export default function SyncSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <>
      <SyncFeed id={id} />
      <div className="fixed bottom-4 left-4 z-40 md:left-[96px]">
        <PageBackLink href="/feed/junto" />
      </div>
    </>
  )
}
