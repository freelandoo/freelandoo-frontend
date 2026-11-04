"use client"

// features/meu-mundo/ui/rewards/gain-layer.tsx — mm3d-60: o ganho cotidiano na tela.
//
// NÚMEROS FLUTUANTES (regra do Alex): só o valor — "+50", "+0,04", "−5" — sem
// placa, sem nome do atributo, sem ícone. A COR identifica a categoria
// (FLOAT_COLOR; vitais pelo efeito, FLOAT_TONE). Saem em coluna acima da cabeça do
// personagem, um depois do outro, e acompanham a câmera (âncora projetada pela
// cena, engine/screen-anchor.ts — lida só enquanto o efeito vive).
// DROPS de item: esses SIM têm placa — medalhão com a arte, nome, quantidade e
// raridade, moldura na cor da raridade, faíscas. Ao lado do personagem (nunca
// em cima dele), no máximo 4 (+ "mais N").
// Tudo puramente local e decorativo: os valores são o delta que o servidor
// gravou no recibo; nada bloqueia o toque (pointer-events: none).
// Leitor de tela: uma linha com nome + valor (a camada visual é aria-hidden).

import { useEffect, useRef, useState, type CSSProperties } from "react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { screenAnchor } from "../../engine/screen-anchor"
import { FLOAT_COLOR, type FloatKind } from "../kit/steam/steam-tokens"
import { currentUiFx } from "../kit/steam/fx-tier"
import { RARITY, type Rarity } from "../kit/aether-tokens"
import { ItemImage, type ItemCategory } from "../kit/item-image"
import { archivo, cinzel, teko } from "../status/evo-skin"
import g from "./gain-layer.module.css"

export interface FloatNum {
  key: string
  kind: FloatKind
  /** Cor no lugar da da categoria. */
  color?: string
  text: string
  /** Só para o leitor de tela (nunca aparece). */
  label: string
}
export interface DropItem {
  id: string
  qty: number
  rarity: Rarity
  name: string
}

export const MAX_NUMS = 6
export const MAX_PLATES = 4
const NUM_STEP = 110
const NUM_LIFE = 1300
const PLATE_STEP = 240
const PLATE_LIFE = 2400
const SLOT_X = [0, -18, 16, -10, 12, -4]

/** Categoria do item pelo id do catálogo (só escolhe o desenho do medalhão). */
export function dropCategory(id: string): ItemCategory {
  if (id === "coins") return "coins"
  if (/^(espada|cajado|machado)_/.test(id)) return "weapon"
  if (/^(colete|couraca)_/.test(id)) return "armor"
  if (/^(relogio|luvas|amuleto)_/.test(id)) return "accessory"
  if (/^receita_/.test(id)) return "recipe"
  if (/^pintura_/.test(id)) return "cosmetic"
  if (/^cristal_/.test(id)) return "quest"
  return "material"
}

function sparks(n: number, radius: number) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + (i % 2) * 0.35
    const d = radius * (0.75 + ((i * 37) % 10) / 20)
    return { sx: `${Math.round(Math.cos(a) * d)}px`, sy: `${Math.round(Math.sin(a) * d)}px` }
  })
}

