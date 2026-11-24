"use client"

// features/meu-mundo/ui/gear/weapon-forge.tsx — weapon-v1 (24/11/2026): a Forja e a Bancada de refino das ARMAS.
//
// Lista de miniaturas com pouca informação (arte, nome, classe, nível e estrelas). Ao tocar numa, abre o
// INSPETOR do mesmo tamanho ao lado (moldura própria) com a ação: "Refinar" (bancada), "Subir estrela" ou
// "Montar arma" (forja). Quem decide tudo é o servidor (custo, chance, sorteio, doadora); a tela só mostra o
// que veio na mochila (`bag.forge[cópia]`) e o recibo. O resultado do refino aparece como na referência do
// Alex: SUCESSO/FALHOU, o número que saiu e a faixa que vencia.

import { useMemo, useState, type ReactNode } from "react"
import { ArrowLeft } from "lucide-react"
import { assembleWeapon, refineWeapon, starWeapon, type GearBag, type GearCatalog, type GearInstance, type GearItem } from "../../data"
import type { GearBonus } from "../../laminas/sim/fight"
import { AetherButton } from "../kit/aether-modal"
import { AetherCarousel, type CarouselItem } from "../kit/aether-carousel"
import { AE, RANK, RANKS, rankOf, type Rank } from "../kit/aether-tokens"
import { RankSeal } from "../kit/rank-seal"
import { ItemImage } from "../kit/item-image"
import { SteamFrame } from "../kit/steam/steam-frame"
import { teko } from "../status/evo-skin"
import { bonusLines, gearLock, gearThumb, nameOf, type GearAction, type GearTr } from "./gear-card"
import { FragmentPiece, PowderVial, WeaponStars } from "./weapon-marks"

export type WeaponMode = "refine" | "stars" | "assemble"
type Props = { catalog: GearCatalog; bag: GearBag; byId: Map<string, GearItem>; t: GearTr; busy: boolean; act: GearAction }

const isWeapon = (item: GearItem | undefined) => !!item && item.category === "weapon" && !!item.slot
const pct = (v: number) => (Math.round(v * 10000) / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + "%"

/** Miniatura com pouca informação: arte, nome, classe, nível e estrelas. */
function WeaponThumb({ item, inst, t, note, onOpen, selected = false }: {
  item: GearItem; inst?: GearInstance | null; t: GearTr; note?: string; onOpen?: () => void; selected?: boolean
}) {
  const art = gearThumb(item)
  const rank = rankOf(item)
  const body = (
    <>
      <span className="absolute inset-0">
        <ItemImage src={art} category="weapon" rarity={rank} alt="" fill fit="cover" />
      </span>
      <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(8,10,14,0) 55%, rgba(8,10,14,0.82) 78%, rgba(8,10,14,0.96) 100%)" }} />
      <span className="absolute left-2 top-2"><RankSeal rank={rank} t={t} size="sm" /></span>
      <span className="absolute inset-x-0 bottom-0 grid gap-1 p-3 text-left" style={{ textShadow: "0 1px 2px #000" }}>
        <span className={teko.className + " text-[22px] font-semibold uppercase leading-none"} style={{ color: AE.text }}>{nameOf(item, t)}</span>
        {inst ? (
          <span className="flex items-center justify-between gap-2">
            <span className={teko.className + " text-[20px] leading-none tabular-nums"} style={{ color: AE.goldSoft }}>{t("wfLevelShort", "Nv {n}").replace("{n}", String(inst.weaponLevel || 1))}</span>
            <WeaponStars stars={inst.stars || 1} size={14} t={t} />
          </span>
        ) : note ? <span className="text-[12px] font-semibold" style={{ color: AE.goldSoft }}>{note}</span> : null}
      </span>
    </>
  )
  const style = { aspectRatio: "2 / 3", background: AE.well, boxShadow: `inset 0 0 0 ${selected ? 2 : 1}px ${selected ? AE.gold : RANK[rank].color}` }
  if (!onOpen) return <div className="relative h-full w-full overflow-hidden" style={style}>{body}</div>
  return (
    <button type="button" onClick={onOpen} aria-label={t("wfOpenWeapon", "Abrir {name}").replace("{name}", nameOf(item, t))}
      className="relative block h-full w-full overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-[#FF8A1F]" style={style}>
      {body}
    </button>
  )
}

