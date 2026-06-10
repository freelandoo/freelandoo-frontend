import { Search, ShieldCheck, MessagesSquare } from "lucide-react"
import { Section, BigNumber } from "@/components/home/landing"

const STEPS = [
  {
    icon: Search,
    title: "Busque",
    desc: "Procure por profissão, influenciador ou produto — perto de você.",
  },
  {
    icon: ShieldCheck,
    title: "Contrate com segurança",
    desc: "O pagamento fica protegido até você confirmar que deu tudo certo.",
  },
  {
    icon: MessagesSquare,
    title: "Acompanhe num lugar",
    desc: "Converse, contrate e acompanhe tudo dentro da plataforma.",
  },
]

export function BuyerHowItWorks() {
  return (
    <Section>
      <h2 className="fl-display text-center text-4xl text-[#0B0B0D] sm:text-5xl">
        Como funciona
      </h2>
      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <div
            key={s.title}
            className="relative border-2 border-[#0B0B0D] bg-white p-6 shadow-[6px_6px_0_0_#0B0B0D]"
          >
            <BigNumber n={i + 1} className="text-3xl" />
            <s.icon className="mt-3 h-7 w-7 text-[#0B0B0D]" />
            <h3 className="mt-3 text-lg font-bold text-[#0B0B0D]">{s.title}</h3>
            <p className="mt-1 text-sm text-[#3a352c]">{s.desc}</p>
          </div>
        ))}
      </div>
    </Section>
  )
}
