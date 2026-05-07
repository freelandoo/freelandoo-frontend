"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowUpRight } from "lucide-react"
import { fadeUp, GhostBorder, SectionTitle, SectionWrap, stagger } from "./shared"
import { MACHINES } from "@/components/home/machines/tokens"

// Bento asimétrico em 12 colunas — 8 máquinas em ritmos diferentes:
// linha 1: 5/4/3 ; linha 2: 3/4/5 ; linha 3: 6/6
const SPANS = [
  "md:col-span-5",
  "md:col-span-4",
  "md:col-span-3",
  "md:col-span-3",
  "md:col-span-4",
  "md:col-span-5",
  "md:col-span-6",
  "md:col-span-6",
]

export function MachinesIntentSection() {
  const reduce = useReducedMotion()
  return (
    <SectionWrap id="machines">
      <SectionTitle
        eyebrow="máquinas de intenção"
        title={<>As máquinas mostram seu trabalho para a intenção certa.</>}
        desc="Na Freelandoo, profissionais não ficam jogados em uma lista genérica. Eles entram em máquinas de intenção — e cada máquina tem público próprio."
      />

      <motion.div
        initial={reduce ? false : "hidden"}
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger(0.04, 0.07)}
        className="mt-12 grid gap-3 md:grid-cols-12 md:gap-4"
      >
        {MACHINES.map((m, i) => (
          <motion.article
            key={m.id}
            variants={fadeUp}
            className={"group relative " + (SPANS[i] ?? "md:col-span-3")}
          >
            <Link
              href={`/maquina/${m.id}`}
              className="block h-full"
              aria-label={`Entrar na ${m.name}`}
            >
              <GhostBorder className="relative h-full overflow-hidden p-6 transition-colors duration-300 md:p-7">
                {/* tinte por máquina, baixa saturação */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -z-0 opacity-[0.18] transition-opacity duration-500 group-hover:opacity-[0.32]"
                  style={{
                    background: `radial-gradient(120% 140% at 0% 0%, ${m.colors.glow}, transparent 60%)`,
                  }}
                />
                <div className="relative flex h-full flex-col justify-between gap-6">
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                      {m.label}
                    </span>
                    <span
                      className="rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wider"
                      style={{
                        color: m.colors.accent,
                        borderColor: `${m.colors.accent}55`,
                        background: `${m.colors.accent}12`,
                      }}
                    >
                      Máquina
                    </span>
                  </div>

                  <div>
                    <h3 className="text-pretty text-xl font-semibold leading-tight text-white md:text-2xl">
                      {m.name.replace("Máquina de ", "")}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/55">
                      {m.microcopy}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/[0.06] pt-4">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-white/40">
                      Entrar nessa máquina
                    </span>
                    <ArrowUpRight
                      className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      style={{ color: m.colors.accent }}
                    />
                  </div>
                </div>
              </GhostBorder>
            </Link>
          </motion.article>
        ))}
      </motion.div>
    </SectionWrap>
  )
}
