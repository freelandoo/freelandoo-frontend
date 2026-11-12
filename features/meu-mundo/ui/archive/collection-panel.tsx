"use client"
// Trilha E18 — COLEÇÃO, no Arquivo: todo item do jogo, descoberto ou não (o oculto aparece como "???"
// até alguém da conta achá-lo), e os BAÚS — cada um mora num ponto do bairro ou do centro e abre uma
// vez por conta. O servidor confere o lugar (a última visita) e grava o recibo; aqui só se mostra.
import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { getToken } from "@/lib/auth"
import { getCollection, getGear, openChest, type Collection, type GearCategory, type GearItem } from "../../data"
import { AE, RARITY, chamfer } from "../kit/aether-tokens"
import { celebrate } from "../rewards/reward-bus"

type T = (k: string, f: string) => string
const ORDER: GearCategory[] = ["weapon", "offhand", "shield", "armor", "accessory", "relic", "rune", "consumable", "fragment", "material", "currency", "recipe", "quest", "cosmetic"]

export function CollectionPanel({ t }: { t: T }) {
  const [data, setData] = useState<Collection | null>(null)
  const [names, setNames] = useState<Map<string, GearItem>>(new Map())
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const load = useCallback(async () => {
    const tk = getToken()
    if (!tk) return
    const [c, g] = await Promise.all([getCollection(tk), getGear(tk)])
    if (c.ok) setData(c.data)
    if (g.ok) setNames(new Map(g.data.gear.items.map((it) => [it.id, it])))
  }, [])
  useEffect(() => { void load() }, [load])
  const groups = useMemo(() => {
    const out = new Map<string, Collection["items"]>()
    for (const it of data?.items || []) out.set(it.category, [...(out.get(it.category) || []), it])
    return ORDER.filter((k) => out.has(k)).map((k) => [k, out.get(k)!] as const)
  }, [data])
  const open = async (chest: string) => {
    const tk = getToken()
    if (!tk || busy) return
    setBusy(chest)
    setMessage(null)
    const r = await openChest(tk, chest, crypto.randomUUID())
    setBusy(null)
    if (!r.ok) return setMessage(r.error)
    if (r.data.receipt) celebrate(r.data.receipt)
    void load()
  }
  if (!data) return <Loader2 className="mx-auto my-10 h-6 w-6 animate-spin" style={{ color: AE.goldSoft }} />
  const nameOf = (it: Collection["items"][number]) => (it.id ? t("gear_" + it.id, it.name || names.get(it.id)?.name || it.id) : "???")
  return (
    <div className="grid gap-4">
      <p className="text-[13px] font-bold" style={{ color: AE.goldSoft }}>{t("colFound", "{n} de {total} descobertos").replace("{n}", String(data.found)).replace("{total}", String(data.total))}</p>
      <section>
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: AE.goldSoft }}>{t("colChests", "Baús")}</p>
        <p className="mb-2 text-[12px]" style={{ color: AE.muted }}>{t("colChestsHint", "Cada baú abre uma vez. Chegue no lugar dele e abra daqui.")}</p>
        <ul className="grid gap-2">
          {data.chests.map((c) => (
            <li key={c.id} className="flex min-h-12 items-center justify-between gap-2 px-3 py-2" style={{ background: AE.steel, boxShadow: `inset 0 0 0 1px ${AE.brassLine}`, clipPath: chamfer(AE.cut.chip) }}>
              <span className="min-w-0">
                <span className="block text-[14px] font-bold" style={{ color: c.opened ? AE.dim : AE.text }}>{t("chest_" + c.id, c.id)}</span>
                <span className="block text-[11px]" style={{ color: AE.dim }}>{c.where === "bairro" ? t("colWhereBairro", "No seu bairro") : t("colWhereCentro", "No centro")}</span>
              </span>
              {c.opened ? <span className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: AE.dim }}>{t("colOpened", "Aberto")}</span>
                : <button type="button" disabled={!!busy} onClick={() => void open(c.id)} className="min-h-11 px-3 text-[12px] font-bold uppercase disabled:opacity-50" style={{ background: AE.brassPlate, color: AE.gold, boxShadow: `inset 0 0 0 1px ${AE.brassLine}`, clipPath: chamfer(AE.cut.chip) }}>{t("colOpen", "Abrir")}</button>}
            </li>
          ))}
        </ul>
        {message && <p role="status" className="mt-2 text-[12px]" style={{ color: AE.bad }}>{message}</p>}
      </section>
      {groups.map(([cat, list]) => (
        <section key={cat}>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: AE.goldSoft }}>
            {t("colCat_" + cat, cat)} · {list.filter((x) => x.found).length}/{list.length}
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {list.map((it, i) => (
              <li key={(it.id || "x") + i} className="px-2 py-1 text-[12px]" title={it.found && it.at ? new Date(it.at).toLocaleDateString() : undefined}
                style={{ background: it.found ? AE.steel : AE.iron, color: it.found ? RARITY[it.rarity].color : AE.dim, boxShadow: `inset 0 0 0 1px ${AE.brassLine}` }}>
                {it.found ? nameOf(it) : "???"}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
