"use client"

// components/portfolio/shorts-viewer.tsx
// Timeline vertical dos CURTOS de UM perfil: abre no vídeo que a pessoa tocou
// na vitrine e rola de um para o outro, sem sair daquele acervo.
//
// ⚠️ A FONTE É A MESMA LISTA QUE A GRADE DESENHA — de propósito. Buscar os
// curtos de novo por uma consulta própria criaria dois lugares decidindo o que
// é curto daquele perfil, e no dia em que discordassem a pessoa veria na
// timeline um vídeo que a vitrine jura não existir (a lição já paga na vitrine
// de posts). Quem abre passa os itens já filtrados, na ordem em que aparecem.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { X, Volume2, VolumeX, Play } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"

export interface ShortItem {
  id: string
  videoUrl: string
  posterUrl?: string | null
  title?: string | null
  description?: string | null
}

interface ShortsViewerProps {
  items: ShortItem[]
  startIndex: number
  onClose: () => void
}

/** Distância (em slides) dentro da qual o <video> é MONTADO. Fora dela fica o
 *  pôster: player montado segura decodificador e banda mesmo pausado, e uma
 *  timeline montaria um por vídeo do acervo inteiro. */
const MOUNT_RADIUS = 1

export function ShortsViewer({ items, startIndex, onClose }: ShortsViewerProps) {
  const t = useTranslations("Shorts")
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const slideRefs = useRef<(HTMLDivElement | null)[]>([])
  const [active, setActive] = useState(startIndex)
  // Som desligado no começo porque autoplay COM áudio é recusado pelo
  // navegador — a escolha da pessoa vale para os próximos vídeos.
  const [muted, setMuted] = useState(true)
  const [paused, setPaused] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // ── posiciona no vídeo tocado ANTES da primeira pintura ─────────────────────
  // ⚠️ Mede a altura REAL do container em vez de assumir 100dvh: no celular a
  // barra do navegador entra e sai, e a conta por dvh erra o alvo por dezenas
  // de pixels — a timeline abriria no meio de dois vídeos.
  useLayoutEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTop = startIndex * el.clientHeight
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted])

  // ── quem está em cena ───────────────────────────────────────────────────────
  // Observer em vez de conta sobre o scrollTop: com snap o navegador ajusta a
  // posição sozinho, e a conta erraria durante o ajuste.
  useEffect(() => {
    const root = scrollerRef.current
    if (!root) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          const idx = Number((e.target as HTMLElement).dataset.index)
          if (Number.isInteger(idx)) { setActive(idx); setPaused(false) }
        }
      },
      { root, threshold: 0.6 },
    )
    slideRefs.current.forEach((el) => { if (el) io.observe(el) })
    return () => io.disconnect()
  }, [items.length, mounted])

  // ── trava a rolagem da página atrás ─────────────────────────────────────────
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [])

  // ── Esc fecha ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const togglePlay = useCallback(() => {
    const el = slideRefs.current[active]?.querySelector("video")
    if (!el) return
    if (el.paused) { void el.play().catch(() => {}); setPaused(false) }
    else { el.pause(); setPaused(true) }
  }, [active])

  if (!mounted) return null

  const body = (
    <div className="fl-root fl-sharp fixed inset-0 z-[120] bg-[#0B0B0D]">
      <div
        ref={scrollerRef}
        className="h-[100dvh] w-full snap-y snap-mandatory overflow-y-auto overscroll-contain"
      >
        {items.map((it, i) => (
          <div
            key={it.id}
            data-index={i}
            ref={(el) => { slideRefs.current[i] = el }}
            className="relative flex h-[100dvh] w-full snap-start items-center justify-center"
          >
            {Math.abs(i - active) <= MOUNT_RADIUS ? (
              <ShortVideo
                src={it.videoUrl}
                poster={it.posterUrl}
                isActive={i === active}
                muted={muted}
                onTap={togglePlay}
              />
            ) : it.posterUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.posterUrl} alt="" className="h-full w-full object-contain" />
            ) : null}

            {(it.title || it.description) && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0B0B0D] via-[#0B0B0D]/70 to-transparent px-4 pb-8 pt-16">
                {it.title && (
                  <p className="font-[family-name:var(--font-anton)] text-lg uppercase leading-tight text-[#F5F1E8]">
                    {it.title}
                  </p>
                )}
                {it.description && (
                  <p className="mt-1 line-clamp-3 whitespace-pre-line text-[13px] leading-snug text-[#d6cfbf]">
                    {it.description}
                  </p>
                )}
              </div>
            )}

            {i === active && paused && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <Play className="h-16 w-16 text-[#F5F1E8]/85 drop-shadow-lg" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Controles — fora do scroller para não rolarem junto. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-3">
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close", "Fechar")}
          className="pointer-events-auto flex h-10 w-10 items-center justify-center border-2 border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D]"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="pointer-events-auto flex items-center gap-2">
          <span className="border-2 border-[#0B0B0D] bg-[#0B0B0D]/70 px-2 py-1 text-[11px] font-black tabular-nums tracking-[0.08em] text-[#F5F1E8]">
            {active + 1}/{items.length}
          </span>
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? t("unmute", "Ligar o som") : t("mute", "Desligar o som")}
            className="flex h-10 w-10 items-center justify-center border-2 border-[#0B0B0D] bg-[#F2B705] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D]"
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  )

  // ⚠️ PORTAL obrigatório: a vitrine vive numa página com cards rotacionados, e
  // um ancestral com `transform` deixa de ser a janela para um filho `fixed` —
  // preso no fluxo, o viewer abriria DENTRO de um card.
  return createPortal(body, document.body)
}

/** Um vídeo da timeline. Só nasce perto da cena e é solto ao sair. */
function ShortVideo({
  src, poster, isActive, muted, onTap,
}: {
  src: string
  poster?: string | null
  isActive: boolean
  muted: boolean
  onTap: () => void
}) {
  const ref = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (isActive) {
      void el.play().catch(() => {})
    } else {
      el.pause()
      // Volta ao início: reentrar num vídeo pela metade parece defeito.
      try { el.currentTime = 0 } catch { /* noop */ }
    }
  }, [isActive])

  // ⚠️ Desmontar tira o elemento do DOM mas NÃO devolve o decodificador nem o
  // que já baixou. O elemento é capturado na variável porque, quando a limpeza
  // roda, o React já zerou o ref — ler dali devolveria null e a limpeza não
  // faria nada, em silêncio.
  useEffect(() => {
    const el = ref.current
    return () => {
      if (!el) return
      try {
        el.pause()
        el.removeAttribute("src") // string vazia dispararia request para o HTML
        el.load()
      } catch { /* noop */ }
    }
  }, [])

  return (
    <video
      ref={ref}
      src={src}
      poster={poster || undefined}
      className="h-full w-full object-contain"
      playsInline
      loop
      muted={muted}
      preload={isActive ? "auto" : "metadata"}
      onClick={onTap}
    />
  )
}
