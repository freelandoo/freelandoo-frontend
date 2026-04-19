import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, ConciergeBell, HardHat, Megaphone, PencilRuler } from "lucide-react"

const categories = [
  {
    title: "Designer",
    description: "Crie artes e projetos visuais",
    icon: PencilRuler,
    href: "/search",
  },
  {
    title: "Pedreiro",
    description: "Construção e reformas",
    icon: HardHat,
    href: "/search",
  },
  {
    title: "Garçom",
    description: "Serviços e atendimento",
    icon: ConciergeBell,
    href: "/search",
  },
  {
    title: "Influenciadores",
    description: "Divulgue marcas e produtos",
    icon: Megaphone,
    href: "/search",
  },
] as const

export function HomeCategoryCards() {
  return (
    <section className="border-y border-border bg-neutral-100 py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((cat) => (
            <Link key={cat.title} href={cat.href} className="group block">
              <Card className="h-full border border-border/80 bg-white shadow-sm transition-shadow hover:shadow-md">
                <CardContent className="flex flex-col gap-4 p-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-neutral-100 text-neutral-800 transition-colors group-hover:bg-primary/15 group-hover:text-neutral-900">
                    <cat.icon className="h-8 w-8" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold tracking-tight text-neutral-950">{cat.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">{cat.description}</p>
                  </div>
                  <div className="mt-auto flex items-center gap-1 text-sm font-semibold text-neutral-900 underline-offset-4 group-hover:underline group-hover:text-primary">
                    Ver mais
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
