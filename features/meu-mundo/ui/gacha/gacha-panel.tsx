"use client"

// features/meu-mundo/ui/gacha/gacha-panel.tsx — gacha-v1 (24/11/2026): CONVOCAÇÕES, o portão da gaveta.
//
// Três banners que entregam SÓ fragmentos (Armas: de classe; Proteções: da peça, com peça-alvo opcional;
// Personagens: dos 12 jogáveis, alvo obrigatório e 50/50). Custo: Faísca de Éter (só se ganha jogando).
// Tudo que a tela mostra vem do servidor: chances publicadas, garantias, saldo, contador. O giro:
//   • a chave do pedido nasce ANTES de enviar e fica no aparelho até a resposta: caiu a rede, "Tentar de novo"
//     reenvia a MESMA chave (o servidor devolve o mesmo resultado, nunca cobra duas vezes); reabriu o painel,
//     ele recupera pela chave (GET /gacha/pull/:key) e mostra a abertura do que já foi salvo;
//   • a abertura (gacha-reveal) só começa com o recibo na mão. Sem simular vitória.

import { useCallback, useEffect, useMemo, useState } from "react"
import { History, Loader2, Shield, Sparkles, Sword, Users } from "lucide-react"
import { getToken } from "@/lib/auth"
import {
  getGacha,
  getGachaHistory,
  getGachaPull,
  getGear,
  postGachaPull,
  type GachaBanner,
  type GachaBannerRules,
  type GachaPullResult,
  type GachaRules,
  type GachaState,
  type GearBag,
  type GearItem,
} from "../../data"
import { speciesBody } from "../../characters/rules"
import { speciesName } from "../../characters/names"
import type { BodyId } from "../../types"
import { PORTRAIT } from "../portraits"
import { gearThumb, nameOf } from "../gear/gear-card"
import { AetherModal } from "../kit/aether-modal"
import { AE, RANK, type Rank } from "../kit/aether-tokens"
import { RankSeal } from "../kit/rank-seal"
import { teko } from "../status/evo-skin"
import GachaReveal, { TIER_RANK, type RevealItemInfo } from "./gacha-reveal"

type Tr = (key: string, fallback: string) => string
type Tab = GachaBanner | "history"

