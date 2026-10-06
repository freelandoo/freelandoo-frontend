"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Palco 3D do herói (globo wireframe, anéis orbitais, partículas, núcleo).
 *
 * Aprimoramento progressivo, em três degraus:
 *   WebGPU → WebGL2 → SVG estático (sempre no HTML do servidor).
 * O SVG nasce visível e só some quando um renderizador de verdade desenhou o
 * primeiro quadro — então nenhum degrau deixa o espaço vazio.
 *
 * Os freios (regra da casa sobre camada animada):
 * - é um elemento LIMITADO (o bloco do herói), nunca a janela inteira;
 * - só desenha com o palco na tela e a aba visível;
 * - ~30 quadros por segundo, DPR no máximo 1,5 (1 em toque);
 * - movimento reduzido → um quadro e para;
 * - mouse só em ponteiro fino, e a influência é de poucos graus.
 * O renderizador (stage-renderer) chega por import() depois da página aparecer.
 */
export function RealityStage({
  className = "",
  variant = "globe",
}: {
  className?: string
  /** "cube" = cubo de vidro rosa (herói de Rankings); "globe" = globo wireframe */
  variant?: "globe" | "cube"
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [live, setLive] = useState(false)
  // Quem chama posiciona (absolute). Com "relative" e "absolute" juntas quem
  // decide é a ordem do CSS — e o palco caía no fluxo com altura zero.
  const positioned = className.split(/\s+/).some((c) => c === "absolute" || c === "fixed")

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let disposed = false
    let raf = 0
    let visible = false
    let renderer: import("./stage-renderer").StageRenderer | null = null
    let canvas: HTMLCanvasElement | null = null

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const fine = window.matchMedia("(pointer: fine)").matches
    const dprCap = fine ? 1.5 : 1

    let tx = 0, ty = 0, mx = 0, my = 0
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2
      ty = (e.clientY / window.innerHeight - 0.5) * 2
    }

    const size = () => {
      if (!canvas || !renderer) return
      const r = host.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap)
      renderer.resize(Math.max(1, Math.round(r.width * dpr)), Math.max(1, Math.round(r.height * dpr)))
    }

    const start = performance.now()
    let last = 0
    const frame = (now: number) => {
      raf = 0
      if (disposed || !renderer || !canvas) return
      if (now - last >= 32) {
        last = now
        mx += (tx - mx) * 0.06
        my += (ty - my) * 0.06
        const t = (now - start) / 1000
        // a rolagem inclina o globo um pouco — lida aqui, sem listener próprio
        const scroll = Math.min(window.scrollY / 900, 1)
        renderer.draw({
          time: t,
          yaw: t * 0.12 + mx * 0.22,
          pitch: 0.32 + my * 0.12 + scroll * 0.25,
          aspect: canvas.width / Math.max(1, canvas.height),
        })
      }
      if (!reduce && visible && !document.hidden) raf = requestAnimationFrame(frame)
    }
    const kick = () => {
      if (!raf && renderer) raf = requestAnimationFrame(frame)
    }

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible) kick()
    })
    const ro = new ResizeObserver(() => {
      size()
      kick()
    })
    const onVis = () => !document.hidden && kick()

    ;(async () => {
      const mod = await import("./stage-renderer")
      if (disposed) return
      const el = document.createElement("canvas")
      el.setAttribute("aria-hidden", "true")
      el.className = "absolute inset-0 h-full w-full"
      host.appendChild(el)
      const res = await mod.createStageRenderer(
        el,
        { white: [0.957, 0.957, 0.941], pink: [1, 0, 0.478], yellow: [1, 0.769, 0] },
        { dense: fine, preferWebGPU: true, variant },
      )
      if (disposed || !res) {
        res?.renderer.dispose()
        host.querySelectorAll("canvas").forEach((c) => c.remove())
        return
      }
      renderer = res.renderer
      canvas = res.canvas
      canvas.dataset.backend = renderer.kind
      size()
      // primeiro quadro síncrono: o SVG só sai depois de haver algo no lugar
      frame(performance.now() + 1000)
      setLive(true)
      io.observe(host)
      ro.observe(host)
      document.addEventListener("visibilitychange", onVis)
      if (fine && !reduce) window.addEventListener("pointermove", onMove, { passive: true })
    })().catch(() => {})

    return () => {
      disposed = true
      if (raf) cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      document.removeEventListener("visibilitychange", onVis)
      window.removeEventListener("pointermove", onMove)
      renderer?.dispose()
      host.querySelectorAll("canvas").forEach((c) => c.remove())
    }
  }, [variant])

  return (
    <div ref={hostRef} className={`pointer-events-none ${positioned ? "" : "relative "}${className}`} aria-hidden>
      {variant === "cube" ? <CubeFallback hidden={live} /> : <StageFallback hidden={live} />}
    </div>
  )
}

