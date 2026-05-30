"use client"

import { useFadeIn } from "@/features/acasaviews/hooks/use-fade-in"
import { Button } from "@/features/acasaviews/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/features/acasaviews/components/ui/card"
import { Calendar, Users } from "lucide-react"

interface Debate {
  title: string
  date: string
  time: string
  participants: string
  description: string
  status: string
}

export default function UpcomingDebatesSection() {
  const fadeInRef = useFadeIn()

  const upcomingDebates: Debate[] = [
    {
      title: "O Futuro da Criação de Conteúdo",
      date: "15 de Janeiro, 2025",
      time: "19:00",
      participants: "5 criadores",
      description:
        "Discussão sobre as tendências emergentes na criação de conteúdo digital e como se adaptar ao mercado.",
      status: "Em breve",
    },
    {
      title: "Influência Digital vs. Mídia Tradicional",
      date: "22 de Janeiro, 2025",
      time: "20:00",
      participants: "4 especialistas",
      description: "Debate sobre o impacto das plataformas digitais comparado aos meios tradicionais de comunicação.",
      status: "Em breve",
    },
    {
      title: "Monetização e Sustentabilidade",
      date: "29 de Janeiro, 2025",
      time: "18:30",
      participants: "6 empreendedores",
      description: "Como criar negócios sustentáveis no universo do entretenimento digital.",
      status: "Em breve",
    },
  ]

  return (
    <section ref={fadeInRef} className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-12">
          <Calendar className="w-8 h-8 text-purple-400" />
          <h2 className="text-4xl font-bold text-foreground">Próximos Debates</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {upcomingDebates.map((debate, index) => (
            <Card key={index} className="bg-slate-900 border-slate-800 hover:border-purple-500/50 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-medium">
                    {debate.status}
                  </span>
                  <Users className="w-4 h-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-xl text-foreground">{debate.title}</CardTitle>
                <CardDescription className="text-muted-foreground">{debate.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {debate.date} às {debate.time}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{debate.participants}</span>
                  </div>
                </div>
                <Button className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700">
                  Participar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
