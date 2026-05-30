"use client"

import { useFadeIn } from "@/features/acasaviews/hooks/use-fade-in"

export default function MafiaHero() {
  const ref = useFadeIn()

  return (
    <section ref={ref} className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background with gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-slate-950 to-black" />

      {/* Animated card suits in background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 text-9xl text-red-600 animate-pulse">♠</div>
        <div className="absolute top-40 right-40 text-9xl text-red-600 animate-pulse delay-1000">♥</div>
        <div className="absolute bottom-40 left-40 text-9xl text-red-600 animate-pulse delay-2000">♣</div>
        <div className="absolute bottom-20 right-20 text-9xl text-red-600 animate-pulse delay-3000">♦</div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <h1 className="text-7xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-red-500 to-orange-600 mb-6 text-balance">
          MAFIA
        </h1>
        <p className="text-2xl md:text-3xl text-slate-300 mb-4 text-balance">
          Um Jogo de Mentiras, Estratégia e Dedução
        </p>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8 text-pretty">
          Entre no submundo da máfia onde a confiança é uma ilusão e cada decisão pode ser fatal. Quem você pode confiar
          quando todos mentem?
        </p>
        <a
          href="#como-jogar"
          className="inline-block bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all hover:scale-105"
        >
          Descubra as Regras
        </a>
      </div>
    </section>
  )
}