/** O inspetor: mesmo tamanho da miniatura, fundo próprio (moldura steampunk). */
function Inspector({ title, children }: { title: string; children: ReactNode }) {
  return (
    <SteamFrame tone="gold" className="h-full w-full" innerClassName="flex h-full flex-col gap-3 overflow-y-auto overscroll-contain p-4">
      <h4 className={teko.className + " text-[24px] font-semibold uppercase leading-tight"} style={{ color: AE.goldSoft }}>{title}</h4>
      {children}
    </SteamFrame>
  )
}

/** Miniatura + inspetor lado a lado (no celular, um embaixo do outro), com o "voltar à lista". */
function PairView({ thumb, inspector, onBack, t }: { thumb: ReactNode; inspector: ReactNode; onBack: () => void; t: GearTr }) {
  return (
    <div className="grid gap-3">
      <button type="button" onClick={onBack} className="flex min-h-11 items-center gap-2 self-start text-[13px] font-semibold" style={{ color: AE.goldSoft }}>
        <ArrowLeft className="h-4 w-4" aria-hidden /> {t("wfBackToList", "Voltar à lista")}
      </button>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-stretch sm:justify-center">
        <div className="w-full max-w-[300px] shrink-0" style={{ aspectRatio: "2 / 3" }}>{thumb}</div>
        <div className="w-full max-w-[300px] shrink-0" style={{ aspectRatio: "2 / 3" }}>{inspector}</div>
      </div>
    </div>
  )
}

/** Bônus antes → depois (só as chaves que mudam). */
function BonusDiff({ before, after, t }: { before: Partial<GearBonus>; after: Partial<GearBonus>; t: GearTr }) {
  const keys = (Object.keys(after) as (keyof GearBonus)[]).filter((k) => (after[k] || 0) !== (before[k] || 0))
  if (!keys.length) return null
  return (
    <ul className="grid gap-1 text-[12px] font-semibold" style={{ color: AE.text }}>
      {keys.map((k) => (
        <li key={String(k)} className="flex flex-wrap items-center gap-1">
          <span style={{ color: AE.muted }}>{bonusLines({ [k]: before[k] || 0 } as Partial<GearBonus>, t)[0] || "0"}</span>
          <span aria-hidden style={{ color: AE.goldSoft }}>→</span>
          <span style={{ color: AE.aether }}>{bonusLines({ [k]: after[k] || 0 } as Partial<GearBonus>, t)[0]}</span>
        </li>
      ))}
    </ul>
  )
}

/** Linha "frasco + nome do pó + tem N". */
function PowderLine({ id, have, byId, t }: { id: string; have: number; byId: Map<string, GearItem>; t: GearTr }) {
  const it = byId.get(id)
  const name = it ? nameOf(it, t) : id
  return (
    <div className="flex items-center gap-2 p-2" style={{ background: AE.well }}>
      <PowderVial rank={rankOf(it)} label={name} />
      <span className="min-w-0 flex-1 text-[13px] font-semibold" style={{ color: AE.text }}>{name}</span>
      <span className={teko.className + " text-[20px] tabular-nums"} style={{ color: have > 0 ? AE.goldSoft : AE.bad }}>{t("wfHave", "tem {n}").replace("{n}", String(have))}</span>
    </div>
  )
}

type RefineOutcome = { success: boolean; roll: number; chance: number; from: number; to: number; level: number }

