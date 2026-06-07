import { getBackendApiUrl } from "@/lib/backend"
import { CouponOfferClient } from "./_components/coupon-offer-client"
import Link from "next/link"
import { Sparkles, ArrowRight, BadgePercent, AlertCircle } from "lucide-react"

interface PublicCoupon {
  valid: boolean
  code: string
  expires_at: string | null
  expired?: boolean
  owner: {
    username: string | null
    display_name: string | null
    avatar_url: string | null
    id_profile: string | null
  } | null
  error?: string
}

async function fetchCoupon(code: string): Promise<PublicCoupon | null> {
  try {
    const res = await fetch(`${getBackendApiUrl()}/public/coupon/${encodeURIComponent(code)}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok && res.status !== 404) return null
    return (await res.json()) as PublicCoupon
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ cupom: string }> }) {
  const { cupom } = await params
  const code = String(cupom || "").toUpperCase()
  return {
    title: `Cupom ${code} — Freelandoo`,
    description: `Aproveite o cupom ${code} na Freelandoo.`,
  }
}

export default async function OfertaPage({ params }: { params: Promise<{ cupom: string }> }) {
  const { cupom } = await params
  const code = String(cupom || "").toUpperCase()
  const data = await fetchCoupon(code)

  if (!data || !data.valid) {
    return (
      <main className="fl-root flex min-h-[100dvh] items-center justify-center bg-[#0b0804] px-4 py-16">
        <div className="w-full max-w-md">
          <div className="fl-card fl-hard rounded-[6px] p-8 text-center sm:p-10">
            <span className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-[6px] border-2 border-[#0B0B0D] bg-rose-500/15 text-rose-600">
              <AlertCircle className="h-7 w-7" />
            </span>
            <p className="fl-marker text-xl font-bold leading-none text-[#0B0B0D]/55">Cupom</p>
            <h1 className="fl-display mt-1 text-4xl leading-[0.9] text-[#0B0B0D] sm:text-5xl">INDISPONÍVEL.</h1>
            <p className="mx-auto mt-5 max-w-xs text-sm font-bold leading-relaxed text-[#5b554b]">
              {data?.expired
                ? `O cupom ${code} expirou.`
                : `Não encontramos o cupom ${code} ou ele está inativo.`}
            </p>
            <Link
              href="/"
              className="mt-7 inline-flex items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#0B0B0D] shadow-[4px_4px_0_0_#0B0B0D] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#0B0B0D]"
            >
              Explorar Freelandoo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="fl-root relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#0b0804] px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_top,_black,_transparent_70%)]"
        style={{ background: "radial-gradient(120% 90% at 50% 0%, rgba(242,183,5,0.22), transparent 60%)" }}
      />
      <div className="relative w-full max-w-lg">
        <div className="fl-card fl-hard rounded-[6px] p-8 text-center sm:p-10">
          <span className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-[6px] border-2 border-[#0B0B0D] bg-[#F2B705] text-[#0B0B0D]">
            <Sparkles className="h-6 w-6" />
          </span>
          <p className="fl-marker text-2xl font-bold leading-none text-[#0B0B0D]/55">Cupom da vez</p>

          <div className="my-5 border-y-2 border-dashed border-[#0B0B0D]/30 py-5">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#0B0B0D]/50">Código</p>
            <h1 className="fl-display mt-1 break-all text-6xl leading-[0.85] text-[#0B0B0D] sm:text-7xl">{data.code}</h1>
          </div>

          {data.owner && (
            <p className="text-sm font-bold text-[#5b554b]">
              Compartilhado por{" "}
              <span className="font-black text-[#0B0B0D]">
                {data.owner.display_name || data.owner.username || "um afiliado"}
              </span>
            </p>
          )}

          {data.expires_at && (
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#8a8275]">
              Válido até {new Date(data.expires_at).toLocaleDateString("pt-BR")}
            </p>
          )}

          <div className="mt-6 inline-flex items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#0B0B0D]/[0.04] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-[#0B0B0D]">
            <BadgePercent className="h-4 w-4" />
            Aplicado automaticamente no checkout
          </div>

          {/* CouponOfferClient salva o cupom no sessionStorage e redireciona pra home */}
          <CouponOfferClient code={data.code} />
        </div>
      </div>
    </main>
  )
}
