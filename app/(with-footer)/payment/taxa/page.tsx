"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ArrowLeft, CheckCircle2, Loader2, Shield, Zap } from "lucide-react"
import { usePricing, formatBRL } from "@/lib/pricing"
import { TabloidPageIntro } from "@/components/tabloide"
import { useTranslations } from "@/components/i18n/I18nProvider"

interface ProfileSummary {
  id_profile: string
  display_name: string
  category?: string
  machine_name?: string | null
  is_clan?: boolean
  is_published?: boolean
  subscription?: { status?: string } | null
}

function TaxaPageInner() {
  const t = useTranslations("Checkout")
  const router = useRouter()
  const search = useSearchParams()
  const profileIdParam = search.get("profile_id")

  const pricing = usePricing()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [couponCode, setCouponCode] = useState("")
  const [profile, setProfile] = useState<ProfileSummary | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
        if (!token) {
          router.replace("/login")
          return
        }
        if (!profileIdParam) {
          setError(t("taxaNoProfile", "Nenhum perfil informado. Volte e clique em 'Ativar perfil' no card desejado."))
          return
        }
        const res = await fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) throw new Error(t("taxaValidateError", "Não foi possível validar seu perfil"))
        const data = await res.json()
        const found: ProfileSummary | undefined = (data.profiles || []).find(
          (p: ProfileSummary) => p.id_profile === profileIdParam
        )
        if (!found) {
          setError(t("taxaNotYours", "Esse perfil não pertence à sua conta."))
          return
        }
        if (found.is_published) {
          setError(t("taxaAlreadyActive", "Este perfil já está ativado."))
        }
        setProfile(found)
      } catch (err) {
        setError(err instanceof Error ? err.message : t("taxaLoadProfileError", "Erro ao carregar perfil"))
      } finally {
        setLoadingProfile(false)
      }
    }
    loadProfile()
  }, [profileIdParam, router, t])

  async function handleCheckout() {
    setIsLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        setError(t("taxaNeedLogin", "Você precisa estar logado para ativar o perfil"))
        return
      }
      if (!profileIdParam) {
        setError(t("taxaProfileMissing", "Perfil não informado"))
        return
      }

      const response = await fetch("/api/stripe/subscription/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id_profile: profileIdParam,
          coupon_code: couponCode.trim() || undefined,
        }),
      })

      // Backend pode devolver HTML (404 do proxy, etc.) em caso de rota errada;
      // parse defensivo evita o "Unexpected token '<'" no usuário.
      const text = await response.text()
      let data: { url?: string; error?: string } = {}
      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        data = { error: t("taxaInvalidResponse", "Resposta inválida do servidor ({status})").replace("{status}", String(response.status)) }
      }
      if (!response.ok) {
        throw new Error(data?.error || t("taxaStartPaymentError", "Erro ao iniciar pagamento"))
      }
      if (!data?.url) {
        throw new Error(t("taxaNoCheckoutUrl", "Resposta do servidor sem URL de checkout"))
      }

      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : t("taxaUnexpectedError", "Erro inesperado"))
      setIsLoading(false)
    }
  }

  return (
    <main className="fl-root tabloid-account-page relative flex-1 bg-[#0b0804]">
      <div className="mx-auto max-w-4xl px-4 py-8 md:py-10">
        <TabloidPageIntro
          size="compact"
          eyebrow={t("taxaEyebrow", "Ativação de perfil")}
          title="TAXA."
          subtitle={t("taxaSubtitle", "Pagamento único por perfil — sem renovação automática.")}
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
          className="mb-8"
        />

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("taxaActivationTitle", "Ativação do perfil")}</CardTitle>
              <CardDescription>
                {profile
                  ? t("taxaActivatingProfile", 'Ativando o perfil "{name}"').replace("{name}", profile.display_name)
                  : t("taxaKeepActive", "Mantenha seu perfil ativo nos classificados")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-2">{t("taxaOneTimePerProfile", "Pagamento único por perfil")}</p>
                <p className="text-4xl font-bold">{formatBRL(pricing.subscription_annual.amount_cents, pricing.subscription_annual.currency)}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {t("taxaNoAutoRenew", "Sem renovação automática. Cada perfil tem ativação própria.")}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">{t("taxaPerk1Title", "Apareça nos Classificados")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("taxaPerk1Desc", "Somente o perfil ativado aparece publicamente. Seus outros perfis seguem inativos.")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Zap className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium">{t("taxaPerk2Title", "Ativação imediata")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("taxaPerk2Desc", "Confirmação via Stripe ativa o perfil automaticamente.")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">{t("taxaPerk3Title", "Pagamento seguro")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("taxaPerk3Desc", "Processado pelo Stripe com criptografia ponta a ponta.")}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("taxaFinishPayment", "Finalizar pagamento")}</CardTitle>
              <CardDescription>
                {profile
                  ? profile.is_clan
                    ? `${t("taxaClanLabel", "Clan")}: ${profile.display_name}${profile.machine_name ? ` · ${profile.machine_name}` : ""}`
                    : `${t("taxaProfileLabel", "Perfil")}: ${profile.display_name}${profile.category ? ` · ${profile.category}` : ""}`
                  : t("taxaRedirectStripe", "Você será redirecionado ao Stripe para concluir")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingProfile ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="coupon">
                      {t("taxaCouponLabel", "Cupom de desconto (opcional)")}
                    </label>
                    <Input
                      id="coupon"
                      placeholder={t("taxaCouponPlaceholder", "Insira seu código")}
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      disabled={isLoading || !profile}
                    />
                  </div>

                  {error && <p className="text-sm font-bold text-red-500">{error}</p>}

                  <button
                    type="button"
                    className="inline-flex w-full items-center justify-center border-2 border-[#0B0B0D] bg-[#F2B705] px-5 py-3.5 text-sm font-black uppercase tracking-[0.12em] text-[#0B0B0D] shadow-[5px_5px_0_0_#0B0B0D] transition hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#0B0B0D] disabled:cursor-not-allowed disabled:opacity-55"
                    onClick={handleCheckout}
                    disabled={isLoading || !profile || !!profile?.is_published}
                  >
                    {isLoading ? t("taxaRedirecting", "Redirecionando...") : t("taxaPayWithStripe", "Pagar com Stripe")}
                  </button>

                  <p className="text-xs text-center text-muted-foreground">
                    {t("taxaAgreePre", "Ao continuar, você concorda com o")}{" "}
                    <a href="/subscription-terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                      {t("taxaActivationTerm", "Termo de ativação")}
                    </a>{" "}
                    {t("taxaAgreeAnd", "e os")}{" "}
                    <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                      {t("taxaTermsOfUse", "Termos de Uso")}
                    </a>
                    .
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}

export default function TaxaPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <TaxaPageInner />
    </Suspense>
  )
}
