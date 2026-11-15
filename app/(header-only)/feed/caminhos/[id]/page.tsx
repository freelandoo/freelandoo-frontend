"use client"

// /feed/caminhos/[id] — editor de uma história com caminhos (F5).
// O editor é pesado (mapa, painel, player de teste): chunk só desta rota.

import dynamic from "next/dynamic"
import { use } from "react"
import { Loader2 } from "lucide-react"
import { PageShell, PageBackLink, Section } from "@/components/tabloide"

const PathEditor = dynamic(() => import("@/components/feed/interativo/path-editor").then((m) => m.PathEditor), {
  ssr: false,
  loading: () => <Loader2 className="mt-10 h-6 w-6 animate-spin text-[#9A938A]" />,
})

export default function PathEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <PageShell>
      <Section className="pb-24 pt-8 sm:pt-12">
        <div className="max-w-3xl">
          <PageBackLink href="/feed/caminhos" className="mb-4" />
          <PathEditor id={id} />
        </div>
      </Section>
    </PageShell>
  )
}
