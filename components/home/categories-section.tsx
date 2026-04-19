"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Utensils,
  Shirt,
  Sparkles,
  Home,
  Dumbbell,
  Laptop,
  Car,
  Plane,
  Baby,
  PawPrint,
  Briefcase,
  Clapperboard,
  Leaf,
  ChevronLeft,
  ChevronRight,
  Building2,
  PartyPopper,
  ShoppingBag,
} from "lucide-react"
import { useState } from "react"

const categories = [
  { icon: Utensils, name: "Alimentação & Bebidas", count: "1.200+" },
  { icon: Shirt, name: "Moda & Acessórios", count: "2.800+" },
  { icon: Sparkles, name: "Beleza & Cuidados Pessoais", count: "3.100+" },
  { icon: Home, name: "Casa, Construção & Decoração", count: "900+" },
  { icon: Dumbbell, name: "Saúde, Fitness & Esporte", count: "2.400+" },
  { icon: Laptop, name: "Tecnologia & Eletrônicos", count: "1.800+" },
  { icon: Car, name: "Automotivo & Mobilidade", count: "650+" },
  { icon: Plane, name: "Turismo, Hotelaria & Experiências", count: "1.100+" },
  { icon: Baby, name: "Infantil & Educação", count: "850+" },
  { icon: PawPrint, name: "Pets", count: "1.500+" },
  { icon: Briefcase, name: "Negócios, Serviços & Finanças", count: "700+" },
  { icon: Clapperboard, name: "Entretenimento & Cultura", count: "1.300+" },
  { icon: Leaf, name: "Sustentabilidade & Marcas Conscientes", count: "500+" },
  { icon: Building2, name: "Imobiliário & Mercado de Imóveis", count: "450+" },
  { icon: PartyPopper, name: "Eventos, Festas & Casamentos", count: "820+" },
  { icon: ShoppingBag, name: "Varejo & E-commerce", count: "2.100+" },
]

export function CategoriesSection() {
  const [currentPage, setCurrentPage] = useState(0)
  const itemsPerPage = 8
  const totalPages = Math.ceil(categories.length / itemsPerPage)

  const startIndex = currentPage * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentCategories = categories.slice(startIndex, endIndex)

  const goToNext = () => {
    setCurrentPage((prev) => (prev + 1) % totalPages)
  }

  const goToPrev = () => {
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages)
  }

  return (
    <section className="border-y border-border bg-secondary/20 py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-balance text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            Explore nossas categorias
          </h2>
          <p className="text-pretty text-lg text-muted-foreground">
            Encontre influenciadores qualificados em diversas áreas
          </p>
        </div>

        <div className="relative">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {currentCategories.map((category, index) => (
              <Card
                key={startIndex + index}
                className="cursor-pointer border-border/50 transition-all hover:scale-105 hover:shadow-lg"
              >
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <category.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{category.name}</h3>
                    <p className="text-sm text-muted-foreground">{category.count} creators</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPrev}
              className="h-10 w-10 bg-transparent"
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }).map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setCurrentPage(index)}
                  className={`h-2 w-2 rounded-full transition-all ${
                    index === currentPage ? "w-8 bg-primary" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
                  aria-label={`Ir para página ${index + 1}`}
                />
              ))}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={goToNext}
              className="h-10 w-10 bg-transparent"
              aria-label="Próxima página"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
