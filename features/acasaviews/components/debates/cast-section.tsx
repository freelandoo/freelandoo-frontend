"use client"

import { useFadeIn } from "@/features/acasaviews/hooks/use-fade-in"
import Image from "next/image"
import { Instagram } from "lucide-react"

interface CastMember {
  name: string
  instagram: string
  description: string
  photo: string
}

const castMembers: CastMember[] = [
  {
    name: "Nick Mori",
    instagram: "@nick.morioficial",
    description: "Especialista em debates políticos e análise social com mais de 5 anos de experiência.",
    photo: "/acasaviews/Debates/nick-mori-profile.jpg",
  },
  {
    name: "Tamis Mori",
    instagram: "@tamis.mori",
    description: "Ajudo você a entender política e teologia.",
    photo: "/acasaviews/Debates/tamismoriprofile.jpg",
  },
  {
    name: "Pedro Costa",
    instagram: "@pedrocosta",
    description: "Debatedor e criador de conteúdo focado em tecnologia e inovação.",
    photo: "/acasaviews/tech-host-portrait.jpg",
  },
  {
    name: "Ana Lima",
    instagram: "@analima",
    description: "Jornalista e comentarista especializada em economia e negócios.",
    photo: "/acasaviews/business-host-portrait.jpg",
  },
]

export default function CastSection() {
  const ref = useFadeIn()

  return (
    <section ref={ref} className="py-24 px-4 bg-slate-950 fade-in">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Elenco</h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Conheça os talentos que tornam nossos debates únicos e engajantes
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {castMembers.map((member, index) => (
            <a
              key={index}
              href={`https://instagram.com/${member.instagram.replace("@", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-slate-900/50 rounded-xl overflow-hidden border border-slate-800 hover:border-purple-500 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 hover:-translate-y-2"
            >
              <div className="relative aspect-square overflow-hidden">
                <Image
                  src={member.photo || "/acasaviews/placeholder.svg"}
                  alt={member.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
              </div>

              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
                  {member.name}
                </h3>

                <div className="flex items-center gap-2 mb-3">
                  <Instagram className="w-4 h-4 text-purple-400" />
                  <span className="text-purple-400 text-sm font-medium">{member.instagram}</span>
                </div>

                <p className="text-slate-400 text-sm leading-relaxed">{member.description}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
