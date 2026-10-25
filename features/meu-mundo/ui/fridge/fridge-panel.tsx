"use client"

// features/meu-mundo/ui/fridge/fridge-panel.tsx — a GELADEIRA aberta (mm3d-28).
//
// A porta abre na cena (engine/fridge-door.ts) e daqui sai uma prateleira
// giratória: cards verticais em ARCO (referência: o carrossel do EVO
// Brazil/Cat demon), o do centro destacado e os dos lados em perspectiva.
// Três níveis: categorias → itens → ficha (Comer/Beber/Tomar). Thumbnails
// pré-renderizadas (public/meu-mundo/geladeira/v1), sem 3D por card; só os
// cards perto do centro ficam montados; por quadro mudam só transform e
// opacity (transição do CSS). A cor fria do vão aceso + o dourado do jogo —
// o magenta do EVO fica só no neon do card escolhido.
//
// Controles: arrastar (celular), setas/clique (computador), ←/→ Enter Esc
// Backspace (teclado). Enquanto aberta, quem monta bloqueia o andar do
// personagem local (só ele: os outros jogadores não veem nada disto).

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { ChevronLeft, ChevronRight, Loader2, Refrigerator, Utensils, X } from "lucide-react"
import type { FridgeStock, LifeCharacter, LifeItem } from "../../types"
import { EvoButton } from "../hud/hud-kit"
import { Chamfer, EVO, archivo, kanji, teko } from "../status/evo-skin"
import { hoursText, itemName } from "../status/status-pages"
import { categories, effectsOf, mealFit, thumbOf, verbOf, type CategoryCard, type Effect, type FridgeCategory } from "./fridge-logic"

type Tr = (key: string, fallback: string) => string

const ICE = "#bfe6ff"
const ICE_DIM = "rgba(191,230,255,0.35)"

export const CATEGORY_LABEL: Record<FridgeCategory, [string, string]> = {
  meals: ["frCatMeals", "Refeições"],
  snacks: ["frCatSnacks", "Lanches"],
  drinks: ["frCatDrinks", "Bebidas"],
  supplements: ["frCatSupplements", "Suplementos"],
  medicine: ["frCatMedicine", "Remédios"],
  stimulants: ["frCatStimulants", "Estimulantes"],
  anabolic: ["frCatAnabolic", "Anabolizantes"],
}

function effectText(e: Effect, t: Tr) {
  const n = (v = 0) => `${v > 0 ? "+" : ""}${v}`
  switch (e.key) {
    case "satiety":
      return t("frEffSatiety", "{n} saciedade").replace("{n}", n(e.value))
    case "energy":
      return t("frEffEnergy", "{n} energia").replace("{n}", n(e.value))
    case "mood":
      return t("frEffMood", "{n} humor").replace("{n}", n(e.value))
    case "stress":
      return t("frEffStress", "{n} estresse").replace("{n}", n(e.value))
    case "good":
      return t("mkGood", "faz bem")
    case "bad":
      return t("mkBad", "faz mal")
    case "toxic":
      return t("mkTox", "tóxico")
    case "lasts":
      return t("mkLasts", "dura {h}").replace("{h}", hoursText(e.value ?? 0))
  }
}

const toneColor = (tone: Effect["tone"]) => (tone === "good" ? EVO.bom : tone === "bad" ? "#ff6b78" : EVO.douradoClaro)

export interface FridgePanelProps {
  items: LifeItem[]
  stock: FridgeStock
  character: LifeCharacter | null
  /** item sendo comido agora (esperando a sala) */
  pending: string | null
  notice: string | null
  compact: boolean
  t: Tr
  onEat: (item: LifeItem) => void
  onClose: () => void
}

type Level = { lv: "cats" } | { lv: "items"; cat: FridgeCategory } | { lv: "item"; cat: FridgeCategory; item: string }

