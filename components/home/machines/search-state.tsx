"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import type { MachineTheme } from "./tokens"
import { ScannerLine } from "./scanner-line"

type SearchStateProps = {
  machine: MachineTheme
  onComplete: () => void
}

export function SearchState({ machine, onComplete }: SearchStateProps) {
  const [step, setStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const steps = machine.processingSteps

  useEffect(() => {
    if (steps.length === 0) {
      onComplete()
      return
    }
    const perStep = 420
    const stepInterval = setInterval(() => {
      setStep((s) => {
        if (s >= steps.length - 1) {
          clearInterval(stepInterval)
          setTimeout(onComplete, 320)
          return s
        }
        return s + 1
      })
    }, perStep)

    const progInterval = setInterval(() => {
      setProgress((p) => Math.min(100, p + 100 / ((steps.length * perStep) / 40)))
    }, 40)

    return () => {
      clearInterval(stepInterval)
      clearInterval(progInterval)
    }
  }, [steps, onComplete])

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur"
      style={{ boxShadow: `0 0 60px -20px ${machine.colors.glow}` }}
    >
      <ScannerLine color={machine.colors.ring} />

      <div className="flex items-center gap-3">
        <span className="relative flex h-2.5 w-2.5">
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
            style={{ background: machine.colors.accent }}
          />
          <span
            className="relative inline-flex h-2.5 w-2.5 rounded-full"
            style={{ background: machine.colors.accent }}
          />
        </span>
        <span className="text-xs uppercase tracking-[0.25em] text-white/60">
          Processando
        </span>
      </div>

      <div className="mt-4 min-h-[2.5rem]">
        <AnimatePresence mode="wait">
          <motion.p
            key={step}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="text-lg font-medium text-white"
          >
            {steps[step]}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${machine.colors.from}, ${machine.colors.to})`,
            boxShadow: `0 0 12px ${machine.colors.glow}`,
          }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.1, ease: "linear" }}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-[10px] uppercase tracking-wider text-white/40">
        {[
          { k: "nodes", v: Math.floor(progress * 12) },
          { k: "matches", v: Math.floor(progress * 0.8) },
          { k: "score", v: Math.min(99, Math.floor(progress)) },
        ].map((m) => (
          <div
            key={m.k}
            className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
          >
            <div className="text-white/40">{m.k}</div>
            <div
              className="mt-1 font-mono text-base text-white"
              style={{ color: machine.colors.accent }}
            >
              {m.v.toString().padStart(3, "0")}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
