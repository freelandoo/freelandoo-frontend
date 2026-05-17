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
      <main className="min-h-[100dvh] bg-background px-4 py-16">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/15 text-rose-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="mb-2 text-2xl font-bold">Cupom não disponível</h1>
          <p className="text-sm text-muted-foreground">
            {data?.expired
              ? `O cupom ${code} expirou.`
              : `Não encontramos o cupom ${code} ou ele está inativo.`}
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Explorar Freelandoo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-[100dvh] bg-background px-4 py-12">
      <div className="mx-auto max-w-lg">
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-background to-background p-8 text-center shadow-2xl">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 opacity-40 [mask-image:radial-gradient(ellipse_at_top,_black,_transparent_70%)]"
            style={{ background: "radial-gradient(120% 90% at 50% 0%, rgba(242,196,9,0.25), transparent 60%)" }}
          />
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Cupom da vez</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight">{data.code}</h1>

          {data.owner && (
            <p className="mt-4 text-sm text-muted-foreground">
              Compartilhado por{" "}
              <span className="font-semibold text-foreground">
                {data.owner.display_name || data.owner.username || "um afiliado"}
              </span>
            </p>
          )}

          {data.expires_at && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Válido até {new Date(data.expires_at).toLocaleDateString("pt-BR")}
            </p>
          )}

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <BadgePercent className="h-4 w-4 text-primary" />
            Será aplicado automaticamente no checkout
          </div>

          {/* CouponOfferClient salva o cupom no sessionStorage e redireciona pra home */}
          <CouponOfferClient code={data.code} />
        </div>
      </div>
    </main>
  )
}
