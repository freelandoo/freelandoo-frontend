"use client"

// A DETAIL LENS — a inspeção macro da página do produto.
//
// Em vez do zoom genérico de loja, uma lente quadrada editorial segue o
// ponteiro e mostra a foto 2,6× maior: charms, pedras, pintura, acabamento.
// Marcador "DETAIL / 01".
//
// ⚠️ SÓ COM PONTEIRO FINO E COM FOTO DE VERDADE: no toque não existe "passar
// por cima", e ampliar um placeholder desenhado não mostraria detalhe nenhum.
// Sem essas duas condições o componente devolve só os filhos.
//
// ⚠️ A LENTE ANDA POR `transform` (escrito no DOM, nunca em estado do React),
// dentro de um quadrado de 200px — nunca uma camada do tamanho da tela.

import { useEffect, useRef, useState } from "react"

const ZOOM = 2.6
const SIZE = 200

export default function DetailLens({
  src,
  index = 1,
  children,
}: {
  src: string | null
  index?: number
  children: React.ReactNode
}) {
  const box = useRef<HTMLDivElement>(null)
  const lens = useRef<HTMLDivElement>(null)
  const [able, setAble] = useState(false)
  const [on, setOn] = useState(false)

  useEffect(() => {
    setAble(!!src && window.matchMedia("(pointer: fine)").matches)
  }, [src])

  if (!able || !src) return <>{children}</>

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const b = box.current
    const l = lens.current
    if (!b || !l) return
    const r = b.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    l.style.transform = `translate3d(${x - SIZE / 2}px, ${y - SIZE / 2}px, 0)`
    // a cópia ampliada usa o MESMO enquadramento (`object-fit: cover`) da foto
    // de baixo — esticar um fundo distorceria foto de outra proporção
    const img = l.querySelector<HTMLImageElement>("img")
    if (img) {
      img.style.width = `${r.width * ZOOM}px`
      img.style.height = `${r.height * ZOOM}px`
      img.style.transform = `translate3d(${-(x * ZOOM - SIZE / 2)}px, ${-(y * ZOOM - SIZE / 2)}px, 0)`
    }
  }

  return (
    <div
      ref={box}
      className={`pk-lens ${on ? "is-on" : ""}`}
      onPointerEnter={() => setOn(true)}
      onPointerLeave={() => setOn(false)}
      onPointerMove={move}
      data-cursor="DETAIL"
    >
      {children}
      <div ref={lens} className="pk-lens__glass" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" decoding="async" />
        <span className="pk-mono">DETAIL / {String(index).padStart(2, "0")}</span>
      </div>
    </div>
  )
}
