"use client"

import { useFadeIn } from "@/features/acasaviews/hooks/use-fade-in"
import ParallaxCard from "./parallax-card"

export default function RolesSection() {
  const ref = useFadeIn()

  const assassinoLayers = [
    { src: "/acasaviews/Mafia/Mafia-Cards/o-assassino/backgroundAssassino.png", depth: 0.1 },
    { src: "/acasaviews/Mafia/Mafia-Cards/o-assassino/MiddleAssassino.png", depth: 0.6 },
    { src: "/acasaviews/Mafia/Mafia-Cards/o-assassino/TopAssassino.png", depth: 1 },
  ]

  const camponesLayers = [
    { src: "/acasaviews/Mafia/Mafia-Cards/o-campones/backgroundCampones.png", depth: 0.1 },
    { src: "/acasaviews/Mafia/Mafia-Cards/o-campones/MiddleCampones.png", depth: 0.6 },
    { src: "/acasaviews/Mafia/Mafia-Cards/o-campones/TopCampones.png", depth: 1 },
  ]

  const detetiveLayers = [
    { src: "/acasaviews/Mafia/Mafia-Cards/o-detetive/backgroundDetetive.png", depth: 0.1 },
    { src: "/acasaviews/Mafia/Mafia-Cards/o-detetive/MiddleDetetive.png", depth: 0.6 },
    { src: "/acasaviews/Mafia/Mafia-Cards/o-detetive/TopDetetive.png", depth: 1 },
  ]

  const protetoraLayers = [
    { src: "/acasaviews/Mafia/Mafia-Cards/a-protetora/backgroundProtetora.png", depth: 0.1 },
    { src: "/acasaviews/Mafia/Mafia-Cards/a-protetora/MiddleProtetora.png", depth: 0.6 },
    { src: "/acasaviews/Mafia/Mafia-Cards/a-protetora/TopProtetora.png", depth: 1 },
  ]

  const roles = [
    {
      name: "O Assassino",
      layers: assassinoLayers,
      description:
        "Membro da Máfia que elimina alvos durante a noite. Trabalha em segredo com outros membros da Máfia para eliminar os cidadãos um por vez.",
    },
    {
      name: "O Camponês",
      layers: camponesLayers,
      description:
        "Cidadão comum que deve usar sua intuição e lógica para identificar os membros da Máfia durante o dia e votá-los para fora do jogo.",
    },
    {
      name: "O Detetive",
      layers: detetiveLayers,
      description:
        "Investigador que pode descobrir a verdadeira identidade de um jogador a cada noite. Use suas habilidades com sabedoria para ajudar os cidadãos.",
    },
    {
      name: "A Protetora",
      layers: protetoraLayers,
      description:
        "Guardiã que pode proteger um jogador por noite contra ataques da Máfia. Escolha estrategicamente quem salvar para manter os cidadãos seguros.",
    },
  ]

  return (
    <section id="roles" ref={ref} className="py-55 bg-slate-950">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-white mb-6">Papéis do Jogo</h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto text-pretty">
            Cada jogador recebe um papel secreto. Trabalhe com seu time para vencer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {roles.map((role, index) => (
            <div key={index} className="transition-all hover:scale-105 duration-300">
              <ParallaxCard layers={role.layers} alt={role.name} />
              <div className="mt-4 text-center">
                <h3 className="text-xl font-bold text-white mb-2">{role.name}</h3>
                <p className="text-sm text-slate-400 text-balance leading-relaxed">{role.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
