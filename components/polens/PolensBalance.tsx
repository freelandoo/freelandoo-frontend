import { PolenIcon } from "./polen-icon"

export function PolensBalance({ balance }: { balance: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-12 w-12 place-items-center rounded-xl border border-amber-300/30 bg-amber-300/15 text-amber-300">
        <PolenIcon className="h-7 w-7" />
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-amber-100/55">Saldo atual</p>
        <p className="text-3xl font-semibold tabular-nums text-white">
          {balance.toLocaleString("pt-BR")} <span className="text-base text-amber-200">Poléns</span>
        </p>
      </div>
    </div>
  )
}
