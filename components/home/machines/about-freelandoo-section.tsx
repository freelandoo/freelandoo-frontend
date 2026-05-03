"use client"

import { motion } from "framer-motion"
import { Network, Layers, ShieldCheck } from "lucide-react"

const BLOCKS = [
  {
    icon: Network,
    eyebrow: "A plataforma",
    text:
      "O Freelandoo é uma plataforma que conecta clientes, freelancers, prestadores de serviço, influenciadores e profissionais autônomos.",
    accent: "#fbbf24",
    glow: "rgba(251,191,36,0.35)",
  },
  {
    icon: Layers,
    eyebrow: "O que dá pra fazer",
    text:
      "Na plataforma, usuários podem encontrar profissionais, divulgar serviços, criar perfis públicos, entrar em contato diretamente e buscar oportunidades em áreas como marketing, divulgação, limpeza, construção, negócios, beleza e serviços para pets.",
    accent: "#a78bfa",
    glow: "rgba(167,139,250,0.35)",
  },
  {
    icon: ShieldCheck,
    eyebrow: "Login com Google",
    text:
      "O login com Google é usado para facilitar o cadastro e o acesso à conta. Quando o usuário escolhe entrar com Google, o Freelandoo utiliza informações básicas como nome, e-mail e foto de perfil apenas para identificação, autenticação e funcionamento da conta dentro da plataforma.",
    accent: "#34d399",
    glow: "rgba(52,211,153,0.35)",
  },
]

export function AboutFreelandooSection() {
  return (
    <section
      id="como-funciona-freelandoo"
      className="relative overflow-hidden bg-machines-dark py-24 text-white md:py-32"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(230,184,0,0.12), transparent 65%)",
        }}
      />

      <div className="container relative z-10 mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-white/50">
            Sobre a plataforma
          </p>
          <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-5xl">
            Como funciona a{" "}
            <span className="bg-gradient-to-r from-primary via-amber-300 to-primary bg-clip-text text-transparent">
              Freelandoo
            </span>
          </h2>
        </motion.div>

        <div className="mx-auto mt-14 grid max-w-6xl grid-cols-1 gap-5 md:grid-cols-3">
          {BLOCKS.map((b, i) => {
            const Icon = b.icon
            return (
              <motion.div
                key={b.eyebrow}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.55, delay: i * 0.1 }}
                className="group relative flex flex-col rounded-3xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur transition hover:border-white/20"
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.boxShadow = `0 0 60px -18px ${b.glow}`
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 0 transparent`
                }}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-30 blur-2xl transition-opacity duration-500 group-hover:opacity-70"
                  style={{ background: b.glow }}
                />

                <div
                  className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 transition-transform duration-300 group-hover:scale-[1.06]"
                  style={{
                    background: `${b.accent}14`,
                    boxShadow: `0 0 20px -6px ${b.glow}`,
                  }}
                >
                  <Icon className="h-6 w-6" style={{ color: b.accent }} />
                </div>

                <p
                  className="relative mt-5 text-[10px] font-semibold uppercase tracking-[0.25em]"
                  style={{ color: b.accent }}
                >
                  {b.eyebrow}
                </p>

                <p className="relative mt-3 text-sm leading-relaxed text-white/70 md:text-[15px]">
                  {b.text}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
