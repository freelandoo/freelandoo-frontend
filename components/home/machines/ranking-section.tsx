"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { MACHINES, type MachineId } from "./tokens"
import { RankingCard } from "./ranking-card"

type RankingPro = {
  id_profile: string
  display_name: string
  avatar_url: string | null
  specialty: string
  avg_rating: number
  visits_count: number
  likes_count: number
  position_machine: number | null
  is_clan?: boolean
  members_count?: number | null
}

const TABS = MACHINES.filter((m) => m.id !== "oportunidades")

export function RankingSection() {
  const [activeTab, setActiveTab] = useState<Exclude<MachineId, "oportunidades">>("views")
  const [pros, setPros] = useState<RankingPro[]>([])
  const [loading, setLoading] = useState(true)

  const machine = MACHINES.find((m) => m.id === activeTab)!

  useEffect(() => {
    setLoading(true)
    fetch(`/api/ranking/public/machine/${activeTab}?limit=5`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setPros(Array.isArray(data) ? data : []))
      .catch(() => setPros([]))
      .finally(() => setLoading(false))
  }, [activeTab])

  return (
    <section className="relative overflow-hidden bg-machines-dark py-24 text-white md:py-32">
      {/* Subtle grid */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="container relative z-10 mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-white/50">
            Ranking
          </p>
          <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-5xl">
            Os mais{" "}
            <span className="bg-gradient-to-r from-primary via-amber-300 to-primary bg-clip-text text-transparent">
              ativados
            </span>{" "}
            agora.
          </h2>
          <p className="mt-4 text-pretty text-white/60 md:text-lg">
            Profissionais em destaque por atividade, presença e avaliação.
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="mt-12 flex flex-wrap justify-center gap-2">
          {TABS.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveTab(m.id as Exclude<MachineId, "oportunidades">)}
              className="relative rounded-full border px-4 py-2 text-xs font-medium uppercase tracking-wider transition"
              style={{
                borderColor: activeTab === m.id ? m.colors.ring : "rgba(255,255,255,0.1)",
                background: activeTab === m.id ? `${m.colors.from}22` : "transparent",
                color: activeTab === m.id ? m.colors.text : "rgba(255,255,255,0.5)",
                boxShadow: activeTab === m.id ? `0 0 20px -6px ${m.colors.glow}` : "none",
              }}
            >
              {m.name.replace("Máquina de ", "")}
            </button>
          ))}
        </div>

        {/* Cards */}
        <div className="mx-auto mt-10 max-w-2xl space-y-3">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[72px] rounded-2xl border border-white/10 bg-white/[0.03] animate-pulse"
                />
              ))}
            </div>
          ) : pros.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-14 text-center backdrop-blur">
              <p className="text-sm text-white/70">
                Ainda estamos ativando profissionais nesta máquina.
              </p>
              <p className="mt-1 text-xs text-white/40">
                Seja um dos primeiros a aparecer aqui.
              </p>
              <Link
                href="/cadastro"
                data-cta="ranking-empty"
                data-cta-action="ativar-perfil-empty"
                className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition hover:gap-2"
              >
                Ativar meu perfil
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            pros.map((pro, i) => (
              <RankingCard
                key={pro.id_profile}
                rank={i + 1}
                id_profile={pro.id_profile}
                name={pro.display_name}
                avatar_url={pro.avatar_url}
                specialty={pro.specialty}
                rating={Number(pro.avg_rating)}
                visits={pro.visits_count}
                likes={pro.likes_count}
                machine={machine}
                is_clan={pro.is_clan}
                members_count={pro.members_count}
              />
            ))
          )}
        </div>

        {pros.length > 0 && (
          <div className="mt-10 flex justify-center">
            <Link
              href={`/search?machine=${activeTab}`}
              data-cta="ranking"
              data-cta-action="ver-destaque"
              className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white/85 backdrop-blur transition hover:border-white/30 hover:bg-white/10"
            >
              Ver profissionais em destaque
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
