"use client"

import { useFadeIn } from "@/features/acasaviews/hooks/use-fade-in"
import { Card, CardContent } from "@/features/acasaviews/components/ui/card"
import { Users, MessageSquare, TrendingUp } from "lucide-react"

export default function DebatesStatsSection() {
  const fadeInRef = useFadeIn()

  const stats = [
    {
      icon: Users,
      value: "20+",
      label: "Participantes Ativos",
      color: "text-purple-400",
    },
    {
      icon: MessageSquare,
      value: "5",
      label: "Debates Realizados",
      color: "text-cyan-400",
    },
    {
      icon: TrendingUp,
      value: "85K",
      label: "Visualizações Totais",
      color: "text-purple-400",
    },
  ]

  return (
    <section ref={fadeInRef} className="py-16 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index} className="bg-slate-900 border-slate-800">
              <CardContent className="pt-6 text-center">
                <Icon className={`w-12 h-12 ${stat.color} mx-auto mb-4`} />
                <div className="text-3xl font-bold text-foreground mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