/** O resultado do sorteio, como na referência: o número que saiu sobre a faixa que vencia. */
function RefineResult({ r, t, onAgain, canAgain, busy }: { r: RefineOutcome; t: GearTr; onAgain: () => void; canAgain: boolean; busy: boolean }) {
  const color = r.success ? "#4BE38A" : "#FF3B4E"
  return (
    <div role="status" aria-live="polite" className="grid gap-3">
      <p className={teko.className + " text-center text-[40px] font-semibold uppercase leading-none"} style={{ color, textShadow: `0 0 12px ${color}88` }}>
        {r.success ? t("wfRefineSuccess", "Sucesso!") : t("wfRefineFail", "Falhou")}
      </p>
      <p className="text-center text-[13px] font-semibold" style={{ color: AE.text }}>
        {r.success
          ? t("wfRefineUp", "A arma subiu do nível {from} para o {to}.").replace("{from}", String(r.from)).replace("{to}", String(r.to))
          : t("wfRefineStay", "O pó foi gasto e a arma continua no nível {from}.").replace("{from}", String(r.from))}
      </p>
      <div className="grid gap-1">
        <div className="relative h-4 w-full overflow-hidden" style={{ background: AE.well, boxShadow: "inset 0 0 0 1px " + AE.brassLine }}>
          <span className="absolute inset-y-0 left-0" style={{ width: `${r.chance * 100}%`, background: "linear-gradient(90deg, rgba(75,227,138,0.25), rgba(75,227,138,0.55))" }} />
          <span aria-hidden className="absolute inset-y-[-2px] w-[3px]" style={{ left: `calc(${Math.min(99.6, r.roll * 100)}% - 1px)`, background: color, boxShadow: `0 0 6px ${color}` }} />
        </div>
        <p className="text-[12px]" style={{ color: AE.muted }}>
          {t("wfRollLine", "Saiu {roll}. Números menores que {chance} vencem.").replace("{roll}", pct(r.roll)).replace("{chance}", pct(r.chance))}
        </p>
      </div>
      <AetherButton busy={busy} disabled={!canAgain} onClick={onAgain}>{t("wfRefineAgain", "Refinar de novo")}</AetherButton>
    </div>
  )
}

/** Bancada: a próxima tentativa de refino da cópia escolhida. */
function RefineInspector({ item, inst, bag, byId, t, busy, act, maxLevel, rulesVersion }: Props & { item: GearItem; inst: GearInstance; maxLevel: number; rulesVersion?: string }) {
  const view = bag.forge?.[inst.id]?.refine || null
  const [last, setLast] = useState<RefineOutcome | null>(null)
  const have = view ? bag.owned[view.powder]?.qty || 0 : 0
  const run = async () => {
    const out = await act("refine-" + inst.id, (tk, key) => refineWeapon(tk, inst.id, key, inst.version, rulesVersion), undefined, { quiet: true })
    const r = out?.receipt?.result as Partial<RefineOutcome> | undefined
    if (r && typeof r.success === "boolean") setLast({ success: r.success, roll: Number(r.roll) || 0, chance: Number(r.chance) || 0, from: Number(r.from) || 0, to: Number(r.to) || 0, level: Number(r.level) || 0 })
  }
  return (
    <Inspector title={t("wfRefineTitle", "Refinar")}>
      <div className="flex items-center justify-between gap-2">
        <span className={teko.className + " text-[26px] leading-none tabular-nums"} style={{ color: AE.text }}>
          {t("wfLevelShort", "Nv {n}").replace("{n}", String(inst.weaponLevel || 1))}
          {view && <span style={{ color: AE.goldSoft }}> → {view.to}</span>}
        </span>
        <WeaponStars stars={inst.stars || 1} size={14} t={t} />
      </div>
      {last ? (
        <RefineResult r={last} t={t} busy={busy} canAgain={!!view && (bag.owned[view.powder]?.qty || 0) > 0} onAgain={() => { setLast(null); void run() }} />
      ) : !view ? (
        <p className="text-[13px] font-semibold" style={{ color: AE.goldSoft }}>{t("wfMaxLevel", "Nível máximo ({n}).").replace("{n}", String(maxLevel))}</p>
      ) : (
        <>
          <p className="text-[12px]" style={{ color: AE.muted }}>{t("wfRefineHow", "Cada tentativa gasta 1 pó da faixa do próximo nível. Se falhar, a arma não desce.")}</p>
          <PowderLine id={view.powder} have={have} byId={byId} t={t} />
          <p className="text-[13px] font-semibold" style={{ color: AE.text }}>{t("wfChance", "Chance de sucesso: {p}").replace("{p}", pct(view.chance))}</p>
          <BonusDiff before={view.bonusBefore} after={view.bonusAfter} t={t} />
          <div className="mt-auto grid gap-2">
            {have < 1 && <p className="text-[12px]" style={{ color: AE.bad }}>{t("wfNoPowder", "Falta o pó desta faixa. Ele cai nos Domínios, nas lutas e nas partidas, e sai na loja de troca.")}</p>}
            <AetherButton busy={busy} disabled={have < 1 || busy} onClick={() => void run()}>{t("wfRefineButton", "Refinar")}</AetherButton>
          </div>
        </>
      )}
    </Inspector>
  )
}

