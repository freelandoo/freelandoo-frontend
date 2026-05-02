"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Tag, Gift, Wallet, BarChart3 } from "lucide-react"

const PERKS = [
  { icon: Tag, title: "Cupom próprio", text: "Você ganha um código exclusivo para divulgar." },
  { icon: Gift, title: "Desconto para indicados", text: "Quem usa seu cupom também ganha vantagem." },
  { icon: BarChart3, title: "Painel de afiliado", text: "Acompanhe usos e conversões em tempo real." },
  { icon: Wallet, title: "Pagamento manual", text: "Comissão paga manualmente no início, com transparência." },
]

export function AffiliatesSection() {
  return (
    <section
      id="afiliados"
      className="relative overflow-hidden bg-machines-dark py-24 text-white md:py-32"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 80% 30%, rgba(52,211,153,0.12), transparent 60%), radial-gradient(ellipse at 20% 70%, rgba(167,139,250,0.10), transparent 60%)",
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
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-emerald-400/70">
            Afiliados
          </p>
          <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-5xl">
            Ganhe indicando{" "}
            <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-300 bg-clip-text text-transparent">
              quem quer aparecer.
            </span>
          </h2>
          <p className="mt-4 text-pretty text-white/60 md:text-lg">
            Indique profissionais para entrarem nas máquinas e acompanhe seus resultados pelo painel de afiliado.
          </p>
        </motion.div>

        <div className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
          {PERKS.map((p, i) => {
            const Icon = p.icon
            return (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur transition hover:border-emerald-400/30"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10">
                  <Icon className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">{p.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/55">{p.text}</p>
                </div>
              </motion.div>
            )
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-10 flex justify-center"
        >
          <Link
            href="/account/afiliado"
            data-cta="affiliates"
            data-cta-action="virar-afiliado"
            className="group inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/[0.08] px-7 py-3.5 text-sm font-semibold text-emerald-300 backdrop-blur transition hover:border-emerald-400/70 hover:bg-emerald-400/[0.15]"
          >
            Quero ser afiliado
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
