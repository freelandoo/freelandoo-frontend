"use client"

import { Button } from "@/features/acasaviews/components/ui/button"
import Link from "next/link"

export default function Projects() {
  const projects = [

    {
      title: "Debates",
      desc: "Produção de série web original",
      image: "/acasaviews/Debates/debates-main.jpeg",
      link: "/acasaviews/debates",
      isExternal: false,
    },
    {
      title: "A casa Views",
      desc: "Experiência imersiva de entretenimento digital",
      image: "/acasaviews/acasaviewsprintscreen.png",
      link: "/acasaviews/investidores",
      isExternal: false,
    },
    {
      title: "Robo views",
      desc: "Monte o seu robo views e descubra o que está por tras da sua mente",
      image: "/acasaviews/Main/projects/robot-thumb.png",
      link: "/acasaviews/robot",
      isExternal: false,
    },
    {
      title: "Mafia",
      desc: "Estratégia de conteúdo multiplataforma",
      image: "/acasaviews/digital-content-strategy.jpg",
      link: "/acasaviews/mafia",
      isExternal: false,
    },
  ]

  return (
    <section id="projects" className="py-20 md:py-32 px-6 bg-slate-950/50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-balance">Nossos projetos</h2>
        <p className="text-muted-foreground text-lg mb-16">Explore as experiências que transformamos em realidade</p>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {projects.map((project, i) => (
            <div
              key={i}
              className="group relative overflow-hidden rounded-lg border border-purple-500/20 hover:border-cyan-400/50 transition-all duration-300"
            >
              <div className="relative h-64 overflow-hidden bg-slate-900">
                <img
                  src={project.image || "/acasaviews/placeholder.svg"}
                  alt={project.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>

              <div className="p-6">
                <h3 className="text-xl font-semibold text-foreground mb-2">{project.title}</h3>
                <p className="text-muted-foreground mb-4">{project.desc}</p>
                {project.isExternal ? (
                  <a href={project.link} target="_blank" rel="noopener noreferrer" className="inline-block">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10 bg-transparent"
                    >
                      Ver detalhes
                    </Button>
                  </a>
                ) : (
                  <Link href={project.link} className="inline-block">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10 bg-transparent"
                    >
                      Ver detalhes
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
