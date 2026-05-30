"use client"

import { useFadeIn } from "@/features/acasaviews/hooks/use-fade-in"
import { Users, Eye, Moon, Target } from "lucide-react"

export default function GameOverview() {
  const ref = useFadeIn()

  const features = [
    {
      icon: Users,
      title: "8-20 Jogadores",
      description: "Quanto mais jogadores, mais caos e diversão. Perfeito para grupos grandes.",
    },
    {
      icon: Moon,
      title: "Noite & Dia",
      description: "O jogo alterna entre fases noturnas secretas e discussões diurnas intensas.",
    },
    {
      icon: Eye,
      title: "Dedução Social",
      description: "Use lógica, psicologia e observação para descobrir quem está mentindo.",
    },
    {
      icon: Target,
      title: "Eliminação",
      description: "Cada rodada, alguém é eliminado. Sobreviva e descubra a verdade.",
    },
  ]

  return (
    <section ref={ref} className="py-24 bg-gradient-to-b from-black to-slate-950">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-white mb-6">Como Funciona</h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto text-pretty">
            Mafia é um jogo de dedução social onde os jogadores são secretamente divididos em dois times: a Máfia e os
            Cidadãos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-slate-900 to-slate-950 p-8 rounded-xl border border-slate-800 hover:border-red-900 transition-all hover:scale-105"
            >
              <feature.icon className="w-12 h-12 text-red-600 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-slate-400 text-pretty">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
