"use client"

// Ilha client da landing pública de curso (F3.S5). O curso chega pronto do
// server (RSC + ISR); aqui fica só o que precisa de browser: detecção de dono
// (token no localStorage), checkout, consent e os banners de retorno do Stripe.

import { useEffect, useState } from "react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, GraduationCap, ShoppingCart, Settings, Check } from "lucide-react"
import { ShareIconButton } from "@/components/share/share-icon-button"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { getCapturedCoupon } from "@/lib/share-coupon"
import { useActionConsent } from "@/hooks/use-action-consent"
import { PageShell, TabloidPageIntro } from "@/components/tabloide"

export interface PublicCourse {
  id: string
  title: string
  slug: string
  short_description: string | null
  description: string | null
  cover_url: string | null
  price_cents: number
  status: "draft" | "published" | "paused"
  owner_user_id: string
  modules_count: number
  lessons_count: number
}

function formatPrice(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100)
}

function authHeaders(): HeadersInit {
  if (typeof window === "undefined") return {}
  const token = localStorage.getItem("token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export default function CourseLandingClient({ course }: { course: PublicCourse }) {
  const t = useTranslations("Course")
  const locale = useLocale()
  const search = useSearchParams()
  const router = useRouter()

  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [buying, setBuying] = useState(false)
  const [buyError, setBuyError] = useState<string | null>(null)
  const { ensureConsent } = useActionConsent()

  const checkoutStatus = search?.get("course_checkout")

  useEffect(() => {
    let cancelled = false
    fetch("/api/users/me", { headers: authHeaders(), cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => {
        if (!cancelled && me) setMyUserId(me?.id_user || null)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const isOwner = !!(myUserId && course.owner_user_id === myUserId)

  const handleBuy = async () => {
    if (!myUserId) {
      router.push("/login")
      return
    }
    if (!(await ensureConsent("purchase"))) return
    setBuying(true)
    setBuyError(null)
    try {
      const sharedCoupon = getCapturedCoupon()
      const res = await fetch(`/api/me/courses/${course.id}/checkout`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(sharedCoupon?.code ? { coupon_code: sharedCoupon.code } : {}),
      })
      const data = await res.json()
      if (!res.ok || !data?.checkout_url) {
        setBuyError(data?.error || t("checkoutCreateError", "Falha ao criar checkout"))
        setBuying(false)
        return
      }
      window.location.href = data.checkout_url as string
    } catch {
      setBuyError(t("serverConnectionError", "Erro ao conectar com o servidor"))
      setBuying(false)
    }
  }

  return (
    <PageShell className="tabloid-account-page">
      <main className="relative z-10 mx-auto max-w-3xl px-4 py-8 md:py-10">
        <TabloidPageIntro
          size="compact"
          eyebrow={t("eyebrow", "Curso")}
          title={course.title}
          subtitle={course.short_description || undefined}
          back={
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.25em] text-[#9A938A] transition hover:text-[#F5F1E8]"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("backButton", "Voltar")}
            </button>
          }
        />

        {/* Cover */}
        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-[6px] border-2 border-[#0B0B0D] bg-[#1D1810] shadow-[6px_6px_0_0_#0B0B0D]">
          {course.cover_url ? (
            // next/image: landing pública/SEO, 1 capa por curso (política F3.S6).
            <Image
              src={course.cover_url}
              alt={course.title}
              fill
              sizes="(min-width: 768px) 736px, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <GraduationCap className="h-16 w-16 text-[#F2B705]/30" />
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 text-[11px] font-black uppercase tracking-[0.12em] text-[#C9C2B6]">
          <span className="border-2 border-[#F1EDE2]/20 px-2.5 py-1">
            {t("modulesCount", "{n} módulos").replace("{n}", String(course.modules_count))}
          </span>
          <span className="border-2 border-[#F1EDE2]/20 px-2.5 py-1">
            {t("lessonsCount", "{n} aulas").replace("{n}", String(course.lessons_count))}
          </span>
        </div>

        {course.description && (
          <article className="fl-card fl-hard mt-8 rounded-[6px] p-5 sm:p-6">
            <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--fl-ink)]">
              {course.description}
            </div>
          </article>
        )}

        {checkoutStatus === "success" && (
          <div className="mt-6 flex items-start gap-2 rounded-[6px] border-2 border-green-600/40 bg-green-600/10 p-3 text-sm font-bold text-green-300">
            <Check className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{t("paymentSuccessMessage", "Pagamento confirmado! O curso já está disponível na sua conta.")}</span>
          </div>
        )}
        {checkoutStatus === "cancel" && (
          <div className="mt-6 rounded-[6px] border-2 border-amber-400/40 bg-amber-400/10 p-3 text-sm font-bold text-amber-200">
            {t("paymentCancelMessage", "Compra cancelada. Você pode tentar novamente quando quiser.")}
          </div>
        )}

        {/* Preço + CTA */}
        <div className="mt-10 flex flex-col items-start gap-4 rounded-[6px] border-2 border-[#0B0B0D] bg-[#F2B705] p-6 text-[#0B0B0D] shadow-[6px_6px_0_0_#0B0B0D] md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0B0B0D]/70">{t("priceLabel", "Valor")}</p>
            <p className="fl-display text-4xl text-[#0B0B0D]">
              {formatPrice(course.price_cents, locale)}
            </p>
          </div>
          {isOwner ? (
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-[#0B0B0D] bg-transparent font-black uppercase tracking-[0.08em] text-[#0B0B0D] hover:bg-[#0B0B0D] hover:text-[#F2B705]"
              onClick={() => router.push(`/account/courses/${course.id}`)}
            >
              <Settings className="mr-2 h-4 w-4" />
              {t("manageCourseButton", "Gerenciar curso")}
            </Button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <ShareIconButton
                path={`/cursos/${course.slug}`}
                title={course.title}
                description={t("shareDescription", "Confira este curso no Freelandoo.")}
              />
              <button
                type="button"
                onClick={handleBuy}
                disabled={buying}
                className="inline-flex items-center justify-center gap-2 border-2 border-[#F2B705] bg-[#0B0B0D] px-5 py-2.5 text-[12px] font-black uppercase tracking-[0.12em] text-[#F2B705] shadow-[4px_4px_0_0_#0B0B0D] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55"
              >
                <ShoppingCart className="h-4 w-4" />
                {buying ? t("redirectingButton", "Redirecionando...") : t("buyCourseButton", "Comprar curso")}
              </button>
            </div>
          )}
        </div>
        {buyError && (
          <p className="mt-2 text-xs font-bold text-red-400">{buyError}</p>
        )}
      </main>
    </PageShell>
  )
}
