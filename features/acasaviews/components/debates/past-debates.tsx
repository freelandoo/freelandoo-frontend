"use client"

import { useFadeIn } from "@/features/acasaviews/hooks/use-fade-in"
import { Button } from "@/features/acasaviews/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/features/acasaviews/components/ui/card"
import { Calendar, TrendingUp } from "lucide-react"

interface PastDebate {
  title: string
  date: string
  views: string
  description: string
}

export default function PastDebatesSection() {
  const fadeInRef = useFadeIn()

  const pastDebates: PastDebate[] = [
    {
      title: "A Evolução dos Reality Shows Digitais",
      date: "10 de Dezembro, 2024",
      views: "12.5K",
      description: "Análise profunda sobre como os reality shows se transformaram na era digital.",
    },
    {
      title: "Ética na Criação de Conteúdo",
      date: "03 de Dezembro, 2024",
      views: "8.2K",
      description: "Discussão sobre responsabilidade e ética na produção de conteúdo de entretenimento.",
    },
  ]

  return (
    <section ref={fadeInRef} className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-12">
          <TrendingUp className="w-8 h-8 text-cyan-400" />
          <h2 className="text-4xl font-bold text-foreground">Debates Anteriores</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pastDebates.map((debate, index) => (
            <Card key={index} className="bg-slate-900 border-slate-800 hover:border-cyan-500/50 transition-colors">
              <CardHeader>
                <CardTitle className="text-xl text-foreground">{debate.title}</CardTitle>
                <CardDescription className="text-muted-foreground">{debate.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{debate.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-cyan-400">
                    <TrendingUp className="w-4 h-4" />
                    <span>{debate.views} views</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full border-slate-700 hover:bg-slate-800 bg-transparent">
                  Assistir Replay
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
