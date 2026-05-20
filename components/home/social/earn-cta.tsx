"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import {
  ArrowRight,
  Briefcase,
  HandCoins,
  Receipt,
  Sparkles,
} from "lucide-react"
import { fadeUp, GhostBorder, SectionTitle, SectionWrap, stagger } from "./shared"

/* ───────────────────────── GANHAR DINHEIRO ──────────────────────────────── */

export function EarnMoneySection() {
  const reduce = useReducedMotion()
  const ways = [
    {
      icon: Briefcase,
      title: "Vendendo seus serviços",
      desc: "Receba mensagens, feche orçamentos e atenda clientes que chegaram pelo seu portfólio.",
      tone: "from-primary/15 to-primary/[0.02]",
      span: "md:col-span-7 md:row-span-2",
      highlight: true,
    },
    {
      icon: Sparkles,
      title: "Aparecendo nos enxames",
      desc: "Cada enxame é um canal de intenção. Apareça onde a procura é forte.",
      tone: "from-emerald-400/15 to-emerald-400/[0.02]",
      span: "md:col-span-5",
    },
    {
      icon: HandCoins,
      title: "Indicando profissionais",
      desc: "Ative seu cupom, divulgue e ganhe comissão a cada profissional que assinar.",
      tone: "from-fuchsia-400/15 to-fuchsia-400/[0.02]",
      span: "md:col-span-5",
    },
  ]
  return (
    <SectionWrap id="earn" bg="lift">
      <SectionTitle
        eyebrow="ganhar dinheiro"
        title={<>Três formas de ganhar dinheiro na Freelandoo.</>}
        desc="Venda serviços, publique portfólio, receba mensagens e use a Freelandoo como vitrine social profissional."
        accent
      />

      <motion.div
        initial={reduce ? false : "hidden"}
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger(0.05, 0.08)}
        className="mt-12 grid gap-4 md:grid-cols-12 md:auto-rows-[1fr]"
      >
        {ways.map((w) => (
          <motion.article
            key={w.title}
            variants={fadeUp}
            className={w.span}
          >
            <GhostBorder
              className={
                "relative h-full overflow-hidden bg-gradient-to-br p-7 md:p-8 " + w.tone
              }
            >
              <div className="flex h-full flex-col gap-5">
                <div className="flex items-center gap-3">
                  <div
                    className={
                      "grid h-10 w-10 place-items-center rounded-xl border " +
                      (w.highlight
                        ? "border-primary/30 bg-primary/[0.10] text-primary"
                        : "border-white/10 bg-white/[0.04] text-white")
                    }
                  >
                    <w.icon className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                    forma de ganhar
                  </span>
                </div>
                <div className="flex-1">
                  <h3
                    className={
                      "text-pretty leading-tight " +
                      (w.highlight
                        ? "text-2xl font-semibold text-white md:text-3xl"
                        : "text-xl font-semibold text-white")
                    }
                  >
                    {w.title}
                  </h3>
                  <p
                    className={
                      "mt-2 leading-relaxed text-white/65 " +
                      (w.highlight ? "text-base" : "text-sm")
                    }
                  >
                    {w.desc}
                  </p>
                </div>

                {w.highlight && (
                  <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.07] pt-5">
                    <Link
                      href="/cadastro"
                      className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition active:scale-[0.97]"
                    >
                      Criar perfil profissional
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                      href="/feed"
                      className="text-xs font-semibold text-white/60 underline-offset-4 transition hover:text-white hover:underline"
                    >
                      Explorar feed
                    </Link>
                  </div>
                )}
              </div>
            </GhostBorder>
          </motion.article>
        ))}
      </motion.div>
    </SectionWrap>
  )
}

/* ───────────────────────── PARA QUEM É ──────────────────────────────────── */

const PROFILES = [
  "Freelancers",
  "Creators",
  "Prestadores locais",
  "Profissionais de marketing",
  "Designers",
  "Editores",
  "Influenciadores",
  "Diaristas",
  "Profissionais de beleza",
  "Profissionais pet",
  "Profissionais de construção",
  "Clans e equipes",
]

export function ForWhomSection() {
  const reduce = useReducedMotion()
  return (
    <SectionWrap id="for-whom">
      <div className="grid gap-12 md:grid-cols-12 md:items-end md:gap-14">
        <div className="md:col-span-5">
          <SectionTitle
            eyebrow="para quem é"
            title={<>Feita para quem vive de trabalho, serviço e reputação.</>}
            desc="Se a sua renda depende do seu trabalho aparecer e da sua reputação ser vista, a Freelandoo é o seu canal."
          />
        </div>

        <motion.ul
          initial={reduce ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger(0.02, 0.04)}
          className="md:col-span-7 grid grid-cols-2 gap-x-8 gap-y-1 sm:grid-cols-3"
        >
          {PROFILES.map((p) => (
            <motion.li
              key={p}
              variants={fadeUp}
              className="group flex items-center gap-3 border-b border-white/[0.06] py-3 text-sm text-white/80 transition hover:text-white"
            >
              <span
                aria-hidden
                className="h-1 w-1 rounded-full bg-primary/60 transition-all group-hover:w-3 group-hover:bg-primary"
              />
              {p}
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </SectionWrap>
  )
}

/* ───────────────────────── CTA FINAL ────────────────────────────────────── */

export function SocialFinalCTASection() {
  const reduce = useReducedMotion()
  return (
    <SectionWrap id="final-cta" bg="deep" className="border-t border-white/[0.06]">
      <motion.div
        initial={reduce ? false : "hidden"}
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger(0.05, 0.08)}
        className="relative isolate overflow-hidden rounded-[2rem] border border-white/[0.07] bg-gradient-to-br from-primary/[0.08] via-zinc-900/60 to-zinc-950 px-6 py-16 md:px-14 md:py-20"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-50"
          style={{
            background:
              "radial-gradient(700px 360px at 80% 0%, rgba(242,196,9,0.18), transparent 60%)",
          }}
        />

        <motion.p
          variants={fadeUp}
          className="text-[11px] uppercase tracking-[0.22em] text-primary/80"
        >
          publique · apareça · ganhe
        </motion.p>
        <motion.h2
          variants={fadeUp}
          className="mt-4 max-w-3xl text-balance text-3xl font-semibold leading-[1.05] tracking-tight text-white md:text-5xl"
        >
          Seu trabalho já existe. Agora ele precisa ser visto.
        </motion.h2>
        <motion.p
          variants={fadeUp}
          className="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-white/70 md:text-lg"
        >
          Crie seu perfil, publique seu portfólio e entre na rede social de profissionais
          feita para gerar dinheiro.
        </motion.p>

        <motion.div
          variants={fadeUp}
          className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <Link
            href="/cadastro"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
            style={{ boxShadow: "0 1px 0 rgba(255,255,255,0.2) inset, 0 16px 36px -18px rgba(242,196,9,0.55)" }}
          >
            Criar meu perfil profissional
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/feed"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.08]"
          >
            Explorar feed de portfólios
          </Link>
          <Link
            href="/account/afiliado"
            className="inline-flex items-center gap-2 self-center text-sm font-medium text-white/55 underline-offset-4 transition hover:text-primary hover:underline"
          >
            <Receipt className="h-3.5 w-3.5" />
            Ganhar indicando
          </Link>
        </motion.div>
      </motion.div>
    </SectionWrap>
  )
}
