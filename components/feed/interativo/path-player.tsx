"use client"

// PLAYER DOS PATHS (Feed Interativo F5) — a história com caminhos.
//
// Cada passo é uma "página de tabloide": mídia, título, texto. Os botões
// aparecem em cascata ~350 ms depois (som de cartões surgindo); escolher vira
// a página para a frente (rotateY + deslize, som de página), voltar vira para
// trás. Final: carimbo FIM com mola, explosão e "Recomeçar". Barra de
// progresso pelo número de passos andados.
//
// No feed (PathStrip) a história vem de /paths/by-post e as escolhas são
// contadas; no editor (modo Testar) o grafo vem pronto e nada é contado.

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronLeft, GitBranch, Loader2, Play, RotateCcw, X } from "lucide-react"
import { fx, prefersReducedMotion } from "@/lib/feed-fx"
import { pathsApi, type PathGraph, type PathNode } from "@/lib/feed-fx/paths"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { Burst } from "./fx-art"

interface PlayerProps {
  graph: PathGraph
  /** Conta play/escolhas no servidor (só história publicada, no feed). */
  count?: boolean
  onClose?: () => void
}

export const PathPlayer = memo(function PathPlayer({ graph, count, onClose }: PlayerProps) {
  const t = useTranslations("FeedFx")
  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph.nodes])
  const start = graph.root && byId.has(graph.root) ? graph.root : graph.nodes[0]?.id
  const [trail, setTrail] = useState<string[]>(start ? [start] : [])
  const [dir, setDir] = useState(1)
  const [showChoices, setShowChoices] = useState(false)
  const counted = useRef(false)
  const reduced = prefersReducedMotion()
  const node: PathNode | undefined = byId.get(trail[trail.length - 1])

  useEffect(() => {
    if (count && !counted.current) {
      counted.current = true
      void pathsApi(`/${graph.id_story}/play`, { method: "POST", auth: "optional" }).catch(() => {})
    }
  }, [count, graph.id_story])

  useEffect(() => {
    setShowChoices(false)
    if (!node) return
    const id = window.setTimeout(() => {
      setShowChoices(true)
      if (node.is_ending) fx("caminho-fim", "premio")
      else if (node.choices.length) fx("caminho-botoes")
    }, reduced ? 0 : 380)
    return () => window.clearTimeout(id)
  }, [node, reduced])

  const choose = useCallback(
    (choiceId: string, target: string | null) => {
      if (!target || !byId.has(target)) {
        fx("erro", "erro")
        return
      }
      fx("caminho-escolha", "escolha")
      setDir(1)
      setTrail((tr) => [...tr, target])
      if (count) void pathsApi(`/${graph.id_story}/pick`, { method: "POST", body: { id_choice: choiceId }, auth: "optional" }).catch(() => {})
    },
    [byId, count, graph.id_story]
  )
  const back = () => {
    if (trail.length < 2) return
    fx("caminho-escolha", "escolha", { rate: 0.85 })
    setDir(-1)
    setTrail((tr) => tr.slice(0, -1))
  }
  const restart = () => {
    if (!start) return
    fx("caminho-escolha", "escolha", { rate: 0.8 })
    setDir(-1)
    setTrail([start])
  }

  if (!node) return null
  const step = trail.length

  return (
    <div className="fl-sharp relative overflow-hidden border-y-[3px] border-black bg-[#F2B705] p-3 text-black" style={{ perspective: 1100 }}>
      {/* topo: título + progresso */}
      <div className="mb-2 flex items-center gap-2">
        <GitBranch className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-xs font-black uppercase tracking-widest">{graph.title}</span>
        <span className="text-[11px] font-black">{t("pathStep", "passo {n}").replace("{n}", String(step))}</span>
        {onClose && (
          <button type="button" data-no-gesture onClick={onClose} aria-label={t("pathClose", "Fechar")} className="p-1">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="mb-3 flex h-1.5 gap-0.5">
        {Array.from({ length: Math.max(step, 1) }, (_, i) => (
          <motion.span key={i} className="block h-full flex-1 bg-black" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} style={{ originX: 0 }} />
        ))}
        <span className="block h-full flex-[2] bg-black/15" />
      </div>

      <AnimatePresence mode="wait" custom={dir} initial={false}>
        <motion.div
          key={`${node.id}:${step}`}
          custom={dir}
          initial={reduced ? { opacity: 0 } : { rotateY: dir > 0 ? 65 : -65, x: dir > 0 ? 50 : -50, opacity: 0 }}
          animate={{ rotateY: 0, x: 0, opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { rotateY: dir > 0 ? -65 : 65, x: dir > 0 ? -50 : 50, opacity: 0 }}
          transition={{ duration: reduced ? 0.15 : 0.32, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: dir > 0 ? "0% 50%" : "100% 50%" }}
          className="relative border-[3px] border-black bg-[#F5F1E8] shadow-[6px_6px_0_#000]"
        >
          {node.media?.url &&
            (node.media.type === "video" ? (
              <video
                src={node.media.url}
                poster={node.media.thumbnail_url || undefined}
                className="block max-h-[360px] w-full bg-black object-contain"
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={node.media.url} alt="" className="block max-h-[360px] w-full bg-black object-contain" loading="lazy" />
            ))}
          <div className="relative p-4">
            {node.title && <h3 className="fl-display text-2xl leading-tight">{node.title}</h3>}
            {node.body && <p className="mt-2 whitespace-pre-wrap text-[15px] font-medium leading-snug">{node.body}</p>}
            {node.is_ending && (
              <>
                <Burst seed={node.id} colors={["#F2B705", "#0B0B0D", "#FF3D6E"]} count={22} />
                <motion.div
                  className="mt-4 inline-block border-[3px] border-black bg-[#0B0B0D] px-4 py-1 text-2xl font-black uppercase tracking-[0.3em] text-[#F2B705]"
                  initial={{ scale: 2.6, rotate: -18, opacity: 0 }}
                  animate={{ scale: 1, rotate: -6, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 520, damping: 14, delay: 0.25 }}
                >
                  {t("pathEnd", "Fim")}
                </motion.div>
              </>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* botões */}
      <div className="mt-3 flex flex-col gap-2">
        {showChoices &&
          !node.is_ending &&
          node.choices.map((c, i) => (
            <motion.button
              key={c.id}
              type="button"
              data-no-gesture
              onClick={() => choose(c.id, c.target)}
              initial={{ y: 16, opacity: 0, rotate: i % 2 ? 1.2 : -1.2 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              whileTap={{ scale: 0.96, x: 2, y: 2 }}
              transition={{ type: "spring", stiffness: 520, damping: 24, delay: i * 0.07 }}
              className="flex w-full items-center justify-between gap-2 border-[3px] border-black bg-[#0B0B0D] px-4 py-3 text-left text-sm font-black uppercase tracking-wide text-[#F2B705] shadow-[4px_4px_0_#000]"
            >
              <span>{c.label}</span>
              <span aria-hidden>→</span>
            </motion.button>
          ))}
        {showChoices && (node.is_ending || trail.length > 1) && (
          <motion.div className="flex gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {trail.length > 1 && !node.is_ending && (
              <button type="button" data-no-gesture onClick={back} className="inline-flex items-center gap-1 border-2 border-black bg-[#F5F1E8] px-3 py-2 text-xs font-black uppercase shadow-[3px_3px_0_#000]">
                <ChevronLeft className="h-4 w-4" />
                {t("pathBack", "Voltar")}
              </button>
            )}
            {node.is_ending && (
              <>
                <button type="button" data-no-gesture onClick={restart} className="inline-flex items-center gap-1 border-2 border-black bg-[#0B0B0D] px-3 py-2 text-xs font-black uppercase text-[#F2B705] shadow-[3px_3px_0_#000]">
                  <RotateCcw className="h-4 w-4" />
                  {t("pathRestart", "Recomeçar")}
                </button>
                {trail.length > 1 && (
                  <button type="button" data-no-gesture onClick={back} className="inline-flex items-center gap-1 border-2 border-black bg-[#F5F1E8] px-3 py-2 text-xs font-black uppercase shadow-[3px_3px_0_#000]">
                    <ChevronLeft className="h-4 w-4" />
                    {t("pathOtherWay", "Tentar outro caminho")}
                  </button>
                )}
              </>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
})

/** A faixa "história com caminhos" debaixo do post do feed. Carrega sob demanda. */
export const PathStrip = memo(function PathStrip({ postId }: { postId: string }) {
  const t = useTranslations("FeedFx")
  const [state, setState] = useState<"idle" | "loading" | "open" | "error">("idle")
  const [graph, setGraph] = useState<PathGraph | null>(null)

  const open = async () => {
    if (state === "loading") return
    if (graph) {
      setState("open")
      fx("caminho-botoes")
      return
    }
    setState("loading")
    try {
      const r = await pathsApi<{ story: PathGraph }>(`/by-post/${postId}`, { auth: "optional" })
      setGraph(r.story)
      setState("open")
    } catch {
      fx("erro", "erro")
      setState("error")
    }
  }

  return (
    <div className="border-b border-[#F5F1E8]/10 bg-[#15120E]">
      <AnimatePresence initial={false} mode="wait">
        {state === "open" && graph ? (
          <motion.div key="player" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <PathPlayer graph={graph} count onClose={() => setState("idle")} />
          </motion.div>
        ) : (
          <motion.button
            key="strip"
            type="button"
            data-no-gesture
            onClick={open}
            whileTap={{ scale: 0.98 }}
            className="flex w-full items-center gap-3 px-4 py-3 text-left"
          >
            <motion.span
              className="flex h-9 w-9 items-center justify-center border-2 border-black bg-[#F2B705] text-black shadow-[3px_3px_0_#000]"
              animate={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 3.2 }}
            >
              {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
            </motion.span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-black uppercase tracking-[0.2em] text-[#F2B705]">{t("pathStripEyebrow", "História com caminhos")}</span>
              <span className="block truncate text-sm font-bold text-[#F5F1E8]">
                {state === "error" ? t("pathStripError", "Não deu para abrir agora") : t("pathStripCta", "Você escolhe o que acontece")}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 border-2 border-black bg-[#F2B705] px-3 py-1.5 text-xs font-black uppercase text-black shadow-[3px_3px_0_#000]">
              <Play className="h-3.5 w-3.5" />
              {t("pathStart", "Começar")}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
})
