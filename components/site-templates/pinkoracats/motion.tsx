"use client"

// A CAMADA DE MOVIMENTO GLOBAL — GSAP + ScrollTrigger, escopada no tema.
//
// É aqui que moram os três "providers" do briefing, sem React Context:
//   PerformanceTier  decide `data-tier` (high · medium · low)
//   GlobalLight      UMA softbox virtual: `--lx`/`--ly` na raiz do tema
//   Motion           os gestos genéricos, por atributo:
//
//     [data-reveal]     a peça entra (up · left · scale · clip · fade)
//     [data-lines]      a manchete entra linha a linha
//     [data-depth]      planos em velocidades diferentes (só high)
//     [data-lid-scrub]  a tampa das caixas abre conforme a seção passa
//     [data-tilt]       a peça responde ao ponteiro: ±6° / ±4°, nunca mais
//
// As cenas com coreografia própria (o Vault, o New Drop, a esteira) têm o
// próprio componente — este arquivo só cuida do que é igual em todo lugar.
//
// ⚠️ TRÊS NÍVEIS, UM CONTEÚDO: `high` ganha tudo; `medium` (toque, pouca CPU
// ou memória) perde a luz que segue o ponteiro e a paralaxe; `low` (movimento
// reduzido) fica estático, com as caixas já no estado que importa (abertas).
// O nível decide o GESTO, nunca o que se compra.
//
// ⚠️ SÓ `transform`, `opacity` e variáveis CSS que viram transform. A luz
// global anda uma FOLHA de reflexo por `translate`, nunca repinta gradiente.
//
// ⚠️ O ESCOPO É O ELEMENTO DO TEMA (`gsap.context(…, root)`): o site roda
// dentro da aplicação da Freelandoo, e seletor solto pegaria a plataforma.

import { useEffect } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

import { DUR, registerEase, type Tier } from "./tokens"

function detectTier(): Tier {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "low"
  const nav = navigator as Navigator & { deviceMemory?: number }
  const coarse = window.matchMedia("(pointer: coarse)").matches
  const weak = (nav.hardwareConcurrency || 8) <= 4 || (nav.deviceMemory || 8) <= 4
  return coarse || weak ? "medium" : "high"
}

