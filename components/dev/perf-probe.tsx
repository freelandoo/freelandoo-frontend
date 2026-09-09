"use client"

/**
 * O MEDIDOR — só existe com `?perf=1` na URL, e existe porque já erramos o
 * alvo três vezes por dedução.
 *
 * O relato do Alex (2026-09-09) foi "o hover está com 1 segundo de atraso", e
 * um segundo é grande demais para ser desenho: o `:hover` da folha de estilo
 * transita em 90ms. O que leva um segundo é a THREAD PRINCIPAL — o navegador
 * precisa dela para descobrir sobre qual elemento o mouse está (o hit-test) e
 * para recalcular estilo. Enquanto uma tarefa longa estiver rodando, o mouse
 * já se moveu e o hover ainda não aconteceu. Não é lento: está na fila.
 *
 * Este painel mede as DUAS pontas dessa frase, e nenhuma delas se descobre
 * lendo código:
 *
 *  - ATRASO DE ENTRADA (`event` timing): quanto tempo entre o evento acontecer
 *    e o navegador conseguir tratá-lo (`processingStart - startTime`). É
 *    literalmente o "1 segundo de atraso", em número.
 *  - TAREFAS LONGAS (`longtask`): quem estava ocupando a thread. A atribuição
 *    do navegador é grosseira de propósito (por segurança ele não diz a função),
 *    mas diz se veio da própria página ou de um `iframe`.
 *
 * ⚠️ NÃO É FEATURE, É INSTRUMENTO. Sai quando a causa estiver fechada. Por isso
 * ele não tem i18n (é para nós dois), não tem estilo da casa, e nada dele roda
 * sem a flag: sem `?perf=1` o componente devolve `null` antes de criar
 * observador nenhum — custo zero para quem não pediu.
 *
 * ⚠️ `?nocv=1` DESLIGA o `content-visibility` do card do feed. É o segundo
 * botão do experimento: se o atraso sumir com ele desligado, a regressão é
 * daquela linha e ela volta atrás; se não mudar nada, a causa é outra e a
 * linha fica. Uma variável por vez.
 */

import { useEffect, useState } from "react"

type Row = { label: string; ms: number; at: number }

export function PerfProbe() {
  const [on, setOn] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [worst, setWorst] = useState({ input: 0, task: 0 })

  // A flag é lida do `window`, UMA vez. `useSearchParams` obrigaria Suspense e
  // tiraria do pré-render toda rota que montasse este componente — o mesmo
  // degrau que já quebrou o build com `?tipo=condo`.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    if (q.get("perf") !== "1") return
    setOn(true)

    // `?nocv=1`: a classe entra no <html> e a regra de globals.css se desliga.
    if (q.get("nocv") === "1") document.documentElement.classList.add("fl-no-cv")

    const push = (label: string, ms: number) =>
      setRows((prev) => [{ label, ms: Math.round(ms), at: Date.now() }, ...prev].slice(0, 12))

    const observers: PerformanceObserver[] = []

    // ── quanto tempo o evento esperou na fila ──────────────────────────────
    try {
      const io = new PerformanceObserver((list) => {
        for (const e of list.getEntries() as PerformanceEventTiming[]) {
          const delay = e.processingStart - e.startTime
          if (delay < 30) continue
          setWorst((w) => ({ ...w, input: Math.max(w.input, delay) }))
          push(`espera do ${e.name}`, delay)
        }
      })
      // `durationThreshold` mínimo aceito pelo navegador é 16ms. O cast existe
      // porque a definição de tipos do TS ainda não conhece o campo — ele é do
      // Event Timing API, que os tipos do DOM cobrem só pela metade.
      io.observe({ type: "event", buffered: true, durationThreshold: 16 } as PerformanceObserverInit)
      observers.push(io)
    } catch {
      /* navegador sem Event Timing: o painel ainda mostra as tarefas longas */
    }

    // ── quem estava segurando a thread ────────────────────────────────────
    try {
      const lo = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          setWorst((w) => ({ ...w, task: Math.max(w.task, e.duration) }))
          push("tarefa longa", e.duration)
        }
      })
      lo.observe({ type: "longtask", buffered: true })
      observers.push(lo)
    } catch {
      /* Safari/Firefox não têm longtask — o atraso de entrada ainda vale */
    }

    return () => observers.forEach((o) => o.disconnect())
  }, [])

  if (!on) return null

  return (
    <div
      style={{
        position: "fixed",
        right: 8,
        bottom: 8,
        zIndex: 2147483647,
        width: 260,
        maxHeight: "45vh",
        overflow: "auto",
        background: "#0B0B0D",
        color: "#F5F1E8",
        border: "2px solid #F2B705",
        font: "11px/1.35 ui-monospace, monospace",
        padding: 8,
      }}
    >
      <div style={{ color: "#F2B705", fontWeight: 700, marginBottom: 6 }}>
        MEDIDOR · pior espera {Math.round(worst.input)}ms · pior tarefa {Math.round(worst.task)}ms
      </div>
      {rows.length === 0 ? (
        <div style={{ opacity: 0.7 }}>mexa o mouse nos pills e role a página…</div>
      ) : (
        rows.map((r, i) => (
          <div key={`${r.at}-${i}`} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span style={{ opacity: 0.85 }}>{r.label}</span>
            <span style={{ color: r.ms > 200 ? "#ff6b6b" : r.ms > 80 ? "#F2B705" : "#7ee787" }}>{r.ms}ms</span>
          </div>
        ))
      )}
    </div>
  )
}
