"use client"

/**
 * HeroSection — hero dark estilo poster.
 * Headline condensada gigante (HTML real/indexável), dois CTAs, prova social
 * e composição com foto + 4 cards de estatística flutuantes. Entrada animada
 * com framer-motion (respeita prefers-reduced-motion).
 */
import { motion, useReducedMotion, type Variants } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { LINKS, HERO_STATS } from "./tokens"
import {
  GoldButton, OutlineButton, DoodleArrow, Squiggle, HiveDoodle,
  AvatarStack, PhotoFrame, Icon, HoneycombField, Spark, StickerNote, WashiTape,
} from "./primitives"
import { EditableImage } from "@/components/site-assets/EditableImage"
import { EditableText } from "@/components/site-texts/EditableText"

const EASE = [0.16, 1, 0.3, 1] as const
const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } } }
const item: Variants = { hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } } }
const pop: Variants = { hidden: { opacity: 0, scale: 0.92, x: 18 }, show: { opacity: 1, scale: 1, x: 0, transition: { duration: 0.6, ease: EASE } } }

function StatCard({ stat, taped, slotBase }: { stat: (typeof HERO_STATS)[number]; taped?: boolean; slotBase: string }) {
  return (
    <div className="fl-card fl-hard relative flex items-center gap-3 px-4 py-3">
      {taped && <WashiTape className="-top-3 right-4" rotate={6} />}
      <span className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-[#0B0B0D] bg-[#F2B705] text-[#1A1505]">
        <Icon name={stat.icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <EditableText as="span" className="block text-sm font-black text-[#0B0B0D]" slot={`${slotBase}_label`} fallback={stat.label} />
        <EditableText as="span" className="block text-xs text-[#6B6457]" slot={`${slotBase}_line`} fallback={stat.line} />
        <EditableText as="span" className="mt-0.5 block text-xs font-bold text-[#9a7400]" slot={`${slotBase}_value`} fallback={stat.value} />
      </span>
    </div>
  )
}

export function HeroSection() {
  const reduce = useReducedMotion()

  return (
    <section className="relative isolate overflow-hidden">
      <HoneycombField opacity={0.04} />
      <DoodleArrow dir="left" className="absolute right-6 top-28 hidden h-12 w-24 text-[#F2B705] lg:block" />
      <Squiggle className="absolute right-24 top-52 hidden h-8 w-24 text-[#F2B705]/70 lg:block" />

      <div className="mx-auto grid w-full max-w-[1180px] items-center gap-12 px-5 pb-16 pt-12 sm:px-8 md:grid-cols-[1.05fr_0.95fr] md:gap-6 md:pb-24 md:pt-16">
        {/* Texto */}
        <motion.div initial={reduce ? false : "hidden"} animate="show" variants={container}>
          <motion.h1 variants={item} className="fl-display relative text-[2.9rem] text-[#F5F1E8] sm:text-6xl md:text-[4.4rem]">
            <EditableText
              as="span"
              slot="home_seller_hero_headline"
              fallback="Venda serviços, cursos, produtos e *ganhe* como afiliado."
            />
            <Spark className="absolute -right-1 -top-5 hidden h-9 w-9 text-[#F2B705] md:block" />
          </motion.h1>

          <motion.p variants={item} className="mt-6 max-w-md text-lg leading-relaxed text-[#C9C2B6]">
            <EditableText
              as="span"
              mark={false}
              slot="home_seller_hero_subcopy"
              fallback="A Freelandoo conecta quem quer *ganhar dinheiro* com quem precisa aprender, criar, comprar e empreender. Onde quiser."
            />
          </motion.p>

          <motion.div variants={item} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <GoldButton href={LINKS.cadastro} className="group">
              <EditableText as="span" slot="home_seller_hero_cta_primary" fallback="Começar agora" />
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </GoldButton>
            <OutlineButton href={LINKS.marketplace}>
              <EditableText as="span" slot="home_seller_hero_cta_secondary" fallback="Conhecer o marketplace" />
            </OutlineButton>
          </motion.div>

          <motion.div variants={item} className="mt-8 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <AvatarStack count={5} />
              <span className="text-sm text-[#9A938A]">
                <EditableText as="span" className="font-bold text-[#F5F1E8]" slot="home_seller_hero_proof_count" fallback="+10 mil pessoas" />{" "}
                <EditableText as="span" slot="home_seller_hero_proof_text" fallback="já estão ganhando" />
              </span>
            </div>
            <StickerNote rotate={-4} className="hidden sm:inline-block">
              <EditableText as="span" slot="home_seller_hero_sticker" fallback="comece de graça" />
            </StickerNote>
          </motion.div>
        </motion.div>

        {/* Visual: foto + cards de estatística.
            Mobile = empilha (foto em cima, stats abaixo). sm+ = lado a lado.
            `items-start` evita que a foto estique para a altura da coluna. */}
        <motion.div initial={reduce ? false : "hidden"} animate="show" variants={container} className="relative">
          <div className="grid gap-4 sm:grid-cols-[1.1fr_0.9fr] sm:items-start">
            <motion.div variants={pop} className="relative">
              <EditableImage
                slot="home_seller_hero_main"
                slotConfig={{ aspectRatio: 4 / 5, outputWidth: 1000, outputHeight: 1250 }}
                className="aspect-[4/5] w-full"
                fallback={
                  <PhotoFrame
                    src="/landing/hero.png"
                    alt="Pessoa feliz usando a Freelandoo no celular"
                    icon="star"
                    priority
                    ready
                    torn
                    cut
                    className="h-full w-full"
                  />
                }
              />
              <WashiTape className="-left-2 top-6" rotate={-10} />
              <HiveDoodle className="absolute -left-3 -top-3 h-12 w-12 text-[#F2B705]" />
            </motion.div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
              {HERO_STATS.map((s, i) => (
                <motion.div key={s.id} variants={pop} className="sm:fl-float-slow">
                  <StatCard stat={s} taped={i === 0} slotBase={`home_seller_stat_${String(s.id).replace(/[^a-z0-9_]/gi, "")}`} />
                </motion.div>
              ))}
            </div>
          </div>
          <DoodleArrow dir="down-right" className="absolute -left-7 -bottom-2 hidden h-10 w-20 text-[#F2B705] md:block" />
        </motion.div>
      </div>
    </section>
  )
}
