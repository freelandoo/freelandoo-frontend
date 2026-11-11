"use client"

import { useState } from "react"
import { useLocale } from "@/components/i18n/I18nProvider"
import { refineGear, resolveRefinement, type GearBag, type GearItem, type RefinementProposal } from "../../data"
import { AetherButton } from "../kit/aether-modal"
import { AE } from "../kit/aether-tokens"
import { GearItemCard, bonusLines, nameOf, percentage, type GearAction, type GearTr } from "./gear-card"

function ProposalResult({ proposal, t, act, busy }: { proposal: RefinementProposal; t: GearTr; act: GearAction; busy: boolean }) {
  const locale = useLocale()
  const direction = proposal.candidateLevel - proposal.fromLevel
  const colour = direction > 0 ? AE.good : direction < 0 ? AE.bad : AE.goldSoft
  const [confirmApply, setConfirmApply] = useState(false)
  return (
    <>
      <p className="text-[13px] font-bold" style={{ color: colour }}>
        {t("refineResult", "Resultado proposto: +{before} → +{after}").replace("{before}", String(proposal.fromLevel)).replace("{after}", String(proposal.candidateLevel))}
      </p>
      <div className="grid grid-cols-2 gap-2 text-[12px]" style={{ color: AE.text }}>
        <div><p className="mb-1 font-bold">{t("refineCurrent", "Atual")}</p>{bonusLines(proposal.beforeBonus, t).map(line => <p key={line}>{line}</p>)}</div>
        <div><p className="mb-1 font-bold">{t("refineProposed", "Proposto")}</p>{bonusLines(proposal.candidateBonus, t).map(line => <p key={line}>{line}</p>)}</div>
      </div>
      <p className="text-[12px]" style={{ color: AE.muted }}>
        {t("refineSpent", "A tentativa já foi paga. Recusar mantém o equipamento atual; moedas e materiais não são devolvidos.")}
      </p>
      <p className="text-[12px]" style={{ color: AE.muted }}>
        {t("refineExpires", "Decidir até {time}. Após isso, o resultado é descartado.").replace("{time}", new Date(proposal.expiresAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }))}
      </p>
      {confirmApply ? (
        <div className="grid gap-2">
          <p className="text-[13px] font-semibold" style={{ color: AE.bad }}>{t("refineLowerConfirm", "Este resultado reduz o refinamento. Deseja mesmo aplicar?")}</p>
          <AetherButton busy={busy} onClick={() => void act("accept-" + proposal.id, (tk, key) => resolveRefinement(tk, proposal.id, true, key), t("refineApplied", "Refinamento aplicado."))}>{t("refineApplyLower", "Aplicar a redução")}</AetherButton>
          <AetherButton tone="secondary" disabled={busy} onClick={() => setConfirmApply(false)}>{t("gearCancel", "Voltar")}</AetherButton>
        </div>
      ) : (
        <AetherButton disabled={busy} onClick={() => direction < 0 ? setConfirmApply(true) : void act("accept-" + proposal.id, (tk, key) => resolveRefinement(tk, proposal.id, true, key), t("refineApplied", "Refinamento aplicado."))}>
          {t("refineAccept", "Aceitar resultado")}
        </AetherButton>
      )}
      <AetherButton tone="secondary" busy={busy} onClick={() => void act("discard-" + proposal.id, (tk, key) => resolveRefinement(tk, proposal.id, false, key), t("refineDiscarded", "Resultado recusado. Equipamento preservado."))}>
        {t("refineDiscard", "Recusar e manter o atual")}
      </AetherButton>
    </>
  )
}