const PENDING_KEY = "freelandoo:mm-gacha-pending"
type Pending = { key: string; banner: GachaBanner; times: number; target: string | null }
const newKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`)
const readPending = (): Pending | null => {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    return raw ? (JSON.parse(raw) as Pending) : null
  } catch {
    return null
  }
}
const writePending = (p: Pending | null) => {
  try {
    if (p) localStorage.setItem(PENDING_KEY, JSON.stringify(p))
    else localStorage.removeItem(PENDING_KEY)
  } catch {
    /* modo privado: o giro segue, só não se recupera depois de recarregar */
  }
}

const BANNER_ICON = { weapons: Sword, protections: Shield, characters: Users } as const
const BANNER_TITLE: Record<GachaBanner, [string, string]> = {
  weapons: ["gaWeaponsTitle", "Convocação das Armas"],
  protections: ["gaProtectionsTitle", "Convocação das Proteções"],
  characters: ["gaCharactersTitle", "Convocação dos Personagens"],
}
const BANNER_TEXT: Record<GachaBanner, [string, string]> = {
  weapons: ["gaWeaponsText", "Fragmentos de classe (E a Divina). Junte os da classe e monte na Forja a arma que quiser daquela classe."],
  protections: ["gaProtectionsText", "Fragmentos das peças de proteção. Marque uma peça-alvo: quando sair a classe dela, o fragmento é dela."],
  characters: ["gaCharactersText", "Fragmentos dos 12 personagens jogáveis. No Topo: 50% do seu alvo; se errar, o próximo Topo é garantido nele."],
}

export default function GachaPanel({ t, onClose, onOpenForge }: { t: Tr; onClose: () => void; onOpenForge?: () => void }) {
  const [tab, setTab] = useState<Tab>("weapons")
  const [rules, setRules] = useState<GachaRules | null>(null)
  const [states, setStates] = useState<Record<GachaBanner, GachaState> | null>(null)
  const [spark, setSpark] = useState(0)
  const [items, setItems] = useState<Map<string, GearItem>>(new Map())
  const [bag, setBag] = useState<GearBag | null>(null)
  const [targets, setTargets] = useState<Record<GachaBanner, string | null>>({ weapons: null, protections: null, characters: null })
  const [confirm, setConfirm] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [retry, setRetry] = useState<Pending | null>(null)
  const [reveal, setReveal] = useState<GachaPullResult | null>(null)
  const [failed, setFailed] = useState<string | null>(null)

  const refreshGear = useCallback(async (token: string) => {
    const g = await getGear(token)
    if (g.ok) {
      setItems(new Map(g.data.gear.items.map((i) => [i.id, i])))
      setBag(g.data.bag)
    }
  }, [])

  const load = useCallback(async () => {
    const token = getToken()
    if (!token) return
    const r = await getGacha(token)
    if (!r.ok) return setFailed(r.error)
    setRules(r.data.rules)
    setSpark(r.data.spark)
    const map = Object.fromEntries(r.data.states.map((s) => [s.banner, s])) as Record<GachaBanner, GachaState>
    setStates(map)
    setTargets((cur) => ({
      weapons: null,
      protections: cur.protections ?? map.protections?.target ?? null,
      characters: cur.characters ?? map.characters?.target ?? r.data.rules.banners.find((b) => b.id === "characters")?.targets?.[0]?.id ?? null,
    }))
    await refreshGear(token)
  }, [refreshGear])

  // abre: carrega e recupera um giro que ficou sem resposta (recarregou / caiu a rede)
  useEffect(() => {
    let alive = true
    void (async () => {
      await load()
      const p = readPending()
      const token = getToken()
      if (!p || !token || !alive) return
      const r = await getGachaPull(token, p.key)
      if (!alive) return
      if (r.ok) {
        writePending(null)
        setReveal(r.data.receipt.result)
        await load()
      } else if (r.status === 404) {
        // o servidor não recebeu: nada foi cobrado; deixa reenviar com a MESMA chave
        setRetry(p)
        setTab(p.banner)
      }
    })()
    return () => {
      alive = false
    }
  }, [load])

  const send = useCallback(
    async (p: Pending) => {
      const token = getToken()
      if (!token || busy) return
      setBusy(true)
      setMsg(null)
      writePending(p)
      const r = await postGachaPull(token, p.banner, p.times, p.key, p.target, rules?.version)
      setBusy(false)
      setConfirm(null)
      if (r.ok) {
        writePending(null)
        setRetry(null)
        if (r.data.state) setStates((s) => (s ? { ...s, [p.banner]: r.data.state! } : s))
        if (typeof r.data.spark === "number") setSpark(r.data.spark)
        if (r.data.bag) setBag(r.data.bag)
        setReveal(r.data.receipt.result)
        return
      }
      if (r.status === 0 || r.status >= 500) {
        // sem resposta: pode ter sido salvo. A mesma chave recupera ou repete sem cobrar de novo.
        setRetry(p)
        setMsg(t("gaNetwork", "A resposta não chegou. Toque em “Tentar de novo”: o mesmo pedido nunca é cobrado duas vezes."))
        return
      }
      writePending(null)
      setRetry(null)
      setMsg(r.error)
      if (r.status === 410) void load()
    },
    [busy, rules?.version, t, load],
  )

  const charByFrag = useMemo(
    () => new Map((rules?.banners.find((b) => b.id === "characters")?.targets ?? []).map((c) => [c.frag, c.id])),
    [rules],
  )

  const info = useCallback(
    (id: string): RevealItemInfo => {
      const it = items.get(id)
      // fragmento de personagem: o retrato e o nome curto (o ícone genérico do fragmento não diz quem é)
      const who = charByFrag.get(id)
      const body = who ? (speciesBody(who, "m", "young") as BodyId | null) : null
      const icon = it ? gearThumb(it) : null
      return {
        name: who ? speciesName(who, t) : it ? nameOf(it, t) : id,
        thumb: who ? (body && PORTRAIT[body]) || icon : icon,
        have: bag?.owned?.[id]?.qty ?? 0,
        need: it?.fragment?.need ?? null,
      }
    },
    [items, bag, t, charByFrag],
  )

  const banner = tab !== "history" ? rules?.banners.find((b) => b.id === tab) ?? null : null
  const st = tab !== "history" ? states?.[tab] ?? null : null

  return (
    <>
      <AetherModal title={t("gaTitle", "Convocações")} eyebrow={t("gaEyebrow", "Fragmentos de éter")} onClose={onClose} width={720} z={88}>
        <div className="flex flex-wrap gap-1.5" role="tablist">
          {(["weapons", "protections", "characters", "history"] as Tab[]).map((id) => {
            const Icon = id === "history" ? History : BANNER_ICON[id]
            const on = tab === id
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => {
                  setTab(id)
                  setConfirm(null)
                  setMsg(null)
                }}
                className={`${teko.className} flex items-center gap-1.5 px-3 py-1.5 text-[17px] uppercase tracking-[0.06em]`}
                style={{ background: on ? AE.brassPlate : AE.steel, color: on ? AE.gold : AE.goldSoft, boxShadow: `inset 0 0 0 1px ${on ? AE.gold : AE.brassLine}` }}
              >
                <Icon className="h-4 w-4" />
                {id === "history" ? t("gaHistory", "Histórico") : id === "weapons" ? t("gaWeaponsTab", "Armas") : id === "protections" ? t("gaProtectionsTab", "Proteções") : t("gaCharactersTab", "Personagens")}
              </button>
            )
          })}
          <span className="ml-auto flex items-center gap-1 text-[13px]" style={{ color: AE.goldSoft }} aria-live="polite">
            <Sparkles className="h-4 w-4" style={{ color: AE.gold }} />
            {t("gaSpark", "{n} Faísca(s) de Éter").replace("{n}", String(spark))}
          </span>
        </div>

        {failed && <p className="mt-4 text-center text-[14px]" style={{ color: "#FF6B78" }}>{failed}</p>}
        {!rules && !failed && <Loader2 className="mx-auto my-10 h-6 w-6 animate-spin" style={{ color: AE.goldSoft }} />}

        {tab === "history" && <HistoryView t={t} info={info} />}

        {banner && st && (
          <BannerView
            t={t}
            rules={rules!}
            banner={banner}
            st={st}
            spark={spark}
            target={targets[banner.id]}
            setTarget={(v) => setTargets((x) => ({ ...x, [banner.id]: v }))}
            info={info}
            items={items}
            confirm={confirm}
            setConfirm={setConfirm}
            busy={busy}
            onPull={(times) => send({ key: newKey(), banner: banner.id, times, target: targets[banner.id] })}
          />
        )}

        {msg && (
          <p className="mt-3 p-2 text-[13px]" style={{ background: AE.steel, color: AE.goldSoft, boxShadow: `inset 0 0 0 1px ${AE.brassLine}` }} role="status">
            {msg}
          </p>
        )}
        {retry && (
          <button type="button" disabled={busy} onClick={() => send(retry)} className={`${teko.className} mt-2 px-3 py-1.5 text-[17px] uppercase`} style={{ background: AE.brassPlate, color: AE.gold, boxShadow: "3px 3px 0 #000" }}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("gaRetry", "Tentar de novo")}
          </button>
        )}
      </AetherModal>

      {reveal && (
        <GachaReveal
          t={t}
          pull={reveal}
          info={info}
          onClose={() => {
            setReveal(null)
            const token = getToken()
            if (token) void refreshGear(token)
          }}
          onUse={onOpenForge}
        />
      )}
    </>
  )
}

function BannerView({
  t,
  rules,
  banner,
  st,
  spark,
  target,
  setTarget,
  info,
  items,
  confirm,
  setConfirm,
  busy,
  onPull,
}: {
  t: Tr
  rules: GachaRules
  banner: GachaBannerRules
  st: GachaState
  spark: number
  target: string | null
  setTarget: (v: string | null) => void
  info: (id: string) => RevealItemInfo
  items: Map<string, GearItem>
  confirm: number | null
  setConfirm: (n: number | null) => void
  busy: boolean
  onPull: (times: number) => void
}) {
  const [showRates, setShowRates] = useState(false)
  const needTarget = banner.target === "required" && !target
  const cost = (n: number) => n * rules.costPerPull
  const tierName = (tier: string) => t(`gaTier_${tier}`, tier === "common" ? "Comum" : tier === "rare" ? "Raro" : tier === "epic" ? "Épico" : "Topo")
  const protTargets = useMemo(() => {
    const list = banner.targets ?? []
    return [...list].sort((a, b) => Object.keys(RANK).indexOf(a.rank || "E") - Object.keys(RANK).indexOf(b.rank || "E"))
  }, [banner.targets])

  return (
    <div className="mt-3">
      <h3 className={`${teko.className} text-[26px] uppercase leading-none tracking-[0.06em]`} style={{ color: AE.gold }}>
        {t(BANNER_TITLE[banner.id][0], BANNER_TITLE[banner.id][1])}
      </h3>
      <p className="mt-1 text-[13px] leading-snug" style={{ color: "#C9CED6" }}>{t(BANNER_TEXT[banner.id][0], BANNER_TEXT[banner.id][1])}</p>

      {/* garantias */}
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Pity label={t("gaPityRare", "Raro ou melhor garantido")} left={st.toRare} total={rules.pity.rare} color={RANK.A.color} t={t} />
        <Pity label={t("gaPityTop", "Topo garantido")} left={st.toTop} total={rules.pity.top} color={RANK.legendary.color} t={t} />
      </div>
      {banner.id === "characters" && (
        <p className="mt-1.5 text-[12px]" style={{ color: st.guaranteed ? RANK.legendary.color : "#9AA3AE" }}>
          {st.guaranteed ? t("gaGuaranteedOn", "O próximo Topo é garantido no seu alvo.") : t("gaGuaranteedOff", "Próximo Topo: 50% no seu alvo.")}
        </p>
      )}

      {/* alvo */}
      {banner.id === "characters" && (
        <div className="mt-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: "#9AA3AE" }}>{t("gaTargetChar", "Seu alvo")}</span>
          <div className="mt-1 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
            {(banner.targets ?? []).map((c) => {
              const body = speciesBody(c.id, "m", "young") as BodyId | null
              const on = target === c.id
              return (
                <button key={c.id} type="button" onClick={() => setTarget(c.id)} aria-pressed={on} className="flex flex-col items-center p-1" style={{ background: on ? AE.steelHi : AE.steel, boxShadow: `inset 0 0 0 ${on ? 2 : 1}px ${on ? AE.gold : AE.brassLine}` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={(body && PORTRAIT[body]) || PORTRAIT.sergio} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                  <span className="mt-0.5 line-clamp-1 text-[10px]" style={{ color: on ? AE.gold : AE.goldSoft }}>{speciesName(c.id, t)}</span>
                  <span className="text-[9px]" style={{ color: "#9AA3AE" }}>{info(c.frag).have}/{info(c.frag).need ?? 100}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
      {banner.id === "protections" && (
        <label className="mt-3 block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: "#9AA3AE" }}>{t("gaTargetPiece", "Peça-alvo (opcional)")}</span>
          <select value={target ?? ""} onChange={(e) => setTarget(e.target.value || null)} className="mt-1 w-full px-2 py-2 text-[13px]" style={{ background: AE.well, color: AE.goldSoft, boxShadow: `inset 0 0 0 1px ${AE.brassLine}` }}>
            <option value="">{t("gaNoTarget", "Sem alvo (sorteio entre as peças da classe)")}</option>
            {protTargets.map((p) => {
              const it = items.get(p.id)
              return (
                <option key={p.id} value={p.id}>
                  {RANK[(p.rank as Rank) || "E"].label} · {it ? nameOf(it, t) : p.id} · {info(p.frag).have}/{info(p.frag).need ?? "?"}
                </option>
              )
            })}
          </select>
        </label>
      )}

      {/* chances publicadas */}
      <button type="button" onClick={() => setShowRates((v) => !v)} className="mt-3 text-[12px] underline" style={{ color: AE.goldSoft }} aria-expanded={showRates}>
        {showRates ? t("gaRatesHide", "Esconder as chances") : t("gaRatesShow", "Ver as chances e as regras")}
      </button>
      {showRates && (
        <div className="mt-2 p-2 text-[12px]" style={{ background: AE.well, color: "#C9CED6", boxShadow: `inset 0 0 0 1px ${AE.brassLine}` }}>
          <table className="w-full">
            <thead>
              <tr style={{ color: "#9AA3AE" }}>
                <th className="text-left font-normal">{banner.id === "characters" ? t("gaColTier", "Faixa") : t("gaColClass", "Classe")}</th>
                <th className="text-right font-normal">{t("gaColBase", "Chance base")}</th>
                <th className="text-right font-normal">{t("gaColQty", "Fragmentos")}</th>
              </tr>
            </thead>
            <tbody>
              {banner.rates.map((r, i) => (
                <tr key={i}>
                  <td>{r.rank ? <RankSeal rank={r.rank as Rank} t={t} size="sm" /> : <span style={{ color: RANK[TIER_RANK[r.tier]].color }}>{tierName(r.tier)}</span>}</td>
                  <td className="text-right">{r.base.toLocaleString(undefined, { maximumFractionDigits: 2 })}%</td>
                  <td className="text-right">×{r.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="mt-2 list-disc space-y-0.5 pl-4">
            <li>{t("gaRuleRare", "A cada {n} giros sem Raro ou melhor, o {n}º é Raro ou melhor.").replaceAll("{n}", String(rules.pity.rare))}</li>
            <li>{t("gaRuleTop", "O {n}º giro sem Topo é Topo. Com essa garantia, o Topo sai em {p}% dos giros em média.").replace("{n}", String(rules.pity.top)).replace("{p}", banner.topConsolidated.toLocaleString(undefined, { maximumFractionDigits: 2 }))}</li>
            <li>{t("gaRuleSeparate", "Cada Convocação tem o seu contador, que não zera quando o catálogo muda.")}</li>
            <li>{t("gaRuleOnlyFrag", "Todo prêmio é fragmento. Cada prêmio vale 1/10 da peça daquela classe.")}</li>
            <li>{t("gaRuleSpark", "Faísca de Éter só se ganha jogando (Domínios e Loja de troca); não se compra com Gold nem Esmeralda.")}</li>
          </ul>
        </div>
      )}

      {/* giro com custo explícito e confirmação */}
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        {needTarget && <span className="text-[12px]" style={{ color: "#FF6B78" }}>{t("gaNeedTarget", "Escolha o alvo primeiro.")}</span>}
        {confirm == null ? (
          rules.times.map((n) => (
            <button
              key={n}
              type="button"
              disabled={busy || needTarget || spark < cost(n)}
              onClick={() => setConfirm(n)}
              className={`${teko.className} px-4 py-2 text-[19px] uppercase disabled:opacity-40`}
              style={{ background: n === 1 ? AE.brassPlate : AE.goldPlate, color: n === 1 ? AE.gold : "#1a1200", boxShadow: "3px 3px 0 #000" }}
            >
              {t("gaPullN", "Convocar {n}×").replace("{n}", String(n))} · {cost(n)} <Sparkles className="inline h-4 w-4" />
            </button>
          ))
        ) : (
          <div className="flex flex-wrap items-center gap-2 p-2" style={{ background: AE.steel, boxShadow: `inset 0 0 0 1px ${AE.gold}` }}>
            <span className="text-[13px]" style={{ color: AE.goldSoft }}>
              {t("gaConfirm", "Gastar {c} Faísca(s) de Éter ({a} → {b})?").replace("{c}", String(cost(confirm))).replace("{a}", String(spark)).replace("{b}", String(spark - cost(confirm)))}
            </span>
            <button type="button" onClick={() => setConfirm(null)} className={`${teko.className} px-3 py-1 text-[17px] uppercase`} style={{ background: AE.iron, color: AE.goldSoft, boxShadow: `inset 0 0 0 1px ${AE.brassLine}` }}>
              {t("gaCancel", "Cancelar")}
            </button>
            <button type="button" disabled={busy} onClick={() => onPull(confirm)} className={`${teko.className} flex items-center gap-1 px-3 py-1 text-[17px] uppercase`} style={{ background: AE.goldPlate, color: "#1a1200", boxShadow: "3px 3px 0 #000" }}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("gaConfirmGo", "Convocar")}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Pity({ label, left, total, color, t }: { label: string; left: number; total: number; color: string; t: Tr }) {
  const done = total - left
  return (
    <div className="p-2" style={{ background: AE.steel, boxShadow: `inset 0 0 0 1px ${AE.brassLine}` }}>
      <div className="flex justify-between text-[12px]" style={{ color: "#C9CED6" }}>
        <span>{label}</span>
        <span style={{ color }}>{t("gaPityLeft", "em até {n} giro(s)").replace("{n}", String(left))}</span>
      </div>
      <div className="mt-1 h-1.5 w-full" style={{ background: AE.well }}>
        <div className="h-full" style={{ width: `${Math.max(0, Math.min(100, (done / total) * 100))}%`, background: color }} />
      </div>
    </div>
  )
}

function HistoryView({ t, info }: { t: Tr; info: (id: string) => RevealItemInfo }) {
  const [list, setList] = useState<(GachaPullResult & { key: string; at: string })[]>([])
  const [next, setNext] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const more = useCallback(async (before: string | null) => {
    const token = getToken()
    if (!token) return
    setLoading(true)
    const r = await getGachaHistory(token, before)
    setLoading(false)
    if (!r.ok) return
    setList((cur) => (before ? [...cur, ...r.data.items] : r.data.items))
    setNext(r.data.next)
  }, [])
  useEffect(() => {
    void more(null)
  }, [more])
  return (
    <div className="mt-3">
      {!loading && !list.length && <p className="text-[13px]" style={{ color: "#9AA3AE" }}>{t("gaHistoryEmpty", "Nenhuma Convocação ainda.")}</p>}
      <ul className="space-y-1.5">
        {list.map((h) => (
          <li key={h.key} className="p-2 text-[12px]" style={{ background: AE.steel, boxShadow: `inset 0 0 0 1px ${AE.brassLine}` }}>
            <div className="flex justify-between" style={{ color: "#9AA3AE" }}>
              <span>{t(BANNER_TITLE[h.banner][0], BANNER_TITLE[h.banner][1])} · {h.times}×</span>
              <span>{new Date(h.at).toLocaleString()}</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {h.results.map((r, i) => (
                <span key={i} className="px-1" style={{ color: RANK[(r.rank as Rank) || TIER_RANK[r.tier]].color, boxShadow: "inset 0 0 0 1px currentColor" }}>
                  {info(r.item).name} ×{r.qty}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
      {loading && <Loader2 className="mx-auto my-4 h-5 w-5 animate-spin" style={{ color: AE.goldSoft }} />}
      {next && !loading && (
        <button type="button" onClick={() => more(next)} className="mt-2 text-[12px] underline" style={{ color: AE.goldSoft }}>
          {t("gaHistoryMore", "Ver mais")}
        </button>
      )}
    </div>
  )
}