/** Forja: a próxima estrela (consome uma cópia idêntica nova). */
function StarsInspector({ item, inst, bag, t, busy, act, maxStars }: Props & { item: GearItem; inst: GearInstance; maxStars: number }) {
  const view = bag.forge?.[inst.id]?.stars || null
  const donors = (view?.donors || []).map((id) => bag.instances?.find((x) => x.id === id)).filter((x): x is GearInstance => !!x)
  const [donor, setDonor] = useState<string | null>(null)
  const chosen = donors.find((d) => d.id === donor) ? donor : donors[0]?.id || null
  return (
    <Inspector title={t("wfStarsTitle", "Subir estrela")}>
      <div className="flex items-center gap-2">
        <WeaponStars stars={inst.stars || 1} max={maxStars} size={18} t={t} />
        {view && <span className={teko.className + " text-[20px]"} style={{ color: AE.goldSoft }}>→ {view.to}</span>}
      </div>
      {!view ? (
        <p className="text-[13px] font-semibold" style={{ color: AE.goldSoft }}>{t("wfMaxStars", "Todas as estrelas acesas.")}</p>
      ) : (
        <>
          <p className="text-[12px]" style={{ color: AE.muted }}>{t("wfStarsHow", "Consome 1 cópia idêntica nova (nível 1, 1 estrela, solta e sem trava). Sempre dá certo.")}</p>
          <BonusDiff before={view.bonusBefore} after={view.bonusAfter} t={t} />
          {donors.length ? (
            <div role="radiogroup" aria-label={t("wfChooseDonor", "Cópia que será consumida")} className="grid gap-1">
              {donors.map((d, i) => (
                <button key={d.id} type="button" role="radio" aria-checked={chosen === d.id} onClick={() => setDonor(d.id)}
                  className="flex min-h-11 items-center justify-between gap-2 px-2 text-[13px] font-semibold"
                  style={{ background: chosen === d.id ? AE.steelHi : AE.well, color: AE.text, boxShadow: `inset 0 0 0 1px ${chosen === d.id ? AE.gold : AE.brassLine}` }}>
                  <span>{t("wfCopyN", "Cópia {n}").replace("{n}", String(i + 1))} · {t("wfLevelShort", "Nv {n}").replace("{n}", String(d.weaponLevel || 1))}</span>
                  <WeaponStars stars={d.stars || 1} max={maxStars} size={11} t={t} />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[12px]" style={{ color: AE.bad }}>
              {t("wfNoDonor", "Você não tem outra cópia nova desta arma. Monte uma com fragmentos da classe {r}.").replace("{r}", t(RANK[rankOf(item)].labelKey, RANK[rankOf(item)].label))}
            </p>
          )}
          <div className="mt-auto">
            <AetherButton busy={busy} disabled={!chosen || busy} onClick={() => chosen && void act("stars-" + inst.id + "-" + chosen, (tk, key) => starWeapon(tk, inst.id, chosen, key, inst.version), t("wfStarsOk", "Estrela acesa!"))}>
              {t("wfStarsButton", "Subir estrela")}
            </AetherButton>
          </div>
        </>
      )}
    </Inspector>
  )
}

/** Forja: montar a arma escolhida com os fragmentos da classe dela. */
function AssembleInspector({ item, bag, t, busy, act, need, fragment }: Props & { item: GearItem; need: number; fragment: string }) {
  const have = bag.owned[fragment]?.qty || 0
  const copies = (bag.instances || []).filter((x) => x.item === item.id).length
  const lock = gearLock(item, bag, t)
  const rank = rankOf(item)
  return (
    <Inspector title={t("wfAssembleTitle", "Montar arma")}>
      <div className="flex items-center gap-3">
        <FragmentPiece rank={rank} thumbs={[gearThumb(item)].filter((x): x is string => !!x)} size={64} t={t} />
        <div className="grid">
          <span className={teko.className + " text-[26px] leading-none tabular-nums"} style={{ color: have >= need ? AE.goldSoft : AE.bad }}>{have} / {need}</span>
          <span className="text-[12px]" style={{ color: AE.muted }}>{t("wfFragmentOf", "Fragmento de classe {r}").replace("{r}", t(RANK[rank].labelKey, RANK[rank].label))}</span>
        </div>
      </div>
      <p className="text-[12px]" style={{ color: AE.muted }}>{t("wfAssembleHow", "Os fragmentos são da classe: você escolhe qual arma dela montar. Ela nasce no nível 1 com 1 estrela.")}</p>
      {copies > 0 && <p className="text-[12px] font-semibold" style={{ color: AE.goldSoft }}>{t("wfCopiesOwned", "Você já tem {n} — a nova pode virar estrela.").replace("{n}", String(copies))}</p>}
      {lock && <p className="text-[12px]" style={{ color: AE.bad }}>{lock}</p>}
      <div className="mt-auto">
        <AetherButton busy={busy} disabled={have < need || busy} onClick={() => void act("assemble-" + item.id, (tk, key) => assembleWeapon(tk, item.id, key), t("wfAssembleOk", "Arma montada! Ela está na mochila."))}>
          {t("wfAssembleButton", "Montar arma")}
        </AetherButton>
      </div>
    </Inspector>
  )
}

/** A lista de cópias de arma (bancada de refino e estrelas), as vestidas primeiro. */
function useWeaponCopies(bag: GearBag, byId: Map<string, GearItem>) {
  return useMemo(() => (bag.instances || [])
    .filter((x) => isWeapon(byId.get(x.item)) && bag.forge?.[x.id])
    .sort((a, b) => Number(b.equippedHere) - Number(a.equippedHere) || (b.weaponLevel || 1) - (a.weaponLevel || 1) || (b.stars || 1) - (a.stars || 1)), [bag, byId])
}

export function WeaponWorkshop({ mode, ...p }: Props & { mode: WeaponMode }) {
  const { catalog, bag, byId, t } = p
  const rules = catalog.weaponProgress || bag.progression
  const maxLevel = rules?.maxLevel || 90
  const maxStars = rules?.maxStars || 5
  const copies = useWeaponCopies(bag, byId)
  const [open, setOpen] = useState<string | null>(null)
  // montar: a classe escolhida (a primeira que já dá para montar; senão a primeira que tem fragmento)
  const fragOf = (r: Rank) => rules?.fragments?.[r] || `frag_classe_${r.toLowerCase()}`
  const needOf = (r: Rank) => rules?.fragmentNeed?.[r] || 20
  const weaponsBy = useMemo(() => {
    const m = new Map<Rank, GearItem[]>()
    for (const it of catalog.items) if (isWeapon(it) && !it.retired) (m.get(rankOf(it)) || m.set(rankOf(it), []).get(rankOf(it))!).push(it)
    return m
  }, [catalog])
  const ranks = RANKS.filter((r) => (weaponsBy.get(r) || []).length)
  const auto = ranks.find((r) => (bag.owned[fragOf(r)]?.qty || 0) >= needOf(r)) || ranks.find((r) => (bag.owned[fragOf(r)]?.qty || 0) > 0) || ranks[0]
  const [rankPick, setRankPick] = useState<Rank | null>(null)
  const rank = rankPick || auto

  if (mode === "assemble") {
    const list = weaponsBy.get(rank) || []
    const chosen = open ? list.find((x) => x.id === open) : null
    if (chosen)
      return <PairView t={t} onBack={() => setOpen(null)} thumb={<WeaponThumb item={chosen} t={t} selected />} inspector={<AssembleInspector {...p} item={chosen} need={needOf(rank)} fragment={fragOf(rank)} />} />
    const items: CarouselItem[] = list.map((it) => {
      const own = (bag.instances || []).filter((x) => x.item === it.id).length
      return { key: it.id, label: nameOf(it, t), render: () => <WeaponThumb item={it} t={t} onOpen={() => setOpen(it.id)} note={own ? t("wfOwnedN", "Na mochila: {n}").replace("{n}", String(own)) : t("wfTapToAssemble", "Toque para montar")} /> }
    })
    return (
      <div className="grid gap-3">
        <div role="radiogroup" aria-label={t("wfChooseClass", "Classe dos fragmentos")} className="flex gap-2 overflow-x-auto pb-1">
          {ranks.map((r) => {
            const have = bag.owned[fragOf(r)]?.qty || 0
            const thumbs = (weaponsBy.get(r) || []).map(gearThumb).filter((x): x is string => !!x)
            return (
              <button key={r} type="button" role="radio" aria-checked={r === rank} onClick={() => { setRankPick(r); setOpen(null) }}
                className="grid min-w-[76px] shrink-0 justify-items-center gap-0.5 p-1"
                style={{ background: r === rank ? AE.steelHi : AE.well, boxShadow: `inset 0 0 0 1px ${r === rank ? RANK[r].color : AE.brassLine}` }}>
                <FragmentPiece rank={r} thumbs={thumbs} size={56} t={t} />
                <span className={teko.className + " text-[16px] leading-none tabular-nums"} style={{ color: have >= needOf(r) ? AE.goldSoft : AE.muted }}>{have}/{needOf(r)}</span>
              </button>
            )
          })}
        </div>
        <AetherCarousel key={"asm-" + rank} title={t("wfAssembleTitle", "Montar arma")} items={items} cardWidth={240} cardHeight={360} empty={t("gearNothing", "Nada por aqui ainda.")} />
      </div>
    )
  }

  const chosen = open ? copies.find((x) => x.id === open) : null
  const chosenItem = chosen ? byId.get(chosen.item) : null
  if (chosen && chosenItem)
    return (
      <PairView t={t} onBack={() => setOpen(null)} thumb={<WeaponThumb item={chosenItem} inst={chosen} t={t} selected />}
        inspector={mode === "refine"
          ? <RefineInspector key={chosen.id} {...p} item={chosenItem} inst={chosen} maxLevel={maxLevel} rulesVersion={rules?.rulesVersion} />
          : <StarsInspector key={chosen.id} {...p} item={chosenItem} inst={chosen} maxStars={maxStars} />} />
    )
  const items: CarouselItem[] = copies.map((x) => {
    const it = byId.get(x.item)!
    return { key: x.id, label: nameOf(it, t), render: () => <WeaponThumb item={it} inst={x} t={t} onOpen={() => setOpen(x.id)} /> }
  })
  return <AetherCarousel key={"list-" + mode} title={mode === "refine" ? t("wfRefineTitle", "Refinar") : t("wfStarsTitle", "Subir estrela")} items={items} cardWidth={240} cardHeight={360}
    empty={t("wfNoWeapon", "Nenhuma arma na mochila. Monte uma na Forja com fragmentos de classe.")} />
}
