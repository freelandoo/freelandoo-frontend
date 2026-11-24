"use client"

// features/meu-mundo/ui/gear/weapon-forge.tsx — weapon-v2 (24/11/2026): a Forja e a Bancada de refino das ARMAS.
//
// Lista de miniaturas com pouca informação (arte, nome, classe, nível e estrelas). Ao tocar numa, abre o
// INSPETOR do mesmo tamanho ao lado (moldura própria) com a ação: "Refinar" (bancada), "Subir estrela" ou
// "Montar arma" (forja). Quem decide tudo é o servidor (pó, sorteio, doadora); a tela só mostra o que veio na
// mochila (`bag.forge[cópia]`) e o recibo. Refino (pedido do Alex): cada nível tem uma BARRA DE XP; cada
// tentativa gasta 1 pó da CLASSE da arma e sorteia um XP (muito, pouco ou até negativo); a pessoa ACEITA ou
// RECUSA; "Refinar 10 vezes" aceita sozinho só o que aumenta.

import { useMemo, useState, type ReactNode } from "react"
import { ArrowLeft } from "lucide-react"
import { assembleWeapon, decideWeapon, refineWeapon, starWeapon, type GearBag, type GearCatalog, type GearInstance, type GearItem, type WeaponRoll, type WeaponTier } from "../../data"
import type { GearBonus } from "../../laminas/sim/fight"
import { AetherButton } from "../kit/aether-modal"
import { AetherCarousel, type CarouselItem } from "../kit/aether-carousel"
import { AE, RANK, RANKS, rankOf, type Rank } from "../kit/aether-tokens"
import { ItemDetailLayout, ItemTile } from "../kit/item-detail"
import { teko } from "../status/evo-skin"
import { bonusLines, gearLock, gearThumb, nameOf, type GearAction, type GearTr } from "./gear-card"
import { FragmentPiece, PowderVial, WeaponStars } from "./weapon-marks"
import { ItemFacts } from "./item-facts"

export type WeaponMode = "refine" | "stars" | "assemble"
type Props = { catalog: GearCatalog; bag: GearBag; byId: Map<string, GearItem>; t: GearTr; busy: boolean; act: GearAction }

const isWeapon = (item: GearItem | undefined) => !!item && item.category === "weapon" && !!item.slot
const signed = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n).toLocaleString("pt-BR")
const num = (n: number) => n.toLocaleString("pt-BR")
/** Cor e nome de cada faixa do sorteio de XP. */
const TIER: Record<WeaponTier, { color: string; key: string; label: string }> = {
  loss: { color: "#FF3B4E", key: "wfTierLoss", label: "Perdeu XP" },
  normal: { color: "#3FA9FF", key: "wfTierNormal", label: "Normal" },
  good: { color: "#4BE38A", key: "wfTierGood", label: "Bom!" },
  great: { color: "#F2B705", key: "wfTierGreat", label: "Excelente!" },
}

/** Miniatura: só a arte (selo da classe e estrelas no canto) e o nome + nível na faixa de baixo. */
function WeaponThumb({ item, inst, t, count, onOpen, selected = false }: {
  item: GearItem; inst?: GearInstance | null; t: GearTr; count?: number; onOpen?: () => void; selected?: boolean
}) {
  return (
    <ItemTile art={{ src: gearThumb(item), category: "weapon", rank: rankOf(item) }} name={nameOf(item, t)} t={t} selected={selected} onOpen={onOpen}
      openLabel={t("wfOpenWeapon", "Abrir {name}").replace("{name}", nameOf(item, t))}
      sub={inst ? t("wfLevelShort", "Nv {n}").replace("{n}", String(inst.weaponLevel || 1)) : undefined}
      corner={inst ? <WeaponStars stars={inst.stars || 1} size={12} t={t} /> : undefined}
      badge={count ? "×" + count : undefined} />
  )
}

/** O miolo da ação (Refinar, Subir estrela, Montar arma): título e conteúdo na coluna de dados do detalhe. */
function Inspector({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid gap-3">
      <h4 className={teko.className + " text-[24px] font-semibold uppercase leading-tight"} style={{ color: AE.goldSoft }}>{title}</h4>
      {children}
    </div>
  )
}