/** Degrau CSS/SVG: o mesmo desenho, parado. Também é o que o robô vê. */
function StageFallback({ hidden }: { hidden: boolean }) {
  return (
    <svg
      viewBox="-200 -200 400 400"
      className="absolute inset-0 h-full w-full transition-opacity duration-700"
      style={{ opacity: hidden ? 0 : 1 }}
    >
      <g fill="none" stroke="var(--rv-white)" strokeOpacity="0.2" strokeWidth="1">
        <circle r="92" />
        {[18, 38, 58, 76, 88].map((rx) => (
          <ellipse key={`m${rx}`} rx={rx} ry="92" />
        ))}
        {[-66, -36, 0, 36, 66].map((y) => (
          <ellipse key={`p${y}`} cy={y} rx={Math.sqrt(92 * 92 - y * y)} ry={Math.sqrt(92 * 92 - y * y) * 0.18} />
        ))}
      </g>
      <ellipse rx="150" ry="34" transform="rotate(-18)" fill="none" stroke="var(--rv-pink)" strokeWidth="1.5" />
      <ellipse rx="128" ry="58" transform="rotate(32)" fill="none" stroke="var(--rv-yellow)" strokeOpacity="0.7" strokeWidth="1" />
      <ellipse rx="168" ry="26" fill="none" stroke="var(--rv-white)" strokeOpacity="0.16" strokeDasharray="3 5" />
      <rect x="-22" y="-22" width="44" height="44" fill="none" stroke="var(--rv-pink)" transform="rotate(14)" />
      {[0, 60, 130, 210, 290].map((a) => (
        <circle key={a} r="2.2" fill="var(--rv-pink)" cx={168 * Math.cos((a * Math.PI) / 180)} cy={26 * Math.sin((a * Math.PI) / 180)} />
      ))}
    </svg>
  )
}

/** Degrau estático da variante cubo: o mesmo desenho, parado. */
function CubeFallback({ hidden }: { hidden: boolean }) {
  // cubo em perspectiva isométrica simples
  const f = [
    [-60, -40], [40, -60], [80, -10], [-20, 10],
    [-60, 60], [40, 40], [80, 90], [-20, 110],
  ]
  const e = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]
  return (
    <svg
      viewBox="-200 -200 400 400"
      className="absolute inset-0 h-full w-full transition-opacity duration-700"
      style={{ opacity: hidden ? 0 : 1 }}
    >
      <g fill="none" stroke="var(--rv-white)" strokeOpacity="0.1">
        <circle cx="-80" cy="-90" r="80" />
        <ellipse cx="-80" cy="-90" rx="40" ry="80" />
        <ellipse cx="-80" cy="-90" rx="80" ry="20" />
      </g>
      <ellipse rx="170" ry="40" transform="rotate(-20) translate(10 25)" fill="none" stroke="var(--rv-pink)" strokeWidth="1.5" />
      <ellipse rx="190" ry="60" transform="rotate(25) translate(10 25)" fill="none" stroke="var(--rv-pink)" strokeOpacity="0.5" />
      <g stroke="var(--rv-pink)" strokeWidth="2.5">
        {e.map(([a, b], i) => (
          <line key={i} x1={f[a][0]} y1={f[a][1]} x2={f[b][0]} y2={f[b][1]} />
        ))}
      </g>
    </svg>
  )
}
