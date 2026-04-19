"use client"

import { motion } from "framer-motion"
import { MessageCircle } from "lucide-react"
import type { MachineTheme } from "./tokens"

type ResultCardProps = {
  title: string
  tag: string
  machine: MachineTheme
  index: number
}

export function ResultCard({ title, tag, machine, index }: ResultCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur transition hover:border-white/20"
    >
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${machine.colors.glow}, transparent 70%)`,
        }}
      />

      <div className="relative p-5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10"
            style={{
              background: `linear-gradient(135deg, ${machine.colors.from}33, ${machine.colors.to}22)`,
            }}
          >
            <span
              className="text-lg font-bold"
              style={{ color: machine.colors.accent }}
            >
              {title.charAt(0)}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-sm font-semibold text-white">{title}</h4>
            <span
              className="mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider"
              style={{
                background: `${machine.colors.from}22`,
                color: machine.colors.text,
              }}
            >
              {tag}
            </span>
          </div>
        </div>

        <button
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
          style={{
            boxShadow: `0 0 20px -8px ${machine.colors.glow}`,
          }}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Falar agora
        </button>
      </div>
    </motion.div>
  )
}
