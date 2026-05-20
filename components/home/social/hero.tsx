"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight, Heart, MessageCircle, Send, Share2, Sparkles, Users } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { fadeUp, GhostBorder, SPRING, stagger } from "./shared"

const MICROPROVAS = [
  "Posts de portfólio",
  "Mensagens",
  "Clans",
  "Enxames",
  "Acompanhados",
  "Indicações",
]

export function SocialHero() {
  const reduce = useReducedMotion()
  const t = useTranslations("HomeSocial")
  return (
    <section className="relative isolate overflow-hidden bg-zinc-950">
      {/* Glow ambiente — bem sutil, sem saturar */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(900px 540px at 80% 5%, rgba(242,196,9,0.12), transparent 60%), radial-gradient(720px 480px at 5% 90%, rgba(242,196,9,0.06), transparent 65%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
      />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[1400px] flex-col gap-14 px-5 pb-20 pt-24 md:gap-20 md:px-10 md:pb-28 md:pt-32">
        <motion.div
          initial={reduce ? false : "hidden"}
          animate="visible"
          variants={stagger(0.05, 0.09)}
          className="grid gap-12 md:grid-cols-12 md:items-end md:gap-10"
        >
          {/* Texto */}
          <div className="md:col-span-7 md:row-start-1">
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/[0.08] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-primary"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t("hero.badge", "rede social profissional")}
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="mt-6 text-balance text-[2.4rem] font-semibold leading-[1.04] tracking-tight text-white md:text-[3.6rem] md:leading-[1.02]"
            >
              {t("hero.titlePrefix", "A rede social de profissionais")}{" "}
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-br from-primary to-amber-200 bg-clip-text text-transparent">
                  {t("hero.titleHighlight", "feita para ganhar dinheiro.")}
                </span>
                <span
                  aria-hidden
                  className="absolute -bottom-1 left-0 right-0 h-[3px] origin-left rounded-full bg-primary/70"
                />
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-white/65 md:text-lg"
            >
              {t("hero.description", "Crie seu perfil, publique seus trabalhos, apareça no feed, receba mensagens e seja encontrado por quem precisa do que você faz.")}
            </motion.p>

            <motion.div
              variants={fadeUp}
              className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-3"
            >
              <Link
                href="/cadastro"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
                style={{ boxShadow: "0 1px 0 rgba(255,255,255,0.2) inset, 0 12px 32px -16px rgba(242,196,9,0.5)" }}
              >
                {t("hero.primaryCta", "Criar meu perfil profissional")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/feed"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.08]"
              >
                {t("hero.secondaryCta", "Explorar profissionais")}
              </Link>
              <Link
                href="/account/afiliado"
                className="text-sm font-medium text-white/55 underline-offset-4 transition hover:text-primary hover:underline"
              >
                {t("hero.affiliateCta", "Ganhar indicando ->")}
              </Link>
            </motion.div>

            <motion.ul
              variants={fadeUp}
              className="mt-9 flex flex-wrap gap-x-5 gap-y-2 text-[11px] uppercase tracking-[0.2em] text-white/40"
            >
              {MICROPROVAS.map((m, i) => (
                <li key={m} className="inline-flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-primary/70" aria-hidden />
                  {t(`hero.proofs.${i}`, m)}
                </li>
              ))}
            </motion.ul>
          </div>

          {/* Visual: bento de mock-cards */}
          <motion.div
            variants={fadeUp}
            className="relative md:col-span-5 md:row-start-1"
          >
            <HeroBentoVisual />
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

function HeroBentoVisual() {
  const reduce = useReducedMotion()
  const t = useTranslations("HomeSocial")
  return (
    <div className="relative">
      {/* Card de post de portfólio (frente) */}
      <motion.div
        initial={reduce ? false : { y: 18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...SPRING, delay: 0.15 }}
        className="relative z-20 ml-auto w-full max-w-[360px]"
      >
        <GhostBorder className="relative bg-zinc-900/80 backdrop-blur">
          <div className="flex items-center gap-3 px-4 pt-4">
            <div
              className="h-9 w-9 shrink-0 rounded-full"
              style={{ background: "linear-gradient(135deg, #f2c409, #d97706)" }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{t("hero.mock.profileName", "Camila Borba")}</p>
              <p className="truncate text-[11px] text-white/50">
                {t("hero.mock.profileRole", "Editora de cortes - São Paulo, SP")}
              </p>
            </div>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">
              Views
            </span>
          </div>
          <div
            className="mx-4 mt-3 aspect-[4/5] overflow-hidden rounded-2xl"
            style={{
              background:
                "radial-gradient(120% 120% at 0% 0%, rgba(242,196,9,0.18), transparent 50%), radial-gradient(120% 120% at 100% 100%, rgba(217,70,239,0.14), transparent 50%), #0c0c0e",
            }}
          >
            <div className="flex h-full flex-col justify-end p-5">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                {t("hero.mock.portfolioLabel", "portfólio")}
              </p>
              <p className="mt-2 text-lg font-semibold leading-tight text-white">
                {t("hero.mock.portfolioTitle", "Cortes virais para o canal Sertão Studio (3 vídeos - 1,4M views)")}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 pb-4 pt-3 text-white/70">
            <div className="flex items-center gap-4 text-xs">
              <button className="inline-flex items-center gap-1 transition hover:text-primary">
                <Heart className="h-4 w-4" /> 248
              </button>
              <button className="inline-flex items-center gap-1 transition hover:text-white">
                <Share2 className="h-4 w-4" /> 31
              </button>
            </div>
            <button className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:border-primary/30 hover:text-primary">
              <MessageCircle className="h-3.5 w-3.5" />
              {t("hero.mock.sendMessage", "Enviar mensagem")}
            </button>
          </div>
        </GhostBorder>
      </motion.div>

      {/* Card de mensagem (atrás à esquerda) */}
      <motion.div
        initial={reduce ? false : { x: -16, y: 16, opacity: 0 }}
        animate={{ x: 0, y: 0, opacity: 1 }}
        transition={{ ...SPRING, delay: 0.3 }}
        className="absolute -left-2 top-12 z-10 hidden w-[260px] sm:block"
      >
        <GhostBorder className="bg-zinc-900/85 p-4 backdrop-blur">
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-white/45">
            <span>{t("hero.mock.messagesLabel", "Mensagens")}</span>
            <span className="rounded-full bg-primary px-1.5 py-0.5 font-semibold text-primary-foreground">
              {t("hero.mock.newMessages", "2 novas")}
            </span>
          </div>
          <div className="space-y-2">
            <div className="rounded-2xl rounded-bl-sm bg-white/[0.06] px-3 py-2 text-xs text-white/85">
              {t("hero.mock.messageIn", "Bom, sua thumb tem chamada de número... cabe no orçamento de 480?")}
            </div>
            <div className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">
              {t("hero.mock.messageOut", "Cabe sim. Te mando o briefing.")}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-[11px] text-white/45">
            <span className="flex-1 truncate">{t("hero.mock.inputPlaceholder", "escrever mensagem")}</span>
            <Send className="h-3.5 w-3.5" />
          </div>
        </GhostBorder>
      </motion.div>

      {/* Card de clan (atrás à direita) */}
      <motion.div
        initial={reduce ? false : { x: 16, y: 24, opacity: 0 }}
        animate={{ x: 0, y: 0, opacity: 1 }}
        transition={{ ...SPRING, delay: 0.45 }}
        className="absolute -right-3 -bottom-6 z-30 hidden w-[210px] md:block"
      >
        <GhostBorder className="bg-zinc-950/90 p-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/55">{t("hero.mock.clanLabel", "Clan")}</span>
          </div>
          <p className="mt-2 text-sm font-semibold text-white">{t("hero.mock.clanName", "Casa Áurea Studio")}</p>
          <p className="text-[11px] text-white/50">{t("hero.mock.clanDescription", "Edição & motion - 6 perfis")}</p>
          <div className="mt-3 flex -space-x-1.5">
            {["#f2c409", "#0ea5e9", "#fb7185", "#34d399"].map((c) => (
              <span
                key={c}
                className="h-6 w-6 rounded-full ring-2 ring-zinc-950"
                style={{ background: c }}
                aria-hidden
              />
            ))}
            <span className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-[10px] font-semibold text-white/70 ring-2 ring-zinc-950">
              +2
            </span>
          </div>
        </GhostBorder>
      </motion.div>
    </div>
  )
}