export default function Motion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".tpl-pinkora")
    if (!root) return
    const tier = detectTier()
    root.dataset.tier = tier
    if (tier === "low") {
      root.removeAttribute("data-motion")
      return
    }

    gsap.registerPlugin(ScrollTrigger)
    const ease = registerEase()

    const ctx = gsap.context(() => {
      // a peça entra
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        const kind = el.dataset.reveal || "up"
        const from: gsap.TweenVars =
          kind === "clip"
            ? { clipPath: "inset(0 0 100% 0)" }
            : kind === "left"
              ? { x: -32, opacity: 0 }
              : kind === "scale"
                ? { scale: 0.94, opacity: 0 }
                : kind === "fade"
                  ? { opacity: 0 }
                  : { y: 26, opacity: 0 }
        const to: gsap.TweenVars =
          kind === "clip" ? { clipPath: "inset(0 0 0% 0)" } : { x: 0, y: 0, scale: 1, opacity: 1 }
        gsap.fromTo(el, from, {
          ...to,
          duration: DUR.cinematic,
          ease,
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
          // ⚠️ MARCA ANTES DE LIMPAR: limpo o `clip-path` inline, a regra-portão do
          // CSS (`[data-reveal="clip"]` recortado) esconderia o título DE NOVO —
          // foi assim que o Statement e o herói da coleção sumiam depois de entrar.
          onComplete: () => {
            el.dataset.revealed = "1"
            gsap.set(el, { clearProps: el.hasAttribute("data-depth") ? "clipPath" : "transform,clipPath" })
          },
        })
      })

      // a manchete entra linha a linha (as linhas já vêm quebradas à mão)
      gsap.utils.toArray<HTMLElement>("[data-lines]").forEach((el) => {
        gsap.fromTo(
          el.querySelectorAll(":scope > span > span"),
          { yPercent: 110 },
          { yPercent: 0, duration: 1.1, ease, stagger: 0.09, delay: 0.1 },
        )
      })

      // a peça tem fundo — paralaxe mínima por plano (só high)
      if (tier === "high") {
        gsap.utils.toArray<HTMLElement>("[data-depth]").forEach((el) => {
          const d = parseFloat(el.dataset.depth || "0")
          gsap.to(el, {
            yPercent: d * -30,
            ease: "none",
            scrollTrigger: { trigger: el.closest("section") || el, start: "top bottom", end: "bottom top", scrub: true },
          })
        })
      }

      // a tampa abre conforme a seção passa (o estado sem JS é aberto: CSS)
      // ⚠️ fora das cenas coreografadas (`.is-scrolly`): lá a tampa já tem dono,
      // e dois tweens na mesma variável fariam a tampa tremer.
      gsap.utils.toArray<HTMLElement>("[data-lid-scrub]").filter((el) => !el.closest(".is-scrolly")).forEach((el) => {
        gsap.fromTo(
          el,
          { "--pk-lid": 0 },
          {
            "--pk-lid": 1,
            ease: "none",
            scrollTrigger: { trigger: el, start: "top 82%", end: "center 48%", scrub: 0.6 },
          },
        )
      })
    }, root)

    // ── a peça responde: tilt por delegação (um ouvinte só) ──────────────────
    // ── e a luz global: UMA fonte, a mesma direção para todas as caixas ─────
    const fine = window.matchMedia("(pointer: fine)").matches
    let raf = 0
    let lightRaf = 0
    let current: HTMLElement | null = null
    let lx = 0.5
    let ly = 0.3
    let tx = 0.5
    let ty = 0.3

    const light = () => {
      lx += (tx - lx) * 0.08
      ly += (ty - ly) * 0.08
      root.style.setProperty("--lx", lx.toFixed(3))
      root.style.setProperty("--ly", ly.toFixed(3))
      lightRaf = Math.abs(tx - lx) > 0.002 || Math.abs(ty - ly) > 0.002 ? requestAnimationFrame(light) : 0
    }

    const onMove = (e: PointerEvent) => {
      if (tier === "high") {
        tx = e.clientX / window.innerWidth
        ty = e.clientY / window.innerHeight
        if (!lightRaf) lightRaf = requestAnimationFrame(light)
      }
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-tilt]") || null
      if (current && current !== el) reset(current)
      current = el
      if (!el) return
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        const px = Math.max(-0.5, Math.min(0.5, (e.clientX - r.left) / r.width - 0.5))
        const py = Math.max(-0.5, Math.min(0.5, (e.clientY - r.top) / r.height - 0.5))
        // ±6° em Y, ±4° em X — a LUZ deve ser mais perceptível que a rotação
        el.style.setProperty("--ry", `${(px * 12).toFixed(2)}deg`)
        el.style.setProperty("--rx", `${(-py * 8).toFixed(2)}deg`)
      })
    }
    const reset = (el: HTMLElement) => {
      el.style.removeProperty("--ry")
      el.style.removeProperty("--rx")
    }
    const onLeave = () => {
      if (current) reset(current)
      current = null
    }
    if (fine) {
      root.addEventListener("pointermove", onMove, { passive: true })
      root.addEventListener("pointerleave", onLeave)
    }

    // fontes chegam depois: as medidas das cenas presas precisam de recálculo
    const fontsReady = (document as Document & { fonts?: FontFaceSet }).fonts?.ready
    fontsReady?.then(() => ScrollTrigger.refresh())

    return () => {
      cancelAnimationFrame(raf)
      cancelAnimationFrame(lightRaf)
      root.removeEventListener("pointermove", onMove)
      root.removeEventListener("pointerleave", onLeave)
      ctx.revert()
    }
  }, [])

  return null
}
