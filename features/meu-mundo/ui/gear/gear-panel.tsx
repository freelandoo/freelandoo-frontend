"use client"

// weapon-v1 (24/11/2026): a forja ficou com o que o prompt do Alex descreve — ARMAS montadas por fragmento de
// classe, estrelas por cópia idêntica e a bancada de refino (nível 1…90, 1 pó por tentativa). Saíram: catálogo,
// índice de fragmentos, desmontar/transmutar, runas e o aprimoramento garantido. Escudos, proteções, acessórios e
// preparos continuam pela aba "Receitas" (fragmento da peça / ingredientes).

import { useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { type Receipt } from "../../data"
import { AetherModal, AetherButton } from "../kit/aether-modal"
import { AetherCarousel, AetherTabs, type CarouselItem } from "../kit/aether-carousel"
import { AE } from "../kit/aether-tokens"
import { nameOf, type GearTr } from "./gear-card"
import { ForgeCard } from "./forge-card"
import { useWorkshop } from "./use-workshop"
import { WeaponWorkshop } from "./weapon-forge"

/** B5: comprar saiu para a Loja única. "bag" (legado) abre a forja. */
export type GearTab = "bag" | "forge" | "refine"
type ForgeMode = "assemble" | "stars" | "recipes"

export default function GearPanel({ onClose, initialTab = "forge", onReceipt }: {
  onClose: () => void; initialTab?: GearTab; onReceipt?: (receipt: Receipt) => void
}) {
  const t = useTranslations("MeuMundo") as GearTr
  const { catalog, bag, busy, message, setMessage, error, load, act } = useWorkshop(t, onReceipt)
  const [tab, setTab] = useState<"forge" | "refine">(initialTab === "refine" ? "refine" : "forge")
  const [mode, setMode] = useState<ForgeMode>("assemble")
  const byId = useMemo(() => new Map((catalog?.items || []).map(item => [item.id, item])), [catalog])
  const title = tab === "forge" ? t("centerPlace_forja", "Forja das Engrenagens") : t("refineTitle", "Bancada de refinamento")
  const changeTab = (next: "forge" | "refine") => { setTab(next); setMessage(null) }

  let body: React.ReactNode
  if (!catalog || !bag) {
    body = <div className="grid min-h-48 place-items-center" style={{ color: AE.muted }}>{error ? <AetherButton onClick={() => void load()}>{t("forgeReload", "Tentar abrir novamente")}</AetherButton> : <Loader2 className="h-6 w-6 animate-spin" aria-label={t("gearLoading", "Carregando…")} />}</div>
  } else if (tab === "refine") {
    body = <WeaponWorkshop mode="refine" catalog={catalog} bag={bag} byId={byId} t={t} busy={!!busy} act={act} />
  } else if (mode !== "recipes") {
    body = <WeaponWorkshop key={mode} mode={mode} catalog={catalog} bag={bag} byId={byId} t={t} busy={!!busy} act={act} />
  } else {
    const items: CarouselItem[] = catalog.recipes
      .filter(recipe => byId.has(recipe.out) && (!byId.get(recipe.out)?.clan || byId.get(recipe.out)?.clan === bag.clan))
      .map(recipe => ({
        key: recipe.id, label: nameOf(byId.get(recipe.out)!, t),
        render: () => <ForgeCard item={byId.get(recipe.out)!} recipe={recipe} bag={bag} byId={byId} t={t} busy={!!busy} act={act} />,
      }))
    body = <AetherCarousel key="recipes" title={t("wfRecipesTab", "Receitas")} items={items} cardWidth={360} cardHeight={510} empty={t("gearNothing", "Nada por aqui ainda.")} />
  }

  return (
    <AetherModal title={title} eyebrow={bag ? t("gearHeader", "Nível {lv} · {c} moedas").replace("{lv}", String(bag.level)).replace("{c}", String(bag.coins)) : undefined} onClose={onClose} width={680}>
      <AetherTabs label={t("gearTitle", "Equipamento")} value={tab} onChange={changeTab} tabs={[
        { id: "forge" as const, label: t("gearTabForge", "Forja") },
        { id: "refine" as const, label: t("refineTab", "Refinar") },
      ]} />
      {tab === "forge" && <AetherTabs<ForgeMode> label={t("forgeKinds", "Bancadas da forja")} value={mode} onChange={(m) => { setMode(m); setMessage(null) }} tabs={[
        { id: "assemble", label: t("wfAssembleTitle", "Montar arma") },
        { id: "stars", label: t("wfStarsTitle", "Subir estrela") },
        { id: "recipes", label: t("wfRecipesTab", "Receitas") },
      ]} />}
      {body}
      {message && <p role="status" className="mt-3 text-center text-[13px]" style={{ color: AE.goldSoft }}>{message}</p>}
    </AetherModal>
  )
}