export default function FridgePanel({ items, stock, character, pending, notice, compact, t, onEat, onClose }: FridgePanelProps) {
  const cats = useMemo(() => categories(items, stock), [items, stock])
  const [level, setLevel] = useState<Level>({ lv: "cats" })
  const [catSel, setCatSel] = useState(0)
  const [itemSel, setItemSel] = useState(0)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const cat: CategoryCard | null = level.lv === "cats" ? null : (cats.find((c) => c.id === level.cat) ?? null)
  const item = level.lv === "item" ? (items.find((i) => i.id === level.item) ?? null) : null

  const back = useCallback(() => {
    if (level.lv === "item") setLevel({ lv: "items", cat: level.cat })
    else if (level.lv === "items") setLevel({ lv: "cats" })
    else onClose()
  }, [level, onClose])
  const openCat = useCallback(
    (i: number) => {
      const c = cats[i]
      if (!c) return
      setCatSel(i)
      setItemSel(0)
      setLevel({ lv: "items", cat: c.id })
    },
    [cats],
  )
  const openItem = useCallback(
    (i: number) => {
      const it = cat?.items[i]
      if (!it || !cat) return
      setItemSel(i)
      setLevel({ lv: "item", cat: cat.id, item: it.id })
    },
    [cat],
  )
  const eat = useCallback(() => {
    if (item && (stock[item.id] ?? 0) > 0 && !pending) onEat(item)
  }, [item, stock, pending, onEat])

  // Teclado: captura antes do jogo e da gaveta (o andar já está bloqueado).
  const keys = useRef({ back, openCat, openItem, eat, level, catSel, itemSel, cats: cats.length, items: cat?.items.length ?? 0 })
  useEffect(() => {
    keys.current = { back, openCat, openItem, eat, level, catSel, itemSel, cats: cats.length, items: cat?.items.length ?? 0 }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = keys.current
      let handled = true
      if (e.key === "Escape" || e.key === "Backspace") k.back()
      else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const d = e.key === "ArrowLeft" ? -1 : 1
        if (k.level.lv === "cats") setCatSel((s) => Math.max(0, Math.min(k.cats - 1, s + d)))
        else if (k.level.lv === "items") setItemSel((s) => Math.max(0, Math.min(k.items - 1, s + d)))
      } else if (e.key === "Enter" || e.key === " ") {
        if (k.level.lv === "cats") k.openCat(k.catSel)
        else if (k.level.lv === "items") k.openItem(k.itemSel)
        else k.eat()
      } else handled = /^Key[WASDEMQ]$/.test(e.code) // não chegam ao jogo nem à gaveta
      if (handled) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [])

  const cardW = compact ? 150 : 200
  const cardH = Math.round(cardW * 1.48)
  const spacing = compact ? 128 : 190
  const crumb = cat ? t(CATEGORY_LABEL[cat.id][0], CATEGORY_LABEL[cat.id][1]) : t("frChooseCategory", "Escolha a categoria")

  return (
    <div
      className={`${archivo.className} fl-sharp absolute inset-0 z-20 flex flex-col justify-end`}
      style={{ background: "linear-gradient(180deg, rgba(8,7,11,0) 0%, rgba(8,7,11,0.25) 35%, rgba(8,10,16,0.82) 100%)" }}
      // A interface engole o toque: nada atravessa para o jogo.
      onPointerDown={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mm-fridge-title"
    >
      <div
        className="flex min-h-0 flex-col"
        style={{
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
          paddingLeft: "max(12px, env(safe-area-inset-left))",
          paddingRight: "max(12px, env(safe-area-inset-right))",
          transform: shown ? "translateY(0)" : "translateY(48px)",
          opacity: shown ? 1 : 0,
          transition: "transform 420ms cubic-bezier(.2,.8,.2,1), opacity 300ms ease-out",
        }}
      >
        {/* cabeçalho: título, onde estou e fechar */}
        <div className="mx-auto flex w-full max-w-[980px] items-end justify-between gap-3 pb-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2" style={{ color: ICE }}>
              <Refrigerator className="h-5 w-5 shrink-0" />
              <span className={`${archivo.className} text-[11px] font-semibold uppercase tracking-[0.28em]`}>{t("frEyebrow", "Geladeira")}</span>
            </div>
            <h2 id="mm-fridge-title" className={`${teko.className} line-clamp-2 ${compact ? "text-[26px]" : "text-[32px]"} font-bold uppercase leading-[0.95]`} style={{ color: EVO.branco }}>
              {item ? itemName(item, t) : crumb}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {level.lv !== "cats" && (
              // No celular só o ícone: o nome do item precisa do espaço.
              <EvoButton variant="ghost" size="sm" onClick={back} icon={<ChevronLeft className="h-4 w-4" />} aria-label={t("frBack", "Voltar")}>
                {compact ? null : t("frBack", "Voltar")}
              </EvoButton>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center"
              style={{ color: EVO.douradoClaro, background: "rgba(8,7,11,0.9)", boxShadow: `inset 0 0 0 1.5px ${EVO.dourado}99` }}
              aria-label={t("frClose", "Fechar a geladeira")}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {level.lv === "cats" && (
          <Arc
            count={cats.length}
            sel={catSel}
            onSel={setCatSel}
            onPick={openCat}
            cardW={cardW}
            cardH={cardH}
            spacing={spacing}
            t={t}
            render={(i, active) => {
              const c = cats[i]
              return (
                <Card active={active} empty={c.qty === 0} img={c.cover} badge={`×${c.qty}`} w={cardW} h={cardH}>
                  <div className={`${teko.className} truncate text-[24px] font-bold uppercase leading-none`} style={{ color: EVO.branco }}>
                    {t(CATEGORY_LABEL[c.id][0], CATEGORY_LABEL[c.id][1])}
                  </div>
                  <div className="mt-1 truncate text-[12px]" style={{ color: EVO.mudo }}>
                    {c.qty
                      ? t("frUnits", "{n} na geladeira").replace("{n}", String(c.qty))
                      : t("frCatEmpty", "Nada aqui — compre no Mercado")}
                  </div>
                </Card>
              )
            }}
          />
        )}

        {level.lv === "items" && cat && (
          <Arc
            count={cat.items.length}
            sel={itemSel}
            onSel={setItemSel}
            onPick={openItem}
            cardW={cardW}
            cardH={cardH}
            spacing={spacing}
            t={t}
            render={(i, active) => {
              const it = cat.items[i]
              const n = stock[it.id] ?? 0
              const fx = effectsOf(it)
              return (
                <Card active={active} empty={n === 0} img={thumbOf(it.id)} badge={n ? `×${n}` : t("frOut", "Acabou")} w={cardW} h={cardH}>
                  <div className={`${teko.className} line-clamp-2 text-[20px] font-semibold uppercase leading-[0.95]`} style={{ color: EVO.branco }}>
                    {itemName(it, t)}
                  </div>
                  {fx[0] && (
                    <div className={`${teko.className} mt-1 text-[19px] leading-none`} style={{ color: toneColor(fx[0].tone) }}>
                      {effectText(fx[0], t)}
                    </div>
                  )}
                  {fx.length > 1 && (
                    <div className="mt-0.5 truncate text-[11px]" style={{ color: EVO.mudo }}>
                      {fx.slice(1, 3).map((e) => effectText(e, t)).join(" · ")}
                    </div>
                  )}
                </Card>
              )
            }}
          />
        )}

        {level.lv === "item" && item && (
          <ItemSheet item={item} qty={stock[item.id] ?? 0} character={character} pending={pending === item.id} compact={compact} t={t} onEat={eat} onBack={back} />
        )}

        {/* rodapé: atalhos (computador) ou aviso */}
        <div className="mx-auto mt-2 flex min-h-6 w-full max-w-[980px] items-center justify-center">
          {notice ? (
            <div role="status" className={`${teko.className} px-3 pb-0.5 pt-1 text-[18px] uppercase tracking-[0.08em]`} style={{ background: EVO.douradoClaro, color: EVO.preto }}>
              {notice}
            </div>
          ) : (
            !compact && (
              <div className={`${teko.className} text-[18px] uppercase tracking-[0.12em]`} style={{ color: `${EVO.branco}99` }}>
                ← → {t("frHintMove", "Girar")} &nbsp; ENTER {t("frHintPick", "Escolher")} &nbsp; ESC {t("frHintBack", "Voltar")}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}

// ═══ a prateleira em arco ══════════════════════════════════════════════════
const MOUNT = 3.2

function Arc({
  count,
  sel,
  onSel,
  onPick,
  render,
  cardW,
  cardH,
  spacing,
  t,
}: {
  count: number
  sel: number
  onSel: (i: number) => void
  onPick: (i: number) => void
  render: (i: number, active: boolean) => ReactNode
  cardW: number
  cardH: number
  spacing: number
  t: Tr
}) {
  const [drag, setDrag] = useState(0)
  const start = useRef<{ x: number; id: number; moved: boolean } | null>(null)
  const movedAt = useRef(0)
  const lastWheel = useRef(0)
  const clamp = (i: number) => Math.max(0, Math.min(count - 1, i))
  const live = sel - drag / spacing

  const down = (e: React.PointerEvent) => {
    if (start.current || (e.pointerType === "mouse" && e.button !== 0)) return
    start.current = { x: e.clientX, id: e.pointerId, moved: false }
  }
  const move = (e: React.PointerEvent) => {
    const s = start.current
    if (!s || s.id !== e.pointerId) return
    const dx = e.clientX - s.x
    // Arrasto de verdade: captura o ponteiro (o dedo sai da prateleira e o
    // soltar ainda chega aqui). Toque parado não captura — vira clique no card.
    if (!s.moved && Math.abs(dx) > 8) {
      s.moved = true
      e.currentTarget.setPointerCapture?.(e.pointerId)
    }
    if (s.moved) setDrag(Math.max(-(count - 1 - sel) * spacing - 40, Math.min(sel * spacing + 40, dx)))
  }
  const up = (e: React.PointerEvent) => {
    const s = start.current
    if (!s || s.id !== e.pointerId) return
    start.current = null
    if (s.moved) {
      movedAt.current = performance.now()
      onSel(clamp(Math.round(sel - (e.clientX - s.x) / spacing)))
    }
    setDrag(0)
  }
  const wheel = (e: React.WheelEvent) => {
    const now = performance.now()
    if (now - lastWheel.current < 160) return
    lastWheel.current = now
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
    if (d) onSel(clamp(sel + (d > 0 ? 1 : -1)))
  }

  const cards: ReactNode[] = []
  for (let i = 0; i < count; i++) {
    const p = i - live
    const a = Math.abs(p)
    if (a > MOUNT) continue
    const active = i === sel
    cards.push(
      <div
        key={i}
        className="absolute left-1/2 top-0"
        style={{
          width: cardW,
          height: cardH,
          marginLeft: -cardW / 2,
          transform: `translate3d(${p * spacing}px, ${a * a * 9}px, ${-a * 150}px) rotateY(${-p * 26}deg)`,
          opacity: Math.max(0, Math.min(1, 1 - (a - 2) * 0.8)),
          zIndex: 100 - Math.round(a * 10),
          transition: drag ? "none" : "transform 380ms cubic-bezier(.2,.8,.2,1), opacity 380ms",
          willChange: "transform, opacity",
          cursor: "pointer",
        }}
        onClick={() => {
          if (performance.now() - movedAt.current < 250) return
          if (active) onPick(i)
          else onSel(i)
        }}
        aria-current={active || undefined}
      >
        {render(i, active)}
      </div>,
    )
  }

  return (
    <div className="relative mx-auto w-full max-w-[980px]">
      <div
        className="relative w-full select-none overflow-hidden"
        style={{ height: cardH + 46, perspective: 1100, touchAction: "none" }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onWheel={wheel}
      >
        <div className="absolute inset-x-0 top-4" style={{ transformStyle: "preserve-3d", height: cardH }}>
          {cards}
        </div>
        {/* a prateleira: faixa fria acesa embaixo dos cards (estática) */}
        <div
          className="pointer-events-none absolute inset-x-[6%] bottom-2 h-[3px]"
          style={{ background: `linear-gradient(90deg, transparent, ${ICE}, transparent)`, boxShadow: `0 0 18px ${ICE}` }}
        />
      </div>
      <button
        type="button"
        onClick={() => onSel(clamp(sel - 1))}
        disabled={sel <= 0}
        aria-label={t("frPrev", "Anterior")}
        className="absolute left-0 top-1/2 flex h-14 w-11 -translate-y-1/2 items-center justify-center disabled:opacity-25"
        style={{ color: ICE, background: "rgba(8,7,11,0.6)" }}
      >
        <ChevronLeft className="h-8 w-8" />
      </button>
      <button
        type="button"
        onClick={() => onSel(clamp(sel + 1))}
        disabled={sel >= count - 1}
        aria-label={t("frNext", "Próximo")}
        className="absolute right-0 top-1/2 flex h-14 w-11 -translate-y-1/2 items-center justify-center disabled:opacity-25"
        style={{ color: ICE, background: "rgba(8,7,11,0.6)" }}
      >
        <ChevronRight className="h-8 w-8" />
      </button>
    </div>
  )
}

function Card({ active, empty, img, badge, w, h, children }: { active: boolean; empty: boolean; img: string; badge: string; w: number; h: number; children: ReactNode }) {
  const imgH = Math.round(h * 0.6)
  return (
    <div className="relative h-full w-full">
      {/* neon do escolhido: camada estática, só a opacidade muda */}
      <div
        className="pointer-events-none absolute -inset-[3px]"
        style={{ background: EVO.magenta, boxShadow: `0 0 22px ${EVO.magenta}`, opacity: active ? 1 : 0, transition: "opacity 240ms" }}
      />
      <Chamfer cut={14} border={active ? EVO.rosaClaro : ICE_DIM} width={1.5} className="h-full" fill="linear-gradient(180deg, #121823 0%, #0b0d13 100%)">
        <div className="relative overflow-hidden" style={{ height: imgH, background: "radial-gradient(ellipse at 50% 35%, #2a3646, #0d1118)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail local pequena, só no jogo (admin) */}
          <img
            src={img}
            alt=""
            width={w}
            height={imgH}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="h-full w-full object-cover"
            style={{ opacity: empty ? 0.35 : 1 }}
          />
          <span
            className={`${teko.className} absolute right-0 top-0 px-2 pb-0.5 pt-1 text-[18px] font-semibold leading-none`}
            style={{ background: empty ? EVO.vinho : EVO.douradoClaro, color: empty ? EVO.branco : EVO.preto }}
          >
            {badge}
          </span>
        </div>
        <div className="px-2.5 pb-2 pt-1.5">{children}</div>
      </Chamfer>
    </div>
  )
}

// ═══ a ficha do item ═══════════════════════════════════════════════════════
function ItemSheet({
  item,
  qty,
  character,
  pending,
  compact,
  t,
  onEat,
  onBack,
}: {
  item: LifeItem
  qty: number
  character: LifeCharacter | null
  pending: boolean
  compact: boolean
  t: Tr
  onEat: () => void
  onBack: () => void
}) {
  const fx = effectsOf(item)
  const fit = mealFit(item, character)
  const verb = verbOf(item)
  const verbLabel = verb === "drink" ? t("frDrink", "Beber") : verb === "take" ? t("frTake", "Tomar") : t("frEat", "Comer")
  const fitLine =
    fit.kind === "full"
      ? (fit.late ? t("frFitFullLate", "Atende à refeição das {h} h (atrasada) e para a penalidade.") : t("frFitFull", "Atende à refeição das {h} h.")).replace("{h}", String(fit.at))
      : fit.kind === "part"
        ? t("frFitPart", "Conta parte da refeição das {h} h ({p}%).").replace("{h}", String(fit.at)).replace("{p}", String(Math.min(99, fit.pct)))
        : fit.kind === "none"
          ? t("frFitNone", "Não conta como refeição.")
          : t("frFitNoMeal", "Nenhuma refeição aberta agora — vale como lanche.")
  return (
    <div className="mx-auto w-full max-w-[720px]">
      <Chamfer cut={18} border={`${EVO.dourado}bb`} width={1.5}>
        <div className={`flex gap-4 p-4 ${compact ? "flex-col" : ""}`}>
          <div className="relative shrink-0 overflow-hidden" style={{ width: compact ? "100%" : 210, height: compact ? 170 : 280, background: "radial-gradient(ellipse at 50% 35%, #2a3646, #0d1118)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail local pequena, só no jogo (admin) */}
            <img src={thumbOf(item.id)} alt="" className="h-full w-full object-cover" style={{ opacity: qty ? 1 : 0.35 }} draggable={false} />
            <span className={`${kanji.className} absolute bottom-1 left-2 text-[30px] leading-none`} style={{ color: ICE, opacity: 0.6 }} aria-hidden>
              冷
            </span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className={`${teko.className} text-[22px] uppercase tracking-[0.08em]`} style={{ color: EVO.mudo }}>
                {t("frPortion", "Porção: 1 unidade")}
              </span>
              <span className={`${teko.className} text-[22px] uppercase tracking-[0.08em]`} style={{ color: qty ? EVO.douradoClaro : "#ff6b78" }}>
                {qty ? t("frUnits", "{n} na geladeira").replace("{n}", String(qty)) : t("frOut", "Acabou")}
              </span>
            </div>
            <ul className="flex flex-wrap gap-1.5">
              {fx.map((e) => (
                <li
                  key={e.key}
                  className={`${teko.className} px-2 pb-0.5 pt-1 text-[18px] leading-none`}
                  style={{ color: toneColor(e.tone), boxShadow: `inset 0 0 0 1px ${toneColor(e.tone)}55`, background: "rgba(0,0,0,0.35)" }}
                >
                  {effectText(e, t)}
                </li>
              ))}
              {!fx.length && <li className="text-[13px]" style={{ color: EVO.mudo }}>{t("frNoEffect", "Sem efeito imediato.")}</li>}
            </ul>
            <div className="flex items-start gap-2 text-[14px] leading-5" style={{ color: fit.kind === "full" ? EVO.bom : EVO.branco }}>
              <Utensils className="mt-0.5 h-4 w-4 shrink-0" style={{ color: ICE }} />
              <span>{fitLine}</span>
            </div>
            <div className="mt-auto flex flex-wrap gap-2 pt-2">
              <EvoButton
                variant="primary"
                size="lg"
                kbd={compact ? undefined : "↵"}
                className="flex-1"
                onClick={onEat}
                disabled={!qty || pending}
                icon={pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Utensils className="h-5 w-5" />}
              >
                {verbLabel}
              </EvoButton>
              <EvoButton variant="ghost" size="lg" onClick={onBack} icon={<ChevronLeft className="h-5 w-5" />}>
                {t("frBack", "Voltar")}
              </EvoButton>
            </div>
          </div>
        </div>
      </Chamfer>
    </div>
  )
}
