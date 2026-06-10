"use client"

// F3.S7 (shell): gate leve do modal de intenção. A view (IntentModalView)
// arrasta framer-motion (~131KB) + gsap (~69KB) e ficava no First Load de
// TODAS as rotas via layout raiz. Aqui só roda o useIntent (fetch de status,
// barato) e o chunk pesado baixa apenas quando o modal realmente precisa
// aparecer. Latch: depois da primeira necessidade a view fica montada pra
// AnimatePresence animar a saída normalmente.

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { useIntent } from "./useIntent"

const IntentModalView = dynamic(
  () => import("./IntentModalView").then((m) => m.IntentModalView),
  { ssr: false },
)

export function IntentModal() {
  const intent = useIntent()
  const [everNeeded, setEverNeeded] = useState(false)
  const needed = intent.shouldShow || !!intent.chosen

  useEffect(() => {
    if (needed) setEverNeeded(true)
  }, [needed])

  if (!everNeeded) return null
  return <IntentModalView {...intent} />
}
