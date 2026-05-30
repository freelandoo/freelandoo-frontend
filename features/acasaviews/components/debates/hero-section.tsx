"use client"

import { useFadeIn } from "@/features/acasaviews/hooks/use-fade-in"
import { MessageSquare } from "lucide-react"
import Image from "next/image"

export default function DebatesHeroSection() {
  const fadeInRef = useFadeIn()

  return (
    <section ref={fadeInRef} className="relative pt-32 pb-20 px-6 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Image src="/acasaviews/Debates/debates-main.jpeg" alt="Debates Studio Views" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
          <MessageSquare className="w-4 h-4 text-purple-400" />
          <span className="text-sm text-purple-300">Espaço de Discussão</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
          Debates Studio Views
        </h1>
        <p className="text-xl text-white max-w-3xl mx-auto">
          Participe de discussões profundas sobre entretenimento, criação de conteúdo e o futuro da influência digital.
        </p>
      </div>
    </section>
  )
}
