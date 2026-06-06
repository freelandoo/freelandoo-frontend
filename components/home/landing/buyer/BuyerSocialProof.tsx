import { Section } from "@/components/home/landing"

// Sem números inventados — provas qualitativas (alcance, variedade, segurança).
const STATS = [
  { value: "Brasil inteiro", label: "profissionais de todas as regiões" },
  { value: "15 enxames", label: "áreas e centenas de profissões" },
  { value: "100% protegido", label: "pagamento seguro em toda compra" },
]

export function BuyerSocialProof() {
  return (
    <Section className="py-8 sm:py-10">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {STATS.map((s) => (
          <div
            key={s.value}
            className="rounded-xl border-2 border-[#0B0B0D] bg-white px-5 py-4 text-center shadow-[4px_4px_0_0_#0B0B0D]"
          >
            <div className="fl-display text-2xl text-[#0B0B0D]">{s.value}</div>
            <div className="text-xs font-semibold text-[#3a352c]">{s.label}</div>
          </div>
        ))}
      </div>
    </Section>
  )
}
