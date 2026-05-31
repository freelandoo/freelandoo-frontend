"use client"

// Player de música anexada (metadado — não queimada na mídia).
// Toca uma faixa da biblioteca (mig 107/108) sincronizada com o estado do card:
// começa no offset escolhido (start_ms), reinicia no offset ao dar loop, e
// pausa quando o card sai de cena / é pausado / está mudo.
//
// Nota de autoplay: navegadores bloqueiam play() com som sem gesto do usuário.
// Em stories isso é ok (o usuário tocou para abrir). No feed/bees a faixa só
// soa após uma interação (tap de unmute) — por isso `muted` controla o som.

import { useEffect, useRef } from "react"

interface TrackAudioProps {
  /** URL pública da faixa (R2). Se nula, nada toca. */
  src: string | null | undefined
  /** Offset de início em ms (recorte escolhido no editor). */
  startMs?: number
  /** Card visível/ativo — fora disso a faixa pausa. */
  active: boolean
  /** Pausa manual (ex.: story pausada). */
  paused?: boolean
  /** Sem som (ex.: feed antes do unmute). */
  muted?: boolean
}

export function TrackAudio({ src, startMs = 0, active, paused = false, muted = false }: TrackAudioProps) {
  const ref = useRef<HTMLAudioElement | null>(null)
  const startSec = Math.max(0, startMs / 1000)

  // Reposiciona no offset quando a faixa muda.
  useEffect(() => {
    const a = ref.current
    if (!a) return
    try { a.currentTime = startSec } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  // Liga/desliga conforme estado do card.
  useEffect(() => {
    const a = ref.current
    if (!a) return
    a.muted = muted
    if (active && !paused) {
      a.play().catch(() => { /* autoplay bloqueado — espera gesto */ })
    } else {
      a.pause()
    }
  }, [active, paused, muted, src])

  // Ao dar loop, volta ao offset (em vez de 0) para repetir o mesmo recorte.
  const onTimeUpdate = () => {
    const a = ref.current
    if (!a || !a.duration) return
    if (a.currentTime >= a.duration - 0.15 && startSec > 0) {
      try { a.currentTime = startSec } catch { /* ignore */ }
    }
  }

  if (!src) return null
  return (
    <audio
      ref={ref}
      src={src}
      loop
      preload="auto"
      playsInline
      className="hidden"
      onLoadedMetadata={() => { const a = ref.current; if (a) { try { a.currentTime = startSec } catch { /* ignore */ } } }}
      onTimeUpdate={onTimeUpdate}
    />
  )
}
