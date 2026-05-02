"use client"

import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Sparkles, MessageCircle, Percent, MapPin } from "lucide-react"
import { FloatingParticles } from "./floating-particles"
import { AnimatedHeadline } from "./animated-headline"

const HERO_IMAGE = "/hero-banner.png"

export function HeroSection() {
  return (
    <section className="relative isolate flex min-h-[100svh] items-center overflow-hidden bg-[#05060a]">
      {/* Banner background */}
      <Image
        src={HERO_IMAGE}
        alt="Freelandoo — máquinas de intenção"
        fill
        priority
        sizes="100vw"
        className="pointer-events-none object-cover object-right"
      />

      {/* Dark overlay for text readability — stronger on the left side */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#05060a]/95 via-[#05060a]/75 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#05060a] via-transparent to-[#05060a]/30" />

      {/* Particles */}
      <FloatingParticles count={20} color="rgba(255,220,120,0.4)" />

      {/* Content — left aligned */}
      <div className="container relative z-10 mx-auto px-4 py-24 md:px-8 md:py-32">
        <div className="max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white/70 backdrop-blur"
          >
            <Sparkles className="h-3 w-3 text-primary" />
            A nova forma de encontrar e ser encontrado
          </motion.div>

          <AnimatedHeadline
            className="text-balance text-3xl leading-[1.05] sm:text-4xl md:text-5xl lg:text-6xl"
            lines={[
              "Ative a máquina certa.",
              "Encontre quem resolve.",
            ]}
            highlightIndex={1}
            highlightClassName="bg-gradient-to-r from-primary via-amber-300 to-primary bg-clip-text text-transparent"
          />

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-5 max-w-md text-pretty text-sm text-white/70 md:text-base md:leading-relaxed"
          >
            Na Freelandoo, você encontra profissionais, divulga seus serviços e ainda pode ganhar dinheiro indicando amigos.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="mt-7 flex flex-col items-start gap-3 sm:flex-row"
          >
            <Link
              href="#machines"
              data-cta="hero-primary"
              data-cta-action="ativar-maquina"
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_0_0_1px_rgba(230,184,0,0.4),0_8px_40px_-8px_rgba(230,184,0,0.6)] transition hover:shadow-[0_0_0_1px_rgba(230,184,0,0.8),0_12px_60px_-8px_rgba(230,184,0,0.9)]"
            >
              <span className="relative z-10">Ativar uma máquina</span>
              <ArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </Link>
            <Link
              href="/search"
              data-cta="hero-secondary"
              data-cta-action="encontrar-profissional"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white/90 backdrop-blur transition hover:border-white/30 hover:bg-white/10"
            >
              Encontrar profissional
            </Link>
          </motion.div>

          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="mt-6 flex flex-col gap-2 text-xs text-white/60 sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-2 md:text-[13px]"
          >
            <li className="inline-flex items-center gap-2">
              <MessageCircle className="h-3.5 w-3.5 text-emerald-400/80" aria-hidden />
              Contato direto via WhatsApp
            </li>
            <li className="inline-flex items-center gap-2">
              <Percent className="h-3.5 w-3.5 text-primary/90" aria-hidden />
              Sem comissão por serviço fechado
            </li>
            <li className="inline-flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-sky-400/80" aria-hidden />
              Profissionais por cidade e intenção
            </li>
          </motion.ul>
        </div>
      </div>

      {/* Bottom gradient transition to next section */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-b from-transparent to-[#05060a]" />
    </section>
  )
}
