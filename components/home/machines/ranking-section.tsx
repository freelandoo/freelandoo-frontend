"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { MACHINES, type MachineId } from "./tokens"
import { RankingCard } from "./ranking-card"

const SAMPLE_PROS: Record<
  Exclude<MachineId, "oportunidades">,
  { name: string; specialty: string; rating: number; responseTime: string; badges: string[] }[]
> = {
  views: [
    { name: "Lucas Monteiro", specialty: "Editor de cortes", rating: 4.9, responseTime: "~5min", badges: ["Em alta", "Responde rápido"] },
    { name: "Camila Ribeiro", specialty: "Designer de thumbnail", rating: 4.8, responseTime: "~12min", badges: ["Muito procurado", "Bem avaliado"] },
    { name: "Rafael Torres", specialty: "Roteirista", rating: 4.7, responseTime: "~20min", badges: ["Perfil completo", "Bem avaliado"] },
    { name: "Bianca Souza", specialty: "Estrategista de crescimento", rating: 4.9, responseTime: "~8min", badges: ["Em alta", "Perfil completo"] },
    { name: "Pedro Almeida", specialty: "Editor de vídeo", rating: 4.6, responseTime: "~15min", badges: ["Responde rápido"] },
  ],
  divulgacao: [
    { name: "Juliana Mendes", specialty: "Influenciadora", rating: 4.9, responseTime: "~3min", badges: ["Em alta", "Muito procurado"] },
    { name: "Thiago Costa", specialty: "Creator UGC", rating: 4.8, responseTime: "~10min", badges: ["Responde rápido", "Bem avaliado"] },
    { name: "Ana Beatriz", specialty: "Microinfluencer", rating: 4.7, responseTime: "~18min", badges: ["Perfil completo"] },
    { name: "Marcos Oliveira", specialty: "Afiliado", rating: 4.6, responseTime: "~25min", badges: ["Bem avaliado"] },
    { name: "Fernanda Lima", specialty: "Creator UGC", rating: 4.8, responseTime: "~7min", badges: ["Em alta", "Responde rápido"] },
  ],
  limpeza: [
    { name: "Maria Silva", specialty: "Diarista", rating: 4.9, responseTime: "~2min", badges: ["Responde rápido", "Em alta"] },
    { name: "João Pereira", specialty: "Limpeza pós-obra", rating: 4.8, responseTime: "~8min", badges: ["Muito procurado", "Perfil completo"] },
    { name: "Cláudia Santos", specialty: "Faxina residencial", rating: 4.7, responseTime: "~15min", badges: ["Bem avaliado"] },
    { name: "Roberto Dias", specialty: "Organização", rating: 4.6, responseTime: "~20min", badges: ["Perfil completo"] },
    { name: "Patrícia Nunes", specialty: "Diarista", rating: 4.9, responseTime: "~5min", badges: ["Em alta", "Responde rápido"] },
  ],
  construcao: [
    { name: "Carlos Eduardo", specialty: "Pedreiro", rating: 4.9, responseTime: "~4min", badges: ["Em alta", "Muito procurado"] },
    { name: "André Martins", specialty: "Engenheiro", rating: 4.8, responseTime: "~12min", badges: ["Perfil completo", "Bem avaliado"] },
    { name: "Rodrigo Alves", specialty: "Pintor", rating: 4.7, responseTime: "~18min", badges: ["Responde rápido"] },
    { name: "Felipe Santos", specialty: "Acabamento", rating: 4.6, responseTime: "~22min", badges: ["Bem avaliado"] },
    { name: "Diego Ferreira", specialty: "Ajudante", rating: 4.5, responseTime: "~10min", badges: ["Responde rápido", "Perfil completo"] },
  ],
  negocios: [
    { name: "Larissa Campos", specialty: "Social Media", rating: 4.9, responseTime: "~6min", badges: ["Em alta", "Muito procurado"] },
    { name: "Bruno Henrique", specialty: "Gestor de Tráfego", rating: 4.8, responseTime: "~9min", badges: ["Responde rápido", "Bem avaliado"] },
    { name: "Daniela Rosa", specialty: "Designer", rating: 4.7, responseTime: "~14min", badges: ["Perfil completo"] },
    { name: "Gustavo Lopes", specialty: "Atendimento", rating: 4.6, responseTime: "~20min", badges: ["Bem avaliado"] },
    { name: "Isabela Moura", specialty: "Suporte Operacional", rating: 4.5, responseTime: "~16min", badges: ["Responde rápido", "Perfil completo"] },
  ],
  saude_beleza: [
    { name: "Renata Vieira", specialty: "Massagista", rating: 4.9, responseTime: "~4min", badges: ["Em alta", "Muito procurado"] },
    { name: "Aline Barros", specialty: "Esteticista", rating: 4.8, responseTime: "~10min", badges: ["Perfil completo", "Bem avaliado"] },
    { name: "Priscila Duarte", specialty: "Maquiadora", rating: 4.7, responseTime: "~12min", badges: ["Responde rápido"] },
    { name: "Tatiane Rocha", specialty: "Lash designer", rating: 4.6, responseTime: "~15min", badges: ["Bem avaliado"] },
    { name: "Vanessa Gomes", specialty: "Cabeleireira", rating: 4.8, responseTime: "~6min", badges: ["Em alta", "Responde rápido"] },
  ],
  saude_pet: [
    { name: "Ricardo Melo", specialty: "Banho e tosa", rating: 4.9, responseTime: "~3min", badges: ["Em alta", "Responde rápido"] },
    { name: "Sandra Lopes", specialty: "Dog walker", rating: 4.8, responseTime: "~8min", badges: ["Muito procurado", "Perfil completo"] },
    { name: "Fernando Braga", specialty: "Adestrador", rating: 4.7, responseTime: "~14min", badges: ["Bem avaliado"] },
    { name: "Carla Nascimento", specialty: "Veterinária", rating: 4.9, responseTime: "~10min", badges: ["Em alta", "Perfil completo"] },
    { name: "Luís Antônio", specialty: "Pet sitter", rating: 4.6, responseTime: "~18min", badges: ["Responde rápido", "Perfil completo"] },
  ],
}

const TABS = MACHINES.filter((m) => m.id !== "oportunidades")

export function RankingSection() {
  const [activeTab, setActiveTab] = useState<Exclude<MachineId, "oportunidades">>("views")
  const machine = MACHINES.find((m) => m.id === activeTab)!
  const pros = SAMPLE_PROS[activeTab]

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
          {pros.map((pro, i) => (
            <RankingCard
              key={`${activeTab}-${pro.name}`}
              rank={i + 1}
              name={pro.name}
              specialty={pro.specialty}
              rating={pro.rating}
              responseTime={pro.responseTime}
              badges={pro.badges}
              machine={machine}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
