"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import type { MachineTheme } from "./tokens"

type MachineInputProps = {
  machine: MachineTheme
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}

export function MachineInput({ machine, value, onChange, disabled }: MachineInputProps) {
  const [phIndex, setPhIndex] = useState(0)

  useEffect(() => {
    if (value || disabled) return
    if (machine.rotatingPlaceholders.length === 0) return
    const t = setInterval(() => {
      setPhIndex((i) => (i + 1) % machine.rotatingPlaceholders.length)
    }, 2600)
    return () => clearInterval(t)
  }, [value, disabled, machine.rotatingPlaceholders.length])

  const current = value
    ? null
    : machine.rotatingPlaceholders[phIndex] ?? machine.inputPlaceholder

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur transition focus-within:border-white/30"
      style={{
        boxShadow: `0 0 0 1px rgba(255,255,255,0.02), 0 0 40px -12px ${machine.colors.glow}`,
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-40"
        style={{
          background: `linear-gradient(90deg, transparent, ${machine.colors.glow} 50%, transparent)`,
          mixBlendMode: "screen",
        }}
      />
      <div className="relative flex items-center gap-3 px-5 py-4">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{
            background: machine.colors.accent,
            boxShadow: `0 0 12px ${machine.colors.accent}`,
          }}
        />
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-transparent text-base text-white outline-none placeholder:text-transparent disabled:opacity-60 md:text-lg"
            aria-label={machine.inputPlaceholder}
          />
          {!value && !disabled && (
            <div className="pointer-events-none absolute inset-0 flex items-center overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.span
                  key={current}
                  initial={{ y: 14, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -14, opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="truncate text-base text-white/40 md:text-lg"
                >
                  {current}
                </motion.span>
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
