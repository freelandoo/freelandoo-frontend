"use client"

import { Button } from "@/features/acasaviews/components/ui/button"

export default function Hero() {
  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950">
      <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover">
        <source src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/studioViewsBG2-t3IFcr4gbwAmXdFLDuRVz5GoeQ3pdU.mp4" type="video/mp4" />
      </video>

      {/* Video overlay for better text readability */}
      <div className="absolute inset-0 bg-black/40"></div>

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-indigo-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <h1 className="text-6xl md:text-7xl font-bold text-foreground mb-6 leading-tight text-balance">
          Onde ideias se transformam em{" "}
          <span className="bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
            experiências
          </span>
        </h1>
        <p className="text-xl md:text-2xl text-white mb-8 max-w-2xl mx-auto leading-relaxed">
          Unindo criatividade, mídia e negócios em um único ecossistema onde o entretenimento se transforma em audiência
        </p>
        <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-6 text-lg rounded-full">
          Conheça nossos projetos
        </Button>
      </div>
    </section>
  )
}