/**
 * O detalhe da arma no padrão compartilhado (arte | dados; no celular, empilhado): a ação no topo da coluna de
 * dados e, embaixo, a ficha inteira da arma (classe, status da classe, nível, estrelas, bônus de agora…).
 */
function PairView({ item, inst, p, inspector, onBack }: { item: GearItem; inst?: GearInstance | null; p: Props; inspector: ReactNode; onBack: () => void }) {
  const { t } = p
  return (
    <div className="grid gap-3">
      <button type="button" onClick={onBack} className="flex min-h-11 items-center gap-2 self-start text-[13px] font-semibold" style={{ color: AE.goldSoft }}>
        <ArrowLeft className="h-4 w-4" aria-hidden /> {t("wfBackToList", "Voltar à lista")}
      </button>
      <ItemDetailLayout art={{ src: gearThumb(item), category: "weapon", rank: rankOf(item) }} name={nameOf(item, t)} t={t}
        corner={inst ? <WeaponStars stars={inst.stars || 1} size={14} t={t} /> : undefined}>
        {inspector}
        <div className="h-px shrink-0" style={{ background: AE.brassLine }} />
        <ItemFacts item={item} t={t} bag={p.bag} inst={inst} byId={p.byId} />
      </ItemDetailLayout>
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

/**
 * A barra de XP do nível. Com `delta`, mostra a prévia: ganho em verde por cima (passou do fim = sobe de
 * nível), perda em vermelho (para no começo da barra: nunca desce de nível).
 */
function XpBar({ xp, need, delta, t }: { xp: number; need: number; delta?: number | null; t: GearTr }) {
  const w = (v: number) => `${Math.max(0, Math.min(100, (v / Math.max(1, need)) * 100))}%`
  const gain = delta != null && delta > 0
  const loss = delta != null && delta < 0
  const end = delta != null ? Math.max(0, xp + delta) : xp
  return (
    <div className="grid gap-1">
      <div className="relative h-4 w-full overflow-hidden" style={{ background: AE.well, boxShadow: "inset 0 0 0 1px " + AE.brassLine }}
        role="meter" aria-valuemin={0} aria-valuemax={need} aria-valuenow={xp} aria-label={t("wfXpOf", "{xp} / {need} XP").replace("{xp}", num(xp)).replace("{need}", num(need))}>
        <span className="absolute inset-y-0 left-0" style={{ width: w(loss ? end : xp), background: "linear-gradient(90deg, #8A6A10, #F2B705)" }} />
        {gain && <span className="absolute inset-y-0" style={{ left: w(xp), width: `calc(${w(Math.min(need, end))} - ${w(xp)})`, background: "repeating-linear-gradient(135deg, rgba(75,227,138,0.95) 0 6px, rgba(75,227,138,0.6) 6px 12px)" }} />}
        {loss && <span className="absolute inset-y-0" style={{ left: w(end), width: `calc(${w(xp)} - ${w(end)})`, background: "repeating-linear-gradient(135deg, rgba(255,59,78,0.95) 0 6px, rgba(255,59,78,0.55) 6px 12px)" }} />}
      </div>
      <p className="flex justify-between gap-2 text-[12px] tabular-nums" style={{ color: AE.muted }}>
        <span>{delta != null
          ? t("wfXpPreview", "{from} → {to} / {need} XP").replace("{from}", num(xp)).replace("{to}", num(end)).replace("{need}", num(need))
          : t("wfXpOf", "{xp} / {need} XP").replace("{xp}", num(xp)).replace("{need}", num(need))}</span>
        {gain && end >= need && <span className="font-semibold" style={{ color: "#4BE38A" }}>{t("wfLevelUp", "Sobe de nível!")}</span>}
      </p>
    </div>
  )
}

/** O resultado que espera decisão: a faixa, o XP sorteado, a prévia na barra e Aceitar / Recusar. */
function PendingResult({ xp, need, roll, tier, t, busy, onDecide }: {
  xp: number; need: number; roll: number; tier: WeaponTier; t: GearTr; busy: boolean; onDecide: (d: "accept" | "reject") => void
}) {
  const st = TIER[tier] || TIER.normal
  return (
    <div role="status" aria-live="polite" className="grid gap-3">
      <div className="grid justify-items-center gap-1">
        <p className={teko.className + " text-[22px] font-semibold uppercase leading-none"} style={{ color: st.color }}>{t(st.key, st.label)}</p>
        <p className={teko.className + " text-[44px] font-semibold leading-none tabular-nums"} style={{ color: st.color, textShadow: `0 0 12px ${st.color}88` }}>{signed(roll)} XP</p>
      </div>
      <XpBar xp={xp} need={need} delta={roll} t={t} />
      <p className="text-[12px]" style={{ color: AE.muted }}>{t("wfPendingHow", "Aceite para somar à barra ou recuse para descartar. O pó já foi gasto.")}</p>
      <div className="mt-auto grid grid-cols-2 gap-2">
        <AetherButton tone="secondary" busy={busy} disabled={busy} onClick={() => onDecide("reject")}>{t("wfReject", "Recusar")}</AetherButton>
        <AetherButton busy={busy} disabled={busy} onClick={() => onDecide("accept")}>{t("wfAccept", "Aceitar")}</AetherButton>
      </div>
    </div>
  )
}

/** O "10 vezes": cada tentativa com o XP e se entrou (o que tira XP é recusado sozinho). */
function BatchResult({ rolls, t }: { rolls: WeaponRoll[]; t: GearTr }) {
  const ok = rolls.filter((r) => r.accepted)
  const sum = ok.reduce((a, r) => a + r.xp, 0)
  return (
    <div role="status" aria-live="polite" className="grid gap-2">
      <p className="text-[13px] font-semibold" style={{ color: AE.text }}>
        {t("wfBatchSummary", "{ok} de {n} aceitas · {xp} XP").replace("{ok}", String(ok.length)).replace("{n}", String(rolls.length)).replace("{xp}", signed(sum))}
      </p>
      <ol className="grid grid-cols-5 gap-1">
        {rolls.map((r, i) => {
          const st = TIER[r.tier] || TIER.normal
          return (
            <li key={i} className={teko.className + " grid place-items-center py-1 text-[17px] leading-none tabular-nums"}
              style={{ background: AE.well, color: r.accepted ? st.color : AE.muted, boxShadow: `inset 0 0 0 1px ${r.accepted ? st.color : AE.brassLine}`, textDecoration: r.accepted ? "none" : "line-through" }}>
              {signed(r.xp)}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/** Bancada: a barra de XP da cópia escolhida, o pó da classe e a tentativa (1 ou 10 vezes). */
function RefineInspector({ item, inst, bag, byId, t, busy, act, maxLevel, rulesVersion, batch }: Props & { item: GearItem; inst: GearInstance; maxLevel: number; rulesVersion?: string; batch: number }) {
  const view = bag.forge?.[inst.id]?.refine || null
  const [tried, setTried] = useState(false)
  const [rolls, setRolls] = useState<WeaponRoll[] | null>(null)
  const have = view ? bag.owned[view.powder]?.qty || 0 : 0
  const rankName = t(RANK[rankOf(item)].labelKey, RANK[rankOf(item)].label)
  const run = async (times: number) => {
    setRolls(null)
    const out = await act("refine-" + inst.id, (tk, key) => refineWeapon(tk, inst.id, key, inst.version, rulesVersion, times), undefined, { quiet: true })
    const r = out?.receipt?.result as { rolls?: WeaponRoll[] } | undefined
    if (r?.rolls) { setTried(true); if (times > 1) setRolls(r.rolls) }
  }
  const decide = (d: "accept" | "reject") => void act("decide-" + inst.id, (tk, key) => decideWeapon(tk, inst.id, d, key), undefined, { quiet: true })
  return (
    <Inspector title={t("wfRefineTitle", "Refinar")}>
      <div className="flex items-center justify-between gap-2">
        <span className={teko.className + " text-[26px] leading-none tabular-nums"} style={{ color: AE.text }}>
          {t("wfLevelShort", "Nv {n}").replace("{n}", String(inst.weaponLevel || 1))}
        </span>
        <WeaponStars stars={inst.stars || 1} size={14} t={t} />
      </div>
      {!view ? (
        <p className="text-[13px] font-semibold" style={{ color: AE.goldSoft }}>{t("wfMaxLevel", "Nível máximo ({n}).").replace("{n}", String(maxLevel))}</p>
      ) : view.pending ? (
        <PendingResult xp={view.xp} need={view.need} roll={view.pending.xp} tier={view.pending.tier} t={t} busy={busy} onDecide={decide} />
      ) : (
        <>
          <XpBar xp={view.xp} need={view.need} t={t} />
          <PowderLine id={view.powder} have={have} byId={byId} t={t} />
          {rolls ? <BatchResult rolls={rolls} t={t} /> : <p className="text-[12px]" style={{ color: AE.muted }}>{t("wfRefineHow", "Cada tentativa gasta 1 pó da classe da arma e dá XP: pode ser muito, pouco ou até tirar. Você aceita ou recusa — a arma nunca desce de nível.")}</p>}
          <BonusDiff before={view.bonusBefore} after={view.bonusAfter} t={t} />
          <div className="mt-auto grid gap-2">
            {have < 1 && <p className="text-[12px]" style={{ color: AE.bad }}>{t("wfNoPowderClass", "Falta o pó da classe {r}. Ele cai nos Domínios, nas lutas e nas partidas, e sai na loja de troca.").replace("{r}", rankName)}</p>}
            <div className="grid gap-2">
              <AetherButton busy={busy} disabled={have < 1 || busy} onClick={() => void run(1)}>{tried ? t("wfRefineMore", "Refinar mais uma vez") : t("wfRefineButton", "Refinar")}</AetherButton>
              <AetherButton tone="secondary" busy={busy} disabled={have < 1 || busy} onClick={() => void run(batch)}>{t("wfRefineTen", "Refinar {n} vezes").replace("{n}", String(batch))}</AetherButton>
            </div>
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
  // o servidor manda; sem regra, a mesma escada dele: E = 20 e +20 por classe (… Divina = 200)
  const needOf = (r: Rank) => rules?.fragmentNeed?.[r] || 20 * (RANKS.indexOf(r) + 1)
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
      return <PairView p={p} item={chosen} onBack={() => setOpen(null)} inspector={<AssembleInspector {...p} item={chosen} need={needOf(rank)} fragment={fragOf(rank)} />} />
    const items: CarouselItem[] = list.map((it) => {
      const own = (bag.instances || []).filter((x) => x.item === it.id).length
      return { key: it.id, label: nameOf(it, t), thumb: gearThumb(it), render: () => <WeaponThumb item={it} t={t} onOpen={() => setOpen(it.id)} count={own} /> }
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
      <PairView p={p} item={chosenItem} inst={chosen} onBack={() => setOpen(null)}
        inspector={mode === "refine"
          ? <RefineInspector key={chosen.id} {...p} item={chosenItem} inst={chosen} maxLevel={maxLevel} rulesVersion={rules?.rulesVersion} batch={rules?.batch || 10} />
          : <StarsInspector key={chosen.id} {...p} item={chosenItem} inst={chosen} maxStars={maxStars} />} />
    )
  const items: CarouselItem[] = copies.map((x) => {
    const it = byId.get(x.item)!
    return { key: x.id, label: nameOf(it, t), thumb: gearThumb(it), render: () => <WeaponThumb item={it} inst={x} t={t} onOpen={() => setOpen(x.id)} /> }
  })
  return <AetherCarousel key={"list-" + mode} title={mode === "refine" ? t("wfRefineTitle", "Refinar") : t("wfStarsTitle", "Subir estrela")} items={items} cardWidth={240} cardHeight={360}
    empty={t("wfNoWeapon", "Nenhuma arma na mochila. Monte uma na Forja com fragmentos de classe.")} />
}
