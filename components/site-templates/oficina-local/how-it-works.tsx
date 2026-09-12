// As quatro etapas do atendimento.
//
// Vive num lugar só porque aparece na home E em toda página de serviço e de
// cidade — escrita três vezes, o dia em que uma etapa mudar ela muda só numa
// das telas.
//
// ⚠️ O TEXTO É FIXO E GENÉRICO DE PROPÓSITO, e essa é a fronteira do tema: a
// ESTRUTURA do atendimento ("contato → orientação → avaliação → serviço") é a
// mesma para qualquer prestador local, e o que é do ofício vem do DOCUMENTO.
// O site de origem dizia aqui "qual boca, se é o forno" e "cheiro de gás" —
// perfeito para fogão e errado para os outros onze ofícios que este tema vai
// servir. Detalhe de ofício entra nos campos, nunca na moldura.

import { IconGauge, IconSpark, IconWhatsapp, IconWrench } from "./icons"
import { Section, SectionHead } from "./ui"

export const STEPS = [
  {
    n: "01",
    title: "Contato",
    text: "Você chama no WhatsApp e descreve o que está acontecendo. Quanto mais detalhe, melhor — o que falhou, desde quando e em que situação aparece.",
    Icon: IconWhatsapp,
  },
  {
    n: "02",
    title: "Orientação inicial",
    text: "Pelo relato já dá para separar o que é ajuste, o que é peça e o que exige verificação presencial. Havendo risco, a orientação vem na hora.",
    Icon: IconSpark,
  },
  {
    n: "03",
    title: "Avaliação",
    text: "Atendimento com hora marcada para examinar o equipamento e identificar a causa — não apenas o sintoma. Aí sim se define o serviço e o custo.",
    Icon: IconGauge,
  },
  {
    n: "04",
    title: "Serviço",
    text: "Execução do reparo, da manutenção ou da reforma, com o equipamento testado e conferido antes de voltar ao uso.",
    Icon: IconWrench,
  },
] as const

export function StepGrid() {
  return (
    <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {STEPS.map((s, i) => (
        <li
          key={s.n}
          data-reveal
          data-reveal-delay={String(i * 0.08)}
          className="fx-panel fx-panel-hover relative p-7 pt-8"
        >
          {i < STEPS.length - 1 ? (
            <span
              aria-hidden
              className="absolute top-[52px] -right-3 hidden h-px w-6 bg-[#f3b73f]/30 lg:block"
            />
          ) : null}

          <div className="flex items-center justify-between">
            <span className="flex h-11 w-11 items-center justify-center border border-[#f3b73f]/35 text-[#f3b73f]">
              <s.Icon className="h-5 w-5" />
            </span>
            <span
              className="fx-font-display text-[2rem] leading-none text-white/8"
              style={{ fontWeight: 900 }}
            >
              {s.n}
            </span>
          </div>

          <h3
            className="fx-font-display mt-6 text-[1.125rem] text-[#f6f6f7] uppercase"
            style={{ fontStretch: "90%", fontWeight: 700 }}
          >
            {s.title}
          </h3>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-[#9b9ba4]">{s.text}</p>
        </li>
      ))}
    </ol>
  )
}

export default function HowItWorks({
  lead = "Do primeiro contato até o equipamento conferido, sem etapa surpresa no meio do caminho.",
  tone = "plain",
}: {
  lead?: string
  tone?: "plain" | "raised"
}) {
  return (
    <Section tone={tone} className="py-24 md:py-32">
      <div className="fx-shell">
        <SectionHead
          eyebrow="Passo a passo"
          title={
            <>
              Como <span className="fx-gold">funciona</span>
            </>
          }
          lead={lead}
        />
        <div className="mt-14">
          <StepGrid />
        </div>
      </div>
    </Section>
  )
}
