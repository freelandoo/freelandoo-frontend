"use client"

// Overlay de SINAIS do Cluster de Live: quando o admin aperta um botão na sala
// de comando (ou manda uma caixa de texto), o sinal estampa GIGANTE na tela de
// todos os membros. Botão = bloco enorme na cor configurada (verde/rosa/...);
// texto = cartão grande estilo tabloide. Efêmero: some sozinho após alguns
// segundos; um novo signal_id re-anima mesmo se for o mesmo botão.
import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"

export interface ClusterSignal {
  signal_id: string
  kind: "button" | "text"
  label?: string
  color?: string
  text?: string
}

const BUTTON_VISIBLE_MS = 5_000
const TEXT_VISIBLE_MS = 9_000
const SPRING = { type: "spring" as const, stiffness: 200, damping: 18 }

export function ClusterSignalOverlay({ signal }: { signal: ClusterSignal | null }) {
  const [visible, setVisible] = useState<ClusterSignal | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!signal) return
    setVisible(signal)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(
      () => setVisible(null),
      signal.kind === "text" ? TEXT_VISIBLE_MS : BUTTON_VISIBLE_MS,
    )
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [signal])

  return (
    <div className="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center px-4">
      <AnimatePresence mode="wait">
        {visible && visible.kind === "button" && (
          <motion.div
            key={visible.signal_id}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: [1, 1.06, 1] }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={SPRING}
            className="flex min-h-[38vh] w-full max-w-2xl items-center justify-center px-6 py-10 shadow-[10px_10px_0_#0B0B0D]"
            style={{ background: visible.color || "#22c55e" }}
          >
            <span className="break-words text-center text-6xl font-black uppercase leading-none tracking-tight text-white sm:text-8xl">
              {visible.label}
            </span>
          </motion.div>
        )}
        {visible && visible.kind === "text" && (
          <motion.div
            key={visible.signal_id}
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={SPRING}
            className="w-full max-w-2xl border-2 border-[#0B0B0D] bg-[#F2B705] px-8 py-10 shadow-[10px_10px_0_#0B0B0D]"
          >
            <p className="break-words text-center text-3xl font-extrabold leading-snug text-black sm:text-4xl">
              {visible.text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