export function RefinementCard({ item, bag, byId, t, act, busy }: {
  item: GearItem; bag: GearBag; byId: Map<string, GearItem>; t: GearTr; act: GearAction; busy: boolean
}) {
  const [protect, setProtect] = useState(false)
  const [confirmQuote, setConfirmQuote] = useState<string | null>(null)
  const previews = bag.refinement?.[item.id]
  const quote = protect ? previews?.protected : previews?.standard
  const proposal = bag.pendingProposals?.find(p => p.item === item.id && p.status === "pending")
  const level = bag.owned[item.id]?.level || 0
  const affordable = !!quote && bag.coins >= quote.cost.coins && Object.entries(quote.cost.needs).every(([id, n]) => (bag.owned[id]?.qty || 0) >= n)
  return (
    <GearItemCard item={item} t={t} subtitle={t("refineLevel", "Refinamento atual: +{n}").replace("{n}", String(level))}>
      {proposal ? <ProposalResult key={proposal.id} proposal={proposal} t={t} act={act} busy={busy} /> : !quote ? (
        <p className="text-[13px]" style={{ color: AE.muted }}>{t("refineUnavailable", "No máximo ou sem refinamento disponível.")}</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-1 text-center text-[12px] font-bold">
            <p style={{ color: AE.good }}>{t("refineUp", "Subir")}<br />{percentage(quote.odds.up)}</p>
            <p style={{ color: AE.goldSoft }}>{t("refineSame", "Manter")}<br />{percentage(quote.odds.same)}</p>
            <p style={{ color: AE.bad }}>{t("refineDown", "Descer")}<br />{percentage(quote.odds.down)}</p>
          </div>
          <p className="text-[13px] font-semibold" style={{ color: AE.goldSoft }}>{t("refineCost", "Tentativa: {n} moedas").replace("{n}", String(quote.cost.coins))}</p>
          <ul className="grid gap-1 text-[12px]" style={{ color: AE.muted }}>
            {Object.entries(quote.cost.needs).map(([id, qty]) => <li key={id} style={{ color: (bag.owned[id]?.qty || 0) < qty ? AE.bad : AE.muted }}>{byId.has(id) ? nameOf(byId.get(id)!, t) : id}: {bag.owned[id]?.qty || 0}/{qty}</li>)}
          </ul>
          <label className="flex min-h-11 items-center gap-2 text-[12px]" style={{ color: AE.text }}>
            <input type="checkbox" checked={protect} disabled={busy} onChange={e => { setProtect(e.target.checked); setConfirmQuote(null) }} />
            {t("refineProtect", "Usar selos para impedir queda")}
          </label>
          <p className="text-[12px]" style={{ color: AE.aether }}>
            {quote.pity.guaranteed ? t("refineGuaranteed", "Próxima melhoria garantida pela persistência.") : t("refinePity", "Tentativas sem melhoria: {n}/{max}").replace("{n}", String(quote.pity.failures)).replace("{max}", String(quote.pity.guaranteeAt))}
          </p>
          <p className="text-[12px]" style={{ color: AE.muted }}>{t("refineFloor", "Piso protegido: +{n}. A arma não é destruída.").replace("{n}", String(quote.floor))}</p>
          {confirmQuote === quote.id ? (
            <>
              <p className="text-[12px]" style={{ color: AE.bad }}>{t("refineConsent", "Gastar os recursos e sortear? Você poderá aceitar ou recusar o resultado; o custo não é reembolsado.")}</p>
              <AetherButton disabled={!affordable} busy={busy} onClick={() => void act("refine-" + item.id + "-" + quote.id, (tk, key) => refineGear(tk, item.id, quote.id, protect, key, bag.owned[item.id]?.instance))}>{t("refinePay", "Pagar e revelar resultado")}</AetherButton>
              <AetherButton tone="secondary" disabled={busy} onClick={() => setConfirmQuote(null)}>{t("gearCancel", "Voltar")}</AetherButton>
            </>
          ) : <AetherButton disabled={!affordable || busy} onClick={() => setConfirmQuote(quote.id)}>{affordable ? t("refineAttempt", "Preparar refinamento") : t("refineMissing", "Faltam moedas ou materiais")}</AetherButton>}
        </>
      )}
    </GearItemCard>
  )
}
