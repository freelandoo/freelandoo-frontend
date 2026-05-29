"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Tag, CheckCircle2, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PageShell, TabloidPageIntro } from "@/components/tabloide"

interface CouponResult {
  valid: boolean
  discount_percent?: number
  discount_value?: number
  message?: string
}

interface ProfileData {
  id_profile: string
  display_name: string
  avatar_url?: string | null
  category?: { desc_category: string } | string | null
  subcategory?: { desc_subcategory: string } | string | null
  municipio?: string
  estado?: string
}

const TAXA_VALOR = 97.00

export default function OrderTaxaPage() {
  const params = useParams()
  const router = useRouter()
  const idProfile = params.id_profile as string

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [cupom, setCupom] = useState("")
  const [cupomAplicado, setCupomAplicado] = useState<string | null>(null)
  const [couponResult, setCouponResult] = useState<CouponResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/profile/${idProfile}`)
        const data = await res.json()
        if (res.ok) {
          setProfile(data)
        }
      } catch {
        // silencioso
      } finally {
        setLoadingProfile(false)
      }
    }
    if (idProfile) fetchProfile()
  }, [idProfile])

  const desconto = couponResult?.valid
    ? couponResult.discount_value ?? (couponResult.discount_percent ? (TAXA_VALOR * couponResult.discount_percent) / 100 : 0)
    : 0

  const valorFinal = Math.max(0, TAXA_VALOR - desconto)

  const handleAplicarCupom = () => {
    if (!cupom.trim()) return
    // Por enquanto sem backend, apenas simula a aplicação
    // Quando o backend estiver pronto, fará a validação real
    setCupomAplicado(cupom.trim().toUpperCase())
    setCouponResult({ valid: true, discount_percent: 10, message: "Cupom aplicado com sucesso!" })
  }

  const handleRemoverCupom = () => {
    setCupom("")
    setCupomAplicado(null)
    setCouponResult(null)
  }

  const handlePagar = () => {
    setIsProcessing(true)
    // Por enquanto sem backend, apenas simula
    // Quando o backend estiver pronto, redirecionará para o pagamento
    setTimeout(() => {
      alert("Integração de pagamento em desenvolvimento. Em breve você poderá realizar o pagamento.")
      setIsProcessing(false)
    }, 1000)
  }

  return (
    <PageShell className="tabloid-account-page">
      <main className="relative z-10 mx-auto max-w-lg px-4 py-8 md:py-10">
        <TabloidPageIntro
          size="compact"
          eyebrow="Ativação de perfil"
          title="TAXA."
          subtitle="Ative seu perfil realizando o pagamento da taxa."
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

        <div className="space-y-4">
          {/* Perfil que será ativado */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Perfil a ser ativado</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingProfile ? (
                <div className="flex items-center gap-3 animate-pulse">
                  <div className="h-12 w-12 rounded-full bg-muted" />
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-3 w-24 bg-muted rounded" />
                  </div>
                </div>
              ) : profile ? (
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.display_name} />
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{profile.display_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {[
                        typeof profile.category === "object" ? profile.category?.desc_category : profile.category,
                        typeof profile.subcategory === "object" ? profile.subcategory?.desc_subcategory : profile.subcategory,
                        profile.municipio,
                        profile.estado
                      ].filter(Boolean).join(" • ") || "Perfil de criador"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Perfil não encontrado.</p>
              )}
            </CardContent>
          </Card>

          {/* Resumo do pedido */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resumo do pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Taxa de ativação de perfil</span>
                <span className="font-medium">
                  {TAXA_VALOR.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>

              {couponResult?.valid && desconto > 0 && (
                <div className="flex items-center justify-between text-sm text-accent">
                  <span className="flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" />
                    Desconto ({cupom.toUpperCase()})
                  </span>
                  <span>- {desconto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                </div>
              )}

              <div className="border-t border-border" />

              <div className="flex items-center justify-between">
                <span className="font-semibold">Total</span>
                <span className="text-lg font-bold text-primary">
                  {valorFinal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Cupom */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cupom de desconto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cupomAplicado ? (
                <div className="flex items-center justify-between gap-2 bg-green-500/10 border border-green-500/30 rounded-md px-3 py-2">
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>Cupom <strong className="font-mono">{cupomAplicado}</strong> aplicado!</span>
                  </div>
                  <button
                    onClick={handleRemoverCupom}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Digite seu cupom"
                    value={cupom}
                    onChange={(e) => setCupom(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleAplicarCupom()}
                    className="font-mono tracking-wider uppercase"
                  />
                  <Button
                    variant="outline"
                    onClick={handleAplicarCupom}
                    disabled={!cupom.trim()}
                  >
                    Aplicar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Botão de pagamento */}
          <button
            type="button"
            className="inline-flex w-full items-center justify-center border-2 border-[#0B0B0D] bg-[#F2B705] px-5 py-4 text-sm font-black uppercase tracking-[0.12em] text-[#0B0B0D] shadow-[5px_5px_0_0_#0B0B0D] transition hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#0B0B0D] disabled:cursor-not-allowed disabled:opacity-55"
            onClick={handlePagar}
            disabled={isProcessing}
          >
            {isProcessing ? "Processando..." : `Pagar ${valorFinal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`}
          </button>

          <p className="text-center text-xs font-bold text-[#9A938A]">
            Ao pagar, seu perfil será ativado e ficará visível na plataforma.
          </p>
        </div>
      </main>
    </PageShell>
  )
}
