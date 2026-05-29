"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ArrowLeft, CheckCircle2, Loader2, Shield, Zap } from "lucide-react"
import { usePricing, formatBRL } from "@/lib/pricing"
import { TabloidPageIntro } from "@/components/tabloide"

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
          setError("Nenhum perfil informado. Volte e clique em 'Ativar perfil' no card desejado.")
          return
        }
        const res = await fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) throw new Error("Não foi possível validar seu perfil")
        const data = await res.json()
        const found: ProfileSummary | undefined = (data.profiles || []).find(
          (p: ProfileSummary) => p.id_profile === profileIdParam
        )
        if (!found) {
          setError("Esse perfil não pertence à sua conta.")
          return
        }
        if (found.is_published) {
          setError("Este perfil já está ativado.")
        }
        setProfile(found)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar perfil")
      } finally {
        setLoadingProfile(false)
      }
    }
    loadProfile()
  }, [profileIdParam, router])

  async function handleCheckout() {
    setIsLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        setError("Você precisa estar logado para ativar o perfil")
        return
      }
      if (!profileIdParam) {
        setError("Perfil não informado")
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
        data = { error: `Resposta inválida do servidor (${response.status})` }
      }
      if (!response.ok) {
        throw new Error(data?.error || "Erro ao iniciar pagamento")
      }
      if (!data?.url) {
        throw new Error("Resposta do servidor sem URL de checkout")
      }

      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado")
      setIsLoading(false)
    }
  }

  return (
    <main className="fl-root tabloid-account-page relative flex-1 bg-[#141009]">
      <div className="mx-auto max-w-4xl px-4 py-8 md:py-10">
        <TabloidPageIntro
          size="compact"
          eyebrow="Ativação de perfil"
          title="TAXA."
          subtitle="Pagamento único por perfil — sem renovação automática."
          back={
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.25em] text-[#9A938A] transition hover:text-[#F5F1E8]"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
          }
          className="mb-8"
        />

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Ativação do perfil</CardTitle>
              <CardDescription>
                {profile
                  ? `Ativando o perfil "${profile.display_name}"`
                  : "Mantenha seu perfil ativo nos classificados"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-2">Pagamento único por perfil</p>
                <p className="text-4xl font-bold">{formatBRL(pricing.subscription_annual.amount_cents, pricing.subscription_annual.currency)}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Sem renovação automática. Cada perfil tem ativação própria.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Apareça nos Classificados</p>
                    <p className="text-sm text-muted-foreground">
                      Somente o perfil ativado aparece publicamente. Seus outros perfis seguem inativos.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Zap className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium">Ativação imediata</p>
                    <p className="text-sm text-muted-foreground">
                      Confirmação via Stripe ativa o perfil automaticamente.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Pagamento seguro</p>
                    <p className="text-sm text-muted-foreground">
                      Processado pelo Stripe com criptografia ponta a ponta.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Finalizar pagamento</CardTitle>
              <CardDescription>
                {profile
                  ? profile.is_clan
                    ? `Clan: ${profile.display_name}${profile.machine_name ? ` · ${profile.machine_name}` : ""}`
                    : `Perfil: ${profile.display_name}${profile.category ? ` · ${profile.category}` : ""}`
                  : "Você será redirecionado ao Stripe para concluir"}
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
                      Cupom de desconto (opcional)
                    </label>
                    <Input
                      id="coupon"
                      placeholder="Insira seu código"
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
                    {isLoading ? "Redirecionando..." : "Pagar com Stripe"}
                  </button>

                  <p className="text-xs text-center text-muted-foreground">
                    Ao continuar, você concorda com o{" "}
                    <a href="/subscription-terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                      Termo de ativação
                    </a>{" "}
                    e os{" "}
                    <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                      Termos de Uso
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
