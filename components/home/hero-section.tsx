"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"
import { useRouter } from "next/navigation"

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=2000&q=80"

export function HeroSection() {
  const router = useRouter()

  return (
    <section className="relative min-h-[min(85vh,720px)] overflow-hidden border-b border-border">
      <Image
        src={HERO_IMAGE}
        alt=""
        fill
        className="object-cover object-center"
        priority
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-black/55" />

      <div className="container relative z-10 mx-auto flex min-h-[min(85vh,720px)] flex-col items-center justify-center px-4 py-16 text-center">
        <div className="relative mx-auto mb-6 h-24 w-full max-w-2xl sm:h-32 md:mb-8 md:h-40">
          <Image
            src="/freelandoo-logo.png"
            alt="Freelandoo"
            fill
            className="object-contain object-center drop-shadow-[0_4px_24px_rgba(0,0,0,0.45)]"
            priority
            sizes="(max-width: 768px) 100vw, 42rem"
          />
        </div>

        <p className="mb-10 max-w-2xl text-pretty text-lg font-medium text-white md:text-xl md:leading-relaxed">
          Encontre o melhor profissional freelancer para o seu projeto!
        </p>

        <div className="flex w-full max-w-lg flex-col items-stretch justify-center gap-3 sm:flex-row sm:gap-4">
          <Button
            size="lg"
            className="h-12 gap-2 border-0 bg-primary px-8 text-base font-semibold text-primary-foreground hover:bg-primary/90 sm:flex-1"
            onClick={() => router.push("/search")}
          >
            <Search className="h-5 w-5" />
            Encontre um freelance
          </Button>
          <Button
            size="lg"
            variant="outline"
            asChild
            className="h-12 border-2 border-white !border-white bg-transparent px-8 text-base font-semibold text-white shadow-none hover:border-white hover:bg-white/10 hover:text-white dark:border-white dark:!border-white dark:hover:border-white sm:flex-1"
          >
            <Link href="/cadastro">Quero trabalhar</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
