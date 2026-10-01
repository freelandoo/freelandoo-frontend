"use client"

// A CAMADA DE MOVIMENTO — GSAP + ScrollTrigger, escopada no elemento do tema.
//
// Todo gesto pertence a um de quatro verbos, e é isso que impede a página de
// virar coleção de efeitos:
//
//   a peça entra       [data-reveal]       reveal mascarado / deslizado
//   a peça tem fundo   [data-depth]        planos em velocidades diferentes
//   a peça responde    [data-tilt]         tilt ±5/±7°, reflexo e sombra
//   a coleção se abre  [data-fan] / [data-runway]  leque e passarela
//
// ⚠️ TRÊS NÍVEIS DE APARELHO (`data-tier` no elemento do tema): `high` ganha
// tudo, `medium` (pouca CPU/memória ou toque) perde blur e paralaxe pesada,
// `low` (movimento reduzido) fica com layout estático legível. TODOS recebem
// o mesmo conteúdo — o nível decide o gesto, nunca o que se compra.
//
// ⚠️ SÓ `transform` E `opacity` (e variáveis CSS que viram transform). Nada
// que custe layout por quadro, e nada animado numa camada do tamanho da
// janela: o fundo é pintado uma vez.
//
// ⚠️ O ESCOPO É O ELEMENTO DO TEMA (`gsap.context(…, root)`): o site roda
// dentro da aplicação da Freelandoo, e seletor solto capturaria elementos da
// plataforma.

import { useEffect } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

type Tier = "high" | "medium" | "low"

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
    const desktop = window.matchMedia("(min-width: 1024px)").matches

    const ctx = gsap.context(() => {
      // a peça entra
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        const kind = el.dataset.reveal || "up"
        const from: gsap.TweenVars =
          kind === "clip"
            ? { clipPath: "inset(0 0 100% 0)", y: 0 }
            : kind === "left"
              ? { x: -36, opacity: 0 }
              : kind === "scale"
                ? { scale: 0.92, opacity: 0 }
                : { y: 28, opacity: 0 }
        const to: gsap.TweenVars =
          kind === "clip" ? { clipPath: "inset(0 0 0% 0)" } : { x: 0, y: 0, scale: 1, opacity: 1 }
        gsap.fromTo(el, from, {
          ...to,
          duration: 0.9,
          ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
          onComplete: () => {
            if (!el.hasAttribute("data-depth")) gsap.set(el, { clearProps: "transform,clipPath" })
          },
        })
      })

      // a manchete entra linha a linha (as linhas já vêm quebradas à mão)
      gsap.utils.toArray<HTMLElement>("[data-lines]").forEach((el) => {
        gsap.fromTo(el.querySelectorAll(":scope > span > span"), { yPercent: 110, y: 0 }, {
          yPercent: 0,
          y: 0,
          duration: 1.1,
          ease: "expo.out",
          stagger: 0.08,
          delay: 0.1,
        })
      })

      // a peça tem fundo — paralaxe por plano (só high)
      if (tier === "high") {
        gsap.utils.toArray<HTMLElement>("[data-depth]").forEach((el) => {
          const d = parseFloat(el.dataset.depth || "0")
          gsap.to(el, {
            yPercent: d * -40,
            ease: "none",
            scrollTrigger: { trigger: el.closest("section") || el, start: "top bottom", end: "bottom top", scrub: true },
          })
        })
      }

      // o leque abre com a rolagem: UMA variável CSS, o transform é do CSS
      gsap.utils.toArray<HTMLElement>("[data-fan]").forEach((el) => {
        gsap.fromTo(
          el,
          { "--open": 0 },
          {
            "--open": 1,
            ease: "none",
            scrollTrigger: { trigger: el, start: "top 80%", end: "center 45%", scrub: 0.6 },
          },
        )
      })

      // a passarela: no computador o scroll vertical anda o trilho na horizontal.
      // No celular ela continua rolagem nativa com snap — sem sequestro.
      if (desktop) {
        gsap.utils.toArray<HTMLElement>("[data-runway]").forEach((section) => {
          const track = section.querySelector<HTMLElement>("[data-runway-track]")
          if (!track) return
          section.classList.add("is-pinned")
          const dist = () => Math.max(0, track.scrollWidth - window.innerWidth + 64)
          gsap.to(track, {
            x: () => -dist(),
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top top",
              end: () => `+=${dist()}`,
              pin: true,
              scrub: 0.8,
              invalidateOnRefresh: true,
              onUpdate: () => {
                const mid = window.innerWidth / 2
                track.querySelectorAll<HTMLElement>("[data-runway-item]").forEach((it) => {
                  const r = it.getBoundingClientRect()
                  const f = Math.min(1, Math.abs(r.left + r.width / 2 - mid) / mid)
                  it.style.setProperty("--focus", String(1 - f))
                })
              },
            },
          })
        })
      }
    }, root)

    // a peça responde — tilt + reflexo por delegação (um ouvinte só)
    let raf = 0
    let current: HTMLElement | null = null
    const fine = window.matchMedia("(pointer: fine)").matches
    const onMove = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-tilt]") || null
      if (current && current !== el) reset(current)
      current = el
      if (!el) return
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        const px = (e.clientX - r.left) / r.width - 0.5
        const py = (e.clientY - r.top) / r.height - 0.5
        el.style.setProperty("--ry", `${(px * 14).toFixed(2)}deg`)
        el.style.setProperty("--rx", `${(-py * 10).toFixed(2)}deg`)
        el.style.setProperty("--mx", `${((px + 0.5) * 100).toFixed(1)}%`)
        el.style.setProperty("--my", `${((py + 0.5) * 100).toFixed(1)}%`)
        el.style.setProperty("--mag-x", `${(px * 10).toFixed(1)}px`)
        el.style.setProperty("--mag-y", `${(py * 10).toFixed(1)}px`)
      })
    }
    const reset = (el: HTMLElement) => {
      ;["--ry", "--rx", "--mag-x", "--mag-y"].forEach((k) => el.style.removeProperty(k))
    }
    const onLeave = () => {
      if (current) reset(current)
      current = null
    }
    if (fine) {
      root.addEventListener("pointermove", onMove, { passive: true })
      root.addEventListener("pointerleave", onLeave)
    }

    // fontes chegam depois: as medidas da passarela precisam de recálculo
    const fontsReady = (document as Document & { fonts?: FontFaceSet }).fonts?.ready
    fontsReady?.then(() => ScrollTrigger.refresh())

    return () => {
      cancelAnimationFrame(raf)
      root.removeEventListener("pointermove", onMove)
      root.removeEventListener("pointerleave", onLeave)
      ctx.revert()
    }
  }, [])

  return null
}
