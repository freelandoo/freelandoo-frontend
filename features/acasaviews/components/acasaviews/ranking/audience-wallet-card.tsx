import { Lock, Wallet } from "lucide-react"
import { AnimatedNumber } from "./animated-number"
import { DoodleAccent } from "./doodle-accent"

interface AudienceWalletCardProps {
  amount: number
  winnerName: string
  winnerHandle: string
}

/** Card premium "Carteira do Público" — recompensa do Top 1 da audiência. */
export function AudienceWalletCard({ amount, winnerName, winnerHandle }: AudienceWalletCardProps) {
  return (
    <div className="relative overflow-hidden bg-[var(--ink)] p-7 text-white casa-cut md:p-9" style={{ transform: "rotate(-1deg)" }}>
      <div className="casa-dots absolute inset-0 opacity-[0.06]" />
      <span className="casa-tape -top-3 right-10 rotate-[6deg]" style={{ background: "rgba(244,196,48,0.5)" }} />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[var(--gold)]">
            <Wallet className="h-5 w-5" strokeWidth={2.6} />
            <span className="casa-body text-[11px] font-extrabold uppercase tracking-[0.24em]">
              Bloco especial
            </span>
          </div>
          <h3 className="casa-display mt-3 text-4xl leading-none md:text-5xl">
            Carteira do <span className="text-[var(--gold)]">Público</span>
          </h3>
        </div>
        <span className="inline-flex items-center gap-1.5 border border-white/20 px-2.5 py-1 casa-body text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/70">
          <Lock className="h-3 w-3" /> saldo secreto
        </span>
      </div>

      <p className="relative mt-4 max-w-lg casa-body text-sm leading-relaxed text-white/65 md:text-base">
        O <strong className="text-white">Top 1 da audiência</strong> destrava a Carteira do Público: poder de
        interferência, vantagem estratégica e voz dentro da casa. Comentar bem não é torcer —{" "}
        <span className="text-[var(--gold)]">é jogar.</span>
      </p>

      <div className="relative mt-7 flex flex-wrap items-end justify-between gap-5 border-t border-white/12 pt-6">
        <div>
          <p className="casa-body text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
            saldo acumulado
          </p>
          <div className="casa-display mt-1 text-5xl text-[var(--gold)] md:text-6xl">
            <AnimatedNumber value={amount} prefix="R$ " />
          </div>
        </div>
        <div className="text-right">
          <p className="casa-body text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">na mão de</p>
          <p className="casa-display text-2xl md:text-3xl">{winnerName}</p>
          <p className="casa-body text-[11px] font-semibold text-white/45">{winnerHandle}</p>
        </div>
        <DoodleAccent type="arrow" className="absolute -right-1 -top-2 h-9 w-14 text-[var(--gold)]" />
      </div>
    </div>
  )
}
