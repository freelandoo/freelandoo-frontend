"use client"

import { useEffect, useLayoutEffect, useRef, useState, useMemo } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { MACHINES, type MachineTheme } from "./tokens"
import { useMachinesCatalog } from "./use-machines-catalog"
import { MachinePanel } from "./machine-panel"

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect

/**
 * Merge backend catalog colors over static seed so the UI always has content
 * even before the API responds (SSR-safe fallback).
 */
function useDynamicMachines(): MachineTheme[] {
  const { machines: catalog } = useMachinesCatalog()

  return useMemo(() => {
    if (catalog.length === 0) return MACHINES // fallback to seed

    // Build lookup by slug for O(1) merge
    const bySlug = new Map(catalog.map((c) => [c.slug, c]))

    return MACHINES.map((seed) => {
      const remote = bySlug.get(seed.id)
      if (!remote) return seed

      return {
        ...seed,
        name: remote.name || seed.name,
        colors: {
          from: remote.color_from || seed.colors.from,
          to: remote.color_to || seed.colors.to,
          glow: remote.color_glow || seed.colors.glow,
          ring: remote.color_ring || seed.colors.ring,
          accent: remote.color_accent || seed.colors.accent,
          text: remote.color_text || seed.colors.text,
        },
      }
    })
  }, [catalog])
}

export function HorizontalMachinesSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const panelsRef = useRef<HTMLDivElement[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  const machines = useDynamicMachines()

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  useIsomorphicLayoutEffect(() => {
    if (isMobile) return

    const section = sectionRef.current
    const track = trackRef.current
    if (!section || !track) return

    gsap.registerPlugin(ScrollTrigger)

    const ctx = gsap.context(() => {
      const total = machines.length
      const distance = track.scrollWidth - window.innerWidth

      const tween = gsap.to(track, {
        x: () => -distance,
        ease: "none",
      })

      const trigger = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: () => `+=${distance}`,
        pin: true,
        scrub: 1,
        animation: tween,
        snap: {
          snapTo: (value) => {
            const step = 1 / (total - 1)
            return Math.round(value / step) * step
          },
          duration: { min: 0.2, max: 0.6 },
          delay: 0,
          ease: "power2.inOut",
        },
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const i = Math.round(self.progress * (total - 1))
          setActiveIndex(i)
        },
      })

      return () => {
        trigger.kill()
      }
    }, section)

    return () => ctx.revert()
  }, [isMobile, machines])

  const scrollToIndex = (i: number) => {
    if (isMobile) {
      panelsRef.current[i]?.scrollIntoView({ behavior: "smooth", inline: "start" })
      return
    }
    const trigger = ScrollTrigger.getAll().find(
      (t) => t.trigger === sectionRef.current,
    )
    if (!trigger) return
    const p = i / (machines.length - 1)
    const y = trigger.start + (trigger.end - trigger.start) * p
    window.scrollTo({ top: y, behavior: "smooth" })
  }

  return (
    <section
      ref={sectionRef}
      id="machines"
      className="relative bg-machines-dark"
      style={{ height: isMobile ? "auto" : "100vh" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 transition-colors duration-700"
        style={{
          background: `radial-gradient(ellipse at 50% 40%, ${machines[activeIndex].colors.glow}, transparent 70%)`,
          opacity: 0.35,
        }}
      />

      <div className="pointer-events-none absolute inset-x-0 top-6 z-30 flex justify-center md:top-8">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-4 py-2 backdrop-blur-md">
          {machines.map((m, i) => (
            <button
              key={m.id}
              onClick={() => scrollToIndex(i)}
              className="group flex items-center justify-center"
              aria-label={`Ir para ${m.name}`}
            >
              <span
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  background:
                    i === activeIndex
                      ? `linear-gradient(90deg, ${m.colors.from}, ${m.colors.to})`
                      : "rgba(255,255,255,0.2)",
                  width: i === activeIndex ? 32 : 8,
                  boxShadow:
                    i === activeIndex ? `0 0 14px ${m.colors.glow}` : "none",
                }}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-30 flex justify-center text-[10px] uppercase tracking-[0.3em] text-white/40 md:text-xs">
        <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 backdrop-blur">
          {String(activeIndex + 1).padStart(2, "0")} / {String(machines.length).padStart(2, "0")}
          <span className="mx-2 text-white/20">—</span>
          <span className="text-white/70">{machines[activeIndex].name}</span>
        </span>
      </div>

      {isMobile ? (
        <div className="snap-x-mandatory flex w-full snap-x overflow-x-auto scrollbar-hide">
          {machines.map((machine, i) => (
            <div
              key={machine.id}
              ref={(el) => {
                if (el) panelsRef.current[i] = el
              }}
              className="w-screen shrink-0 snap-start"
            >
              <MachinePanel machine={machine} isActive={i === activeIndex} />
            </div>
          ))}
        </div>
      ) : (
        <div className="relative h-screen w-full overflow-hidden">
          <div
            ref={trackRef}
            className="flex h-screen"
            style={{ width: `${machines.length * 100}vw`, willChange: "transform" }}
          >
            {machines.map((machine, i) => (
              <div
                key={machine.id}
                ref={(el) => {
                  if (el) panelsRef.current[i] = el
                }}
                className="h-screen w-screen shrink-0"
              >
                <MachinePanel machine={machine} isActive={i === activeIndex} />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