export function GainLayer({ nums, drops, more, onDone }: { nums: FloatNum[]; drops: DropItem[]; more: number; onDone: () => void }) {
  const t = useTranslations("MeuMundo")
  const root = useRef<HTMLDivElement | null>(null)
  const plates = useRef<HTMLDivElement | null>(null)
  const done = useRef(onDone)
  useEffect(() => {
    done.current = onDone
  }, [onDone])
  const [fx] = useState(currentUiFx)

  // segue a cabeça do personagem enquanto o efeito vive (um rAF só, depois para)
  const nCount = nums.length
  const dCount = drops.length + (more > 0 ? 1 : 0)
  useEffect(() => {
    const el = root.current
    if (!el) return
    let raf = 0
    // lado das placas: à direita do personagem, senão à esquerda, senão no alto
    // da tela, centralizadas (tela estreita) — nunca em cima dele
    let side: "right" | "left" | "top" | null = null
    const tick = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      const a = screenAnchor()
      const x = Math.min(w - 36, Math.max(36, a ? a.x : w / 2))
      const y = Math.min(h - 40, Math.max(150, a ? a.y : h * 0.42))
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`
      const pl = plates.current
      if (pl) {
        if (!side) {
          const pw = pl.offsetWidth + 80
          side = x + pw <= w - 8 ? "right" : x - pw >= 8 ? "left" : "top"
          pl.dataset.side = side
        }
        if (side === "top") {
          // personagem no alto da tela: as placas vão para baixo (não encostam nos números)
          const py = y < h * 0.42 ? h * 0.74 : Math.max(70, h * 0.12)
          pl.style.translate = `calc(${Math.round(w / 2 - x)}px - 50%) ${Math.round(py - y)}px`
        }
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
    const life = Math.max(nCount ? NUM_LIFE + (nCount - 1) * NUM_STEP : 0, dCount ? (dCount - 1) * PLATE_STEP + PLATE_LIFE + 300 : 0) + 80
    const end = setTimeout(() => done.current(), life)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(end)
    }
  }, [nCount, dCount])

  const rarityLabel = (r: Rarity) => t(RARITY[r].labelKey, RARITY[r].label)
  const spoken = [...nums.map((n) => `${n.text} ${n.label}`), ...drops.map((d) => `×${d.qty} ${d.name}`)].join(", ")

  return (
    <>
      <div className="sr-only" role="status" aria-live="polite">
        {spoken}
      </div>
      <div ref={root} className={g.layer} aria-hidden style={{ transform: "translate3d(-999px,-999px,0)" }}>
        {nums.map((n, i) => {
          const big = n.kind === "xp"
          const d = i * NUM_STEP
          const style = {
            "--c": n.color ?? FLOAT_COLOR[n.kind],
            "--dx": `${SLOT_X[i % SLOT_X.length]}px`,
            "--dy": `calc(${-(nCount - 1 - i)} * var(--row) - 6px)`,
            "--row": "clamp(26px, 3.8vw, 34px)",
            "--d": `${d}ms`,
            animationDelay: `${d}ms`,
            fontSize: big ? "clamp(36px, 6vw, 52px)" : "clamp(28px, 4.6vw, 40px)",
          } as CSSProperties
          return (
            <span key={n.key} className={`${teko.className} ${g.num}`} style={style}>
              {n.text}
              <span className={g.glare}>{n.text}</span>
              {big &&
                fx === "high" &&
                sparks(6, 34).map((p, k) => <span key={k} className={g.spark} style={{ "--sx": p.sx, "--sy": p.sy } as CSSProperties} />)}
            </span>
          )
        })}
        {dCount > 0 && (
          <div ref={plates} className={g.plates} data-side="right">
            {drops.map((it, i) => {
              const r = RARITY[it.rarity] || RARITY.common
              const style = { "--r": r.color, "--d": `${(nCount ? 260 : 0) + i * PLATE_STEP}ms`, "--life": `${PLATE_LIFE}ms` } as CSSProperties
              const n = fx === "low" ? 0 : fx === "high" ? (it.rarity === "common" ? 6 : 10) : 4
              return (
                <div key={it.id} className={`${archivo.className} ${g.plate}`} style={style}>
                  <span className={g.medal}>
                    <span className={g.medalArt}>
                      <ItemImage category={dropCategory(it.id)} rarity={it.rarity} alt="" />
                    </span>
                  </span>
                  {sparks(n, 40).map((p, k) => (
                    <span key={k} className={g.plateSpark} style={{ "--sx": p.sx, "--sy": p.sy, animationDelay: `calc(var(--d) + ${160 + k * 25}ms)` } as CSSProperties} />
                  ))}
                  <span className={g.plateText}>
                    <span className="flex min-w-0 items-baseline">
                      <span className={`${teko.className} ${g.plateQty}`}>×{it.qty}</span>
                      <span className={`${cinzel.className} ${g.plateName}`}>{it.name}</span>
                    </span>
                    {it.rarity !== "common" && <span className={g.plateRarity}>{rarityLabel(it.rarity)}</span>}
                  </span>
                </div>
              )
            })}
            {more > 0 && (
              <div
                className={`${archivo.className} ${g.plate}`}
                style={{ "--r": "#A9A397", "--d": `${(nCount ? 260 : 0) + drops.length * PLATE_STEP}ms`, "--life": `${PLATE_LIFE}ms`, minWidth: 0 } as CSSProperties}
              >
                <span className={g.plateText}>
                  <span className={`${cinzel.className} ${g.plateName}`}>
                    +{more} {t("rewardMore", "mais")}
                  </span>
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
