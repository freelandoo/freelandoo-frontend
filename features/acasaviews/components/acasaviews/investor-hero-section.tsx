"use client"

import Image from "next/image"
import {
  ArrowRight,
  Calendar,
  Users,
  Coins,
  Vote,
  ShieldAlert,
  TrendingUp,
  Eye,
  PlayCircle,
  Lock,
  MessageCircle,
  Heart,
} from "lucide-react"
import { MetricCard } from "./metric-card"

const BADGES = [
  { icon: Calendar, label: "Temporada", value: "7 dias" },
  { icon: Users, label: "Casa", value: "8 participantes" },
  { icon: Coins, label: "Saldo total", value: "R$ 7.000" },
  { icon: Lock, label: "Por dia", value: "R$ 1.000" },
  { icon: ShieldAlert, label: "Sabotadores", value: "2 · 1 por grupo" },
  { icon: TrendingUp, label: "Rankings", value: "Participantes + Audiência" },
  { icon: PlayCircle, label: "Final", value: "Decidida por views" },
]

export default function InvestorHeroSection() {
  return (
    <section className="relative isolate min-h-screen overflow-hidden bg-[#06060c]">
      <div className="absolute inset-0">
        <Image
          src="/acasaviews/acasaviews/hero-acasaviews.png"
          alt=""
          fill
          priority
          aria-hidden
          className="hidden object-cover opacity-55 md:block"
        />
        <Image
          src="/acasaviews/acasaviews/hero-acasaviews-mobile.png"
          alt=""
          fill
          priority
          aria-hidden
          className="object-cover opacity-45 md:hidden"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#06060c]/40 via-[#06060c]/72 to-[#06060c]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(217,70,239,0.18),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(34,211,238,0.10),transparent_45%)]" />
      </div>

      <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:64px_64px]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 pb-16 pt-32 md:px-10 md:pt-40">
        <div className="grid items-start gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-slate-400">
              <span className="h-px w-10 bg-fuchsia-400/60" />
              <span>Studio Views — Pitch interativo</span>
            </div>

            <h1 className="mt-8 text-balance text-5xl font-semibold leading-[0.95] tracking-tight text-white md:text-7xl lg:text-[88px]">
              A Casa{" "}
              <span className="bg-gradient-to-r from-fuchsia-300 via-pink-300 to-amber-200 bg-clip-text text-transparent">
                Views
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-pretty text-xl font-light leading-snug text-slate-200 md:text-2xl">
              O reality onde audiência e participantes jogam.
            </p>

            <p className="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-slate-400 md:text-lg">
              Uma temporada digital de 7 dias onde convivência, dinheiro secreto, sabotagem,
              rankings e criação de conteúdo se transformam em uma máquina de atenção para marcas,
              creators e plataformas.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <a
                href="#maquina"
                className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-all hover:bg-white/90"
              >
                Ver a Máquina do Jogo
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="#investidor"
                className="inline-flex items-center gap-2 rounded-full bg-white/[0.04] px-6 py-3 text-sm font-medium text-white ring-1 ring-white/15 backdrop-blur-xl transition-all hover:bg-white/[0.08]"
              >
                Proposta para investidores
              </a>
            </div>

            <div className="mt-10 max-w-2xl overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/12 via-fuchsia-500/8 to-violet-500/10 p-6 ring-1 ring-amber-400/25 backdrop-blur-xl">
              <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.28em] text-amber-300">
                <span className="h-px w-8 bg-amber-300/60" />
                <span>Mecânica central</span>
              </div>
              <p className="mt-4 text-pretty text-lg font-medium leading-snug text-white md:text-xl">
                Todo dia alguém recebe{" "}
                <span className="bg-gradient-to-r from-amber-200 to-fuchsia-200 bg-clip-text font-semibold text-transparent">
                  R$ 1.000 em segredo
                </span>
                . Quem descobrir com quem está o dinheiro pode capturar o saldo. No último dia, os
                três mais ricos disputam a final criando conteúdo. Quem fizer mais views vence.
              </p>
            </div>
          </div>

          <div className="relative hidden min-h-[440px] lg:col-span-5 lg:block">
            <div className="absolute right-0 top-0 w-72 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-amber-400/25 backdrop-blur-xl shadow-[0_24px_80px_-30px_rgba(252,211,77,0.5)]">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-amber-300">
                <Lock className="h-3 w-3" />
                R$ 1.000 liberados hoje
              </div>
              <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-amber-200">
                R$ 1.000<span className="ml-2 text-xs text-amber-300/60">→ ???</span>
              </p>
              <p className="mt-1 text-[10px] text-slate-500">distribuído em segredo · dia 03</p>
            </div>

            <div className="absolute right-12 top-44 w-64 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-fuchsia-400/25 backdrop-blur-xl shadow-[0_24px_80px_-30px_rgba(232,121,249,0.5)]">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-fuchsia-300">
                <Vote className="h-3 w-3" />
                Votação de captura ativa
              </div>
              <div className="mt-3 space-y-1.5">
                {[
                  { p: "Mari", v: 38 },
                  { p: "Caio", v: 24 },
                  { p: "Iza", v: 19 },
                ].map((r) => (
                  <div key={r.p} className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-200">{r.p}</span>
                    <div className="ml-3 h-1 flex-1 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full bg-gradient-to-r from-fuchsia-400 to-rose-300"
                        style={{ width: `${r.v * 2.5}%` }}
                      />
                    </div>
                    <span className="ml-2 font-mono text-[10px] tabular-nums text-slate-400">
                      {r.v}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute left-0 top-28 w-60 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-cyan-400/25 backdrop-blur-xl shadow-[0_24px_80px_-30px_rgba(34,211,238,0.5)]">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                <TrendingUp className="h-3 w-3" />
                Ranking · Participantes
              </div>
              <div className="mt-3 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-slate-200">
                  <span>#1 Mari</span>
                  <span className="flex items-center gap-2 font-mono tabular-nums text-cyan-300">
                    184K <Eye className="h-3 w-3" />
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>#2 Caio</span>
                  <span className="font-mono tabular-nums text-slate-400">162K</span>
                </div>
              </div>
            </div>

            <div className="absolute left-12 bottom-28 w-60 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-violet-400/25 backdrop-blur-xl shadow-[0_24px_80px_-30px_rgba(167,139,250,0.4)]">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-violet-300">
                <Heart className="h-3 w-3" />
                Ranking · Audiência
              </div>
              <p className="mt-2 text-[11px] italic leading-snug text-slate-300">
                “Vi a Mari sair do quarto…”
              </p>
              <div className="mt-2 flex items-center gap-3 text-[10px] font-mono text-slate-500">
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3 text-rose-300" /> 412
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3 text-cyan-300" /> 38
                </span>
              </div>
            </div>

            <div className="absolute right-0 bottom-0 w-56 rounded-2xl bg-gradient-to-br from-rose-600/20 to-slate-900/60 p-4 ring-1 ring-rose-400/30 backdrop-blur-xl shadow-[0_24px_80px_-30px_rgba(244,63,94,0.5)]">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-rose-200">
                <ShieldAlert className="h-3 w-3" />
                Sabotador em missão
              </div>
              <p className="mt-2 text-[11px] leading-snug text-white">
                Sabote a aliança do quarto verde sem ser descoberto.
              </p>
              <p className="mt-2 font-mono text-[10px] text-rose-300">
                saldo em risco · EXPIRA 22:14
              </p>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-16">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
            {BADGES.map((b, i) => (
              <MetricCard
                key={b.label}
                icon={b.icon}
                label={b.label}
                value={b.value}
                accent={i % 3 === 0 ? "fuchsia" : i % 3 === 1 ? "cyan" : "violet"}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[#06060c]" />
    </section>
  )
}
