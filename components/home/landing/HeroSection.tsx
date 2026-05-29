"use client"

/**
 * HeroSection (1) — hero principal da homepage.
 * Headline gigante real (HTML/indexável), dois CTAs, e uma composição
 * decorativa com retrato recortado + cards de UI flutuantes.
 * Entrada animada com framer-motion (respeita prefers-reduced-motion).
 */
import Image from "next/image"
import { motion, useReducedMotion, type Variants } from "framer-motion"
import { ArrowRight, Bell, GraduationCap, ShoppingBag, Ticket, Sparkles } from "lucide-react"
import { LINKS } from "./tokens"
import {
  GoldButton,
  GhostButton,
  YellowHighlight,
  DoodleArrow,
  HiveDoodle,
  Badge,
  FloatingUICard,
  HoneycombField,
} from "./primitives"

const EASE = [0.16, 1, 0.3, 1] as const

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
}
const pop: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 16 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
}

const NOTIFS = [
  { icon: Bell, label: "Novo chamado", sub: "Marceneiro em Santo André", tone: "#F2B705", cls: "left-0 top-6 fl-float" },
  { icon: GraduationCap, label: "Curso vendido", sub: "+ R$ 89,00 agora", tone: "#0EA5E9", cls: "right-0 top-24 fl-float-slow" },
  { icon: ShoppingBag, label: "Produto comprado", sub: "Caneca artesanal", tone: "#10B981", cls: "left-2 bottom-10 fl-float-slow" },
  { icon: Ticket, label: "Cupom copiado", sub: "ALEX10 aplicado", tone: "#EC4899", cls: "right-2 bottom-28 fl-float" },
] as const

export function HeroSection() {
  const reduce = useReducedMotion()

  return (
    <section className="relative isolate overflow-hidden">
      <HoneycombField opacity={0.05} />
      {/* Blobs dourados suaves de fundo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(680px 460px at 88% 8%, rgba(242,183,5,0.22), transparent 62%), radial-gradient(520px 420px at 6% 92%, rgba(242,183,5,0.10), transparent 66%)",
        }}
      />

      <div className="mx-auto grid w-full max-w-[1200px] items-center gap-12 px-5 pb-16 pt-14 sm:px-8 md:grid-cols-[1.05fr_0.95fr] md:gap-8 md:pb-24 md:pt-20">
        {/* Texto */}
        <motion.div
          initial={reduce ? false : "hidden"}
          animate="show"
          variants={container}
        >
          <motion.div variants={item}>
            <Badge tone="ink">
              <Sparkles className="h-3.5 w-3.5 text-[#F2B705]" />
              Rede social de oportunidades
            </Badge>
          </motion.div>

          <motion.h1
            variants={item}
            className="fl-display mt-5 text-[2.6rem] font-black text-[#14110B] sm:text-6xl md:text-[4.2rem]"
          >
            Venda serviços, cursos, produtos e{" "}
            <YellowHighlight>ganhe como afiliado.</YellowHighlight>
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-[#2A2418]/75"
          >
            A Freelandoo conecta quem quer ganhar dinheiro com quem precisa contratar,
            comprar, aprender ou divulgar.
          </motion.p>

          <motion.div variants={item} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <GoldButton href={LINKS.cadastro} className="group">
              Começar agora
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </GoldButton>
            <GhostButton href={LINKS.explorar}>Explorar oportunidades</GhostButton>
          </motion.div>

          <motion.div variants={item} className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold text-[#6B6457]">
            <span>Serviços</span>
            <span className="h-1 w-1 rounded-full bg-[#F2B705]" />
            <span>Cursos</span>
            <span className="h-1 w-1 rounded-full bg-[#F2B705]" />
            <span>Produtos</span>
            <span className="h-1 w-1 rounded-full bg-[#F2B705]" />
            <span>Influenciadores</span>
            <span className="h-1 w-1 rounded-full bg-[#F2B705]" />
            <span>Afiliados</span>
          </motion.div>
        </motion.div>

        {/* Visual */}
        <motion.div
          initial={reduce ? false : "hidden"}
          animate="show"
          variants={container}
          className="relative mx-auto h-[420px] w-full max-w-[460px] sm:h-[500px]"
        >
          {/* Painel dourado de papel atrás do retrato */}
          <motion.div
            variants={pop}
            aria-hidden
            className="absolute inset-x-6 top-6 bottom-10 rounded-[28px] bg-[#F2B705]"
            style={{ transform: "rotate(-3deg)" }}
          />
          <motion.div variants={pop} className="absolute inset-x-4 top-2 bottom-12 overflow-hidden rounded-[26px] fl-card">
            <Image
              src="/placeholder-user.jpg"
              alt="Pessoa usando a Freelandoo no celular"
              fill
              sizes="(max-width:768px) 90vw, 460px"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#14110B]/35 to-transparent" />
          </motion.div>

          <HiveDoodle className="absolute -right-2 top-0 h-16 w-16 text-[#14110B]/70" />
          <DoodleArrow dir="down-right" className="absolute -left-6 top-1/3 h-12 w-20 text-[#14110B]/60" />

          {/* Cards de UI flutuantes */}
          {NOTIFS.map((n) => {
            const Icon = n.icon
            return (
              <motion.div key={n.label} variants={pop} className={`absolute ${n.cls}`}>
                <FloatingUICard float={false} className="flex items-center gap-3 rounded-2xl">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: `${n.tone}22`, color: n.tone }}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="pr-1">
                    <span className="block text-sm font-bold text-[#14110B]">{n.label}</span>
                    <span className="block text-xs text-[#6B6457]">{n.sub}</span>
                  </span>
                </FloatingUICard>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
