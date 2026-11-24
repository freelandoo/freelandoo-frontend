"use client"

// A ESCOLHA DA MORADIA — o "qual é o seu esporte" de Minha cidade.
//
// Inline, não modal: é a primeira coisa da tela para quem ainda não escolheu,
// e um diálogo por cima de uma tela vazia seria só uma caixa a mais para fechar.
// Na troca ("Trocar") ela aparece compacta logo abaixo do cabeçalho.
//
// ⚠️ Escolher NÃO cadastra nada: só diz qual aba abrir. Residência, condomínio
// e pedidos antigos ficam como estão — e a tela diz isso, senão quem troca
// acha que perdeu o bairro.

import { Building2, Home, Loader2 } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import type { HousingKind } from "./city-types"

export function HousingPicker({
  current,
  saving,
  compact = false,
  showHouse = true,
  showCondo = true,
  onPick,
}: {
  current: HousingKind | null
  saving: HousingKind | null
  compact?: boolean
  showHouse?: boolean
  showCondo?: boolean
  onPick: (kind: HousingKind) => void
}) {
  const t = useTranslations("City")

  const options: { kind: HousingKind; icon: typeof Home; title: string; desc: string; show: boolean }[] = [
    {
      kind: "house",
      icon: Home,
      title: t("houseTitle", "Moro em casa"),
      desc: t("houseDesc", "Informe sua rua e número. Você entra no seu bairro: vizinhos, mural, vitrine, delivery e ajuda com mudança."),
      show: showHouse,
    },
    {
      kind: "condo",
      icon: Building2,
      title: t("condoTitle", "Moro em condomínio"),
      desc: t("condoDesc", "Encontre ou cadastre seu condomínio e escolha seu apartamento. Avisos, enquetes, vagas, vitrine e delivery do prédio."),
      show: showCondo,
    },
  ]

  return (
    <div className={compact ? "" : "w-full max-w-3xl px-3 md:px-0"}>
      {!compact && (
        <div className="mb-4">
          <h2 className="fl-display text-2xl font-black uppercase tracking-tight">
            {t("pickTitle", "Onde você mora?")}
          </h2>
          <p className="mt-1 text-sm text-[#F5F1E8]/70">
            {t("pickSubtitle", "Escolha uma vez. Dá para trocar depois sem perder nada.")}
          </p>
        </div>
      )}
      <div role="radiogroup" aria-label={t("pickTitle", "Onde você mora?")} className="grid gap-3 sm:grid-cols-2">
        {options
          .filter((o) => o.show)
          .map((o) => {
            const on = current === o.kind
            const Icon = o.icon
            return (
              <button
                key={o.kind}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={!!saving}
                onClick={() => onPick(o.kind)}
                className={`group flex items-start gap-3 border-2 border-[#0B0B0D] p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2B705] disabled:opacity-60 ${
                  on ? "bg-[#F2B705] text-[#0B0B0D]" : "bg-[#15120E] text-[#F5F1E8] hover:bg-[#1D1810]"
                }`}
                style={{ boxShadow: "4px 4px 0 0 #0B0B0D" }}
              >
                <span className={`mt-0.5 shrink-0 ${on ? "text-[#0B0B0D]" : "text-[#F2B705]"}`}>
                  {saving === o.kind ? <Loader2 className="h-6 w-6 animate-spin" /> : <Icon className="h-6 w-6" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black uppercase tracking-[0.08em]">{o.title}</span>
                  {!compact && (
                    <span className={`mt-1 block text-xs leading-relaxed ${on ? "text-[#0B0B0D]" : "text-[#F5F1E8]/70"}`}>
                      {o.desc}
                    </span>
                  )}
                </span>
              </button>
            )
          })}
      </div>
      {compact && (
        <p className="mt-2 text-[11px] text-[#F5F1E8]/60">
          {t("switchNote", "Trocar só muda a aba que abre primeiro. Sua residência, seu condomínio e seus pedidos continuam onde estão.")}
        </p>
      )}
    </div>
  )
}
