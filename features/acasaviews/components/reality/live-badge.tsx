import Link from "next/link"

/**
 * Selo "AO VIVO". O pulso é um anel de 8px em CSS (pequeno de propósito) e
 * para sozinho com movimento reduzido. Não tem texto piscando.
 */
export function LiveBadge({ href, label = "Ao vivo" }: { href?: string; label?: string }) {
  const inner = (
    <>
      <span className="rv-live-dot" aria-hidden />
      <span className="rv-label text-[10px]">{label}</span>
    </>
  )
  const cls =
    "rv-glitch inline-flex items-center gap-2 border border-[var(--rv-pink)] bg-[rgba(255,0,122,0.08)] px-2.5 py-1.5 text-[var(--rv-white)]"
  return href ? (
    <Link href={href} className={cls} aria-label={`${label}: ranking do dia`}>
      {inner}
    </Link>
  ) : (
    <span className={cls}>{inner}</span>
  )
}
