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

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, Loader2, Refrigerator, Utensils, X } from "lucide-react"
import type { FridgeStock, LifeCharacter, LifeItem } from "../../types"
import { EvoButton } from "../hud/hud-kit"
import { Chamfer, EVO, FUNDO, archivo, teko } from "../status/evo-skin"
import { MM } from "../hud/tokens"
import { itemName } from "../status/status-pages"
import { categories, effectsOf, mealFit, thumbOf, verbOf, type CategoryCard, type FridgeCategory } from "./fridge-logic"
import { Arc, Card, ICE, effectText, toneColor } from "./shelf"

type Tr = (key: string, fallback: string) => string


export const CATEGORY_LABEL: Record<FridgeCategory, [string, string]> = {
  meals: ["frCatMeals", "Refeições"],
  snacks: ["frCatSnacks", "Lanches"],
  drinks: ["frCatDrinks", "Bebidas"],
  supplements: ["frCatSupplements", "Suplementos"],
  medicine: ["frCatMedicine", "Remédios"],
  stimulants: ["frCatStimulants", "Estimulantes"],
  anabolic: ["frCatAnabolic", "Anabolizantes"],
}


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

  // Celular (mm3d-28c): card 118×172 e letra miúda — a prateleira, o
  // cabeçalho e a ficha cabem inteiros na tela, sem rolagem.
  const cardW = compact ? 118 : 200
  const cardH = compact ? 172 : Math.round(cardW * 1.48)
  const spacing = compact ? 104 : 190
  const crumb = cat ? t(CATEGORY_LABEL[cat.id][0], CATEGORY_LABEL[cat.id][1]) : t("frChooseCategory", "Escolha a categoria")

  return (
    <div
      className={`${archivo.className} absolute inset-0 z-20 flex flex-col justify-end`}
      // Um pouco translúcido: o jogo aparece atrás (pedido do Alex, 2026-10-25).
      style={{ background: "linear-gradient(180deg, rgba(24,24,28,0) 0%, rgba(24,24,28,0.14) 35%, rgba(24,24,28,0.5) 100%)" }}
      // A interface engole o toque: nada atravessa para o jogo.
      onPointerDown={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mm-fridge-title"
    >
      {/* Aviso da geladeira (comeu, acabou…): no computador fica no topo, como
          os outros avisos; no celular vai colado em cima da prateleira (o topo é
          do balão de necessidades, que cobria o aviso). */}
      {notice && !compact && (
        <div className="pointer-events-none absolute inset-x-0 flex justify-center px-4" style={{ top: "max(12px, env(safe-area-inset-top))" }}>
          <div role="status" className={`${archivo.className} px-4 py-2 text-[14px] font-semibold`} style={{ background: MM.surface, color: EVO.branco, borderRadius: MM.radius.card, border: `1px solid ${MM.goldBorder}`, boxShadow: MM.shadow }}>
            {notice}
          </div>
        </div>
      )}
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
        {notice && compact && (
          <div className="pointer-events-none mb-2 flex justify-center">
            <div role="status" className={`${archivo.className} px-3 py-1.5 text-center text-[12px] font-semibold leading-tight`} style={{ background: MM.surface, color: EVO.branco, borderRadius: 12, border: `1px solid ${MM.goldBorder}` }}>
              {notice}
            </div>
          </div>
        )}
        {/* cabeçalho: título, onde estou e fechar */}
        <div className={`mx-auto flex w-full max-w-[980px] items-end justify-between gap-3 ${compact ? "pb-1.5" : "pb-2"}`}>
          <div className="min-w-0">
            <div className="flex items-center gap-2" style={{ color: ICE }}>
              <Refrigerator className={`${compact ? "h-3.5 w-3.5" : "h-5 w-5"} shrink-0`} />
              <span className={`${archivo.className} ${compact ? "text-[10px]" : "text-[11px]"} font-semibold uppercase tracking-[0.28em]`}>{t("frEyebrow", "Geladeira")}</span>
            </div>
            <h2 id="mm-fridge-title" className={`${teko.className} line-clamp-2 ${compact ? "text-[18px]" : "text-[32px]"} font-bold uppercase leading-[0.95]`} style={{ color: EVO.branco }}>
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
              className={`inline-flex ${compact ? "h-9 w-9" : "h-11 w-11"} items-center justify-center`}
              style={{ color: EVO.branco, background: MM.surface, borderRadius: 12, border: `1px solid ${MM.border}` }}
              aria-label={t("frClose", "Fechar a geladeira")}
            >
              <X className={compact ? "h-4 w-4" : "h-5 w-5"} />
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
            compact={compact}
            t={t}
            render={(i, active) => {
              const c = cats[i]
              return (
                <Card active={active} empty={c.qty === 0} img={c.cover} badge={`×${c.qty}`} w={cardW} h={cardH} compact={compact}>
                  <div className={`${teko.className} truncate ${compact ? "text-[17px]" : "text-[24px]"} font-bold uppercase leading-none`} style={{ color: EVO.branco }}>
                    {t(CATEGORY_LABEL[c.id][0], CATEGORY_LABEL[c.id][1])}
                  </div>
                  <div className={`mt-1 ${compact ? "line-clamp-2 text-[10px] leading-[12px]" : "truncate text-[12px]"}`} style={{ color: EVO.mudo }}>
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
            compact={compact}
            t={t}
            render={(i, active) => {
              const it = cat.items[i]
              const n = stock[it.id] ?? 0
              const fx = effectsOf(it)
              return (
                <Card active={active} empty={n === 0} img={thumbOf(it.id)} badge={n ? `×${n}` : t("frOut", "Acabou")} w={cardW} h={cardH} compact={compact}>
                  <div className={`${teko.className} line-clamp-2 ${compact ? "text-[15px]" : "text-[20px]"} font-semibold uppercase leading-[0.95]`} style={{ color: EVO.branco }}>
                    {itemName(it, t)}
                  </div>
                  {fx[0] && (
                    <div className={`${teko.className} ${compact ? "mt-0.5 text-[14px]" : "mt-1 text-[19px]"} leading-none`} style={{ color: toneColor(fx[0].tone) }}>
                      {effectText(fx[0], t)}
                    </div>
                  )}
                  {fx.length > 1 && (
                    <div className={`mt-0.5 truncate ${compact ? "text-[10px]" : "text-[11px]"}`} style={{ color: EVO.mudo }}>
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

        {/* rodapé: atalhos (só computador; no celular a faixa vazia não ocupa altura) */}
        {!compact && (
          <div className="mx-auto mt-2 flex min-h-6 w-full max-w-[980px] items-center justify-center">
            <div className={`${archivo.className} text-[13px] font-medium`} style={{ color: EVO.mudo }}>
              ← → {t("frHintMove", "Girar")} &nbsp; ENTER {t("frHintPick", "Escolher")} &nbsp; ESC {t("frHintBack", "Voltar")}
            </div>
          </div>
        )}
      </div>
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
      <Chamfer cut={18} fill={MM.surface} style={{ boxShadow: MM.shadow }}>
        <div className={`flex ${compact ? "flex-col gap-2 p-2.5" : "gap-4 p-4"}`}>
          <div className="relative shrink-0 overflow-hidden" style={{ width: compact ? "100%" : 210, height: compact ? 120 : 280, borderRadius: MM.radius.card, background: "radial-gradient(ellipse at 50% 35%, #2a3646, #0d1118)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail local pequena, só no jogo (admin) */}
            <img src={thumbOf(item.id)} alt="" className="h-full w-full object-cover" style={{ opacity: qty ? 1 : 0.35 }} draggable={false} />
          </div>
          <div className={`flex min-w-0 flex-1 flex-col ${compact ? "gap-1.5" : "gap-2"}`}>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className={`${teko.className} ${compact ? "text-[15px] leading-none" : "text-[22px]"} uppercase tracking-[0.08em]`} style={{ color: EVO.mudo }}>
                {t("frPortion", "Porção: 1 unidade")}
              </span>
              <span className={`${teko.className} ${compact ? "text-[15px] leading-none" : "text-[22px]"} uppercase tracking-[0.08em]`} style={{ color: qty ? EVO.douradoClaro : "#ff6b78" }}>
                {qty ? t("frUnits", "{n} na geladeira").replace("{n}", String(qty)) : t("frOut", "Acabou")}
              </span>
            </div>
            <ul className={`flex flex-wrap ${compact ? "gap-1" : "gap-1.5"}`}>
              {fx.map((e) => (
                <li
                  key={e.key}
                  className={`${archivo.className} ${compact ? "px-2 py-[3px] text-[11px]" : "px-2.5 py-1 text-[13px]"} font-semibold leading-none`}
                  style={{ borderRadius: 999, color: toneColor(e.tone), boxShadow: `inset 0 0 0 1px ${toneColor(e.tone)}55`, background: "rgba(0,0,0,0.3)" }}
                >
                  {effectText(e, t)}
                </li>
              ))}
              {!fx.length && <li className={compact ? "text-[11px]" : "text-[13px]"} style={{ color: EVO.mudo }}>{t("frNoEffect", "Sem efeito imediato.")}</li>}
            </ul>
            <div className={`flex items-start gap-2 ${compact ? "text-[12px] leading-4" : "text-[14px] leading-5"}`} style={{ color: fit.kind === "full" ? EVO.bom : EVO.branco }}>
              <Utensils className={`shrink-0 ${compact ? "h-3.5 w-3.5" : "mt-0.5 h-4 w-4"}`} style={{ color: ICE }} />
              <span>{fitLine}</span>
            </div>
            <div className={`mt-auto flex flex-wrap gap-2 ${compact ? "pt-1" : "pt-2"}`}>
              <EvoButton
                variant="primary"
                size={compact ? "md" : "lg"}
                kbd={compact ? undefined : "↵"}
                className="flex-1"
                onClick={onEat}
                disabled={!qty || pending}
                icon={pending ? <Loader2 className={`${compact ? "h-4 w-4" : "h-5 w-5"} animate-spin`} /> : <Utensils className={compact ? "h-4 w-4" : "h-5 w-5"} />}
              >
                {verbLabel}
              </EvoButton>
              <EvoButton variant="gold" size={compact ? "md" : "lg"} onClick={onBack} icon={<ChevronLeft className={compact ? "h-4 w-4" : "h-5 w-5"} />}>
                {t("frBack", "Voltar")}
              </EvoButton>
            </div>
          </div>
        </div>
      </Chamfer>
    </div>
  )
}
