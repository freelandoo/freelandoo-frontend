"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { GlowBackground } from "./glow-background"
import { FloatingParticles } from "./floating-particles"

export function FinalCTASection() {
  return (
    <section className="relative isolate flex min-h-[60vh] items-center justify-center overflow-hidden bg-machines-dark text-white md:min-h-[70vh]">
      <GlowBackground
        glow="rgba(230,184,0,0.4)"
        from="#e6b800"
        to="#6d28d9"
        intensity="high"
      />
      <FloatingParticles count={28} color="rgba(255,220,120,0.5)" speed={0.8} />

      {/* Converging radial lines */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <motion.div
            key={deg}
            className="absolute left-1/2 top-1/2 h-px origin-left"
            style={{
              width: "50vmax",
              transform: `rotate(${deg}deg)`,
              background: "linear-gradient(90deg, rgba(230,184,0,0.3), transparent 60%)",
            }}
            animate={{ opacity: [0.15, 0.4, 0.15] }}
            transition={{ duration: 3, delay: deg / 360, repeat: Infinity }}
          />
        ))}
      </div>

      <div className="container relative z-10 mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="mx-auto max-w-3xl text-balance text-3xl font-semibold tracking-tight md:text-5xl lg:text-6xl">
            Pronto para ativar a{" "}
            <span className="bg-gradient-to-r from-primary via-amber-300 to-primary bg-clip-text text-transparent">
              solução certa?
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-white/60 md:text-lg">
            Escolha uma máquina e encontre profissionais prontos para resolver.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="#machines"
              data-cta="final-primary"
              data-cta-action="ativar-maquina"
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_0_0_1px_rgba(230,184,0,0.4),0_8px_40px_-8px_rgba(230,184,0,0.6)] transition hover:shadow-[0_0_0_1px_rgba(230,184,0,0.8),0_12px_60px_-8px_rgba(230,184,0,0.9)]"
            >
              <span className="relative z-10">Ativar uma máquina</span>
              <ArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </Link>
            <Link
              href="/cadastro"
              data-cta="final-secondary"
              data-cta-action="anunciar-servicos"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white/90 backdrop-blur transition hover:border-white/30 hover:bg-white/10"
            >
              Anunciar meus serviços
            </Link>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="mt-8 text-xs uppercase tracking-[0.25em] text-white/35"
          >
            Sem burocracia · Sem intermediação · Contato direto
          </motion.p>
        </motion.div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[#05060a]" />
    </section>
  )
}
