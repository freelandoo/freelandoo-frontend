"use client"

import { useRef, useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Sparkles } from "lucide-react"
import { FloatingParticles } from "./floating-particles"
import { AnimatedHeadline } from "./animated-headline"

/**
 * Scroll-controlled hero with a background video.
 *
 * Layout:
 * ┌──────────────────────────────────────────────────┐
 * │  <outer wrapper: height = 100vh + scrollDistance> │  ← creates scroll room
 * │  ┌──────────────────────────────────────────────┐ │
 * │  │  <sticky viewport container: h=100vh>        │ │  ← stays pinned
 * │  │  ┌────────────────┬─────────────────────────┐│ │
 * │  │  │  TEXT (left)    │  VIDEO (background)     ││ │
 * │  │  └────────────────┴─────────────────────────┘│ │
 * │  └──────────────────────────────────────────────┘ │
 * └──────────────────────────────────────────────────┘
 *
 * scrollProgress 0→1 maps to video.currentTime 0→duration.
 * Once scroll leaves the outer wrapper, page continues normally.
 */

const VIDEO_SRC = "/hero-video.mp4"
/** Extra scroll height (in vh) to scrub through the video. Larger = slower scrub. */
const SCROLL_VH = 300

export function HeroSection() {
  const outerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoDuration, setVideoDuration] = useState(0)
  const rafId = useRef<number>(0)

  /* ── Wait for video metadata ── */
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onMeta = () => setVideoDuration(v.duration || 0)
    v.addEventListener("loadedmetadata", onMeta)
    if (v.duration) onMeta()
    return () => v.removeEventListener("loadedmetadata", onMeta)
  }, [])

  /* ── Scroll → video.currentTime ── */
  useEffect(() => {
    if (!videoDuration) return

    const update = () => {
      const outer = outerRef.current
      const video = videoRef.current
      if (!outer || !video) return

      const rect = outer.getBoundingClientRect()
      const scrollable = outer.offsetHeight - window.innerHeight
      // How far have we scrolled inside the outer wrapper? 0 at top, 1 at bottom.
      const raw = -rect.top / scrollable
      const progress = Math.max(0, Math.min(1, raw))

      const targetTime = progress * videoDuration
      // Only seek if difference is significant to avoid unnecessary seeks
      if (Math.abs(video.currentTime - targetTime) > 0.02) {
        video.currentTime = targetTime
      }
    }

    const onScroll = () => {
      cancelAnimationFrame(rafId.current)
      rafId.current = requestAnimationFrame(update)
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll() // initial position
    return () => {
      window.removeEventListener("scroll", onScroll)
      cancelAnimationFrame(rafId.current)
    }
  }, [videoDuration])

  return (
    <section
      ref={outerRef}
      className="relative"
      style={{ height: `${SCROLL_VH}vh` }}
    >
      {/* Sticky viewport */}
      <div className="sticky top-0 isolate flex h-[100svh] items-center overflow-hidden bg-[#05060a]">
        {/* ── Video background ── */}
        <video
          ref={videoRef}
          src={VIDEO_SRC}
          muted
          playsInline
          preload="auto"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          style={{ opacity: 0.75 }}
        />

        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#05060a]/90 via-[#05060a]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#05060a] via-transparent to-[#05060a]/40" />

        {/* Particles */}
        <FloatingParticles count={20} color="rgba(255,220,120,0.4)" />

        {/* ── Content — left aligned, compact ── */}
        <div className="container relative z-10 mx-auto px-4 md:px-8">
          <div className="max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white/70 backdrop-blur"
            >
              <Sparkles className="h-3 w-3 text-primary" />
              Sistema de ativação de resultados
            </motion.div>

            <AnimatedHeadline
              className="text-balance text-3xl leading-[1.08] sm:text-4xl md:text-5xl"
              lines={[
                "Você não contrata pessoas.",
                "Você ativa máquinas de resultado.",
              ]}
              highlightIndex={1}
              highlightClassName="bg-gradient-to-r from-primary via-amber-300 to-primary bg-clip-text text-transparent"
            />

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="mt-5 max-w-md text-pretty text-sm text-white/60 md:text-base md:leading-relaxed"
            >
              Views, divulgação, serviços, construção, limpeza e muito mais.
              Escolha uma máquina e encontre quem resolve.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="mt-7 flex flex-col items-start gap-3 sm:flex-row"
            >
              <Link
                href="#machines"
                className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_0_0_1px_rgba(230,184,0,0.4),0_8px_40px_-8px_rgba(230,184,0,0.6)] transition hover:shadow-[0_0_0_1px_rgba(230,184,0,0.8),0_12px_60px_-8px_rgba(230,184,0,0.9)]"
              >
                <span className="relative z-10">Ativar uma máquina</span>
                <ArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              </Link>
              <Link
                href="/search"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white/90 backdrop-blur transition hover:border-white/30 hover:bg-white/10"
              >
                Explorar profissionais
              </Link>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1 }}
              className="mt-5 text-[10px] uppercase tracking-[0.25em] text-white/35"
            >
              Sem burocracia · Sem intermediação · Contato direto
            </motion.p>
          </div>
        </div>
      </div>

      {/* Bottom gradient transition to next section */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#05060a]" />
    </section>
  )
}
