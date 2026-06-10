import { ShieldCheck, Star, Headset } from "lucide-react"
import { Section } from "@/components/home/landing"

const ITEMS = [
  {
    icon: ShieldCheck,
    title: "Pagamento protegido",
    desc: "Seu dinheiro fica retido com segurança até a entrega ser confirmada.",
  },
  {
    icon: Star,
    title: "Avaliações reais",
    desc: "Veja a reputação de quem você vai contratar antes de fechar.",
  },
  {
    icon: Headset,
    title: "Suporte de verdade",
    desc: "Time pronto pra ajudar se algo sair do combinado.",
  },
]

export function BuyerTrust() {
  return (
    <Section>
      <h2 className="fl-display text-center text-4xl text-[#0B0B0D] sm:text-5xl">
        Compre sem medo
      </h2>
      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
        {ITEMS.map((it) => (
          <div
            key={it.title}
            className="border-2 border-[#0B0B0D] bg-[#F2B705]/15 p-6"
          >
            <it.icon className="h-7 w-7 text-[#0B0B0D]" />
            <h3 className="mt-3 text-lg font-bold text-[#0B0B0D]">{it.title}</h3>
            <p className="mt-1 text-sm text-[#3a352c]">{it.desc}</p>
          </div>
        ))}
      </div>
    </Section>
  )
}
