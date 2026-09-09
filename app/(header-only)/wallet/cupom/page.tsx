"use client"

// /wallet/cupom — a página do botão "Meu cupom" da Carteira.
//
// Era um painel que abria dentro da /wallet; virou rota própria (pedido do
// Alex, 2026-09-08). Junta as três metades da MESMA pergunta — "quanto o meu
// cupom rendeu, de quem, e para onde esse dinheiro vai": o código para
// compartilhar, quem comprou com ele e o painel do afiliado (vínculo,
// indicados, regra vigente e PIX).
//
// ⚠️ O EXTRATO GERAL NÃO VEIO JUNTO, e isso é decisão: os ganhos de Loja,
// Serviço, Curso e Afiliado saem do MESMO `/me/earnings` que alimenta os KPIs e
// o gráfico da raiz, e dividem com eles o seletor de perfil e de período.
// Trazidos para cá, as duas telas buscariam o mesmo endpoint e o recorte
// mudaria de lugar conforme a página. Aqui fica só o que é do cupom, que vem de
// outra porta (`/me/earnings/coupon-sales`).

import { useCallback, useEffect, useState } from "react"
import { AlertCircle, Check, Copy, Loader2, Percent, Ticket } from "lucide-react"
import { Underline } from "@/components/home/landing/primitives"
import { useMeProfile } from "@/hooks/use-me-profile"
import { clientFetchWithTimeout } from "@/lib/fetch-with-timeout"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { FinanceShell } from "../_components/finance-shell"
import { WalletHeadcard } from "../_components/wallet-headcard"
import { AfiliadoPanel } from "../_components/afiliado-panel"
import { CouponSaleRow, ExtratoSkeleton, GREEN, StateBox, type CouponSale } from "../_components/wallet-ui"

export default function WalletCouponPage() {
  const tr = useTranslations("Wallet")
  const { perfil, setPerfil } = useMeProfile()

  const [sales, setSales] = useState<CouponSale[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("token") : null)

  const load = useCallback(
    async (pg: number, replace: boolean) => {
      const t = token()
      if (!t) return
      if (replace) setLoading(true)
      setError("")
      try {
        const res = await clientFetchWithTimeout(
          `/api/me/earnings/coupon-sales?page=${pg}&per_page=24`,
          { headers: { Authorization: `Bearer ${t}` } },
          9000
        )
        if (!res.ok) throw new Error(tr("loadStatementError", "Falha ao carregar extrato"))
        const data = await res.json()
        setTotalPages(data.pagination?.total_pages || 1)
        setSales((prev) => (replace ? data.items || [] : [...prev, ...(data.items || [])]))
      } catch (e) {
        setError(e instanceof Error ? e.message : tr("loadError", "Erro ao carregar"))
      } finally {
        setLoading(false)
      }
    },
    [tr]
  )

  useEffect(() => {
    setPage(1)
    void load(1, true)
  }, [load])

  const handleCopy = (code: string) => {
    void navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleGenerate = async () => {
    const t = token()
    if (!t || generating) return
    setGenerating(true)
    try {
      const res = await fetch("/api/users/me/coupon", {
        method: "POST",
        headers: { Authorization: `Bearer ${t}` },
      })
      if (res.ok) {
        const data = await res.json()
        const code = data.coupon_code ?? data.code ?? data.coupon
        if (code) setPerfil((prev) => (prev ? { ...prev, coupon_code: code } : prev))
      }
    } catch {
      /* silencioso: o botão volta ao normal e a pessoa tenta de novo */
    } finally {
      setGenerating(false)
    }
  }

  return (
    <FinanceShell>

      <WalletHeadcard
        perfil={perfil}
        title={tr("couponPill", "Meu cupom")}
        backHref="/wallet"
        active="coupon"
      />

      {/* O CÓDIGO */}
      <section className="mx-auto mt-5 w-full max-w-6xl px-3 md:px-8">
        <div className="border-2 border-[#0B0B0D] bg-[#F1EDE2] p-4 shadow-[5px_5px_0_0_#0B0B0D] sm:p-5">
          <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6B6457]">
            <Ticket className="h-3.5 w-3.5" /> {tr("myCouponTitle", "Meu cupom")}
          </p>
          {perfil?.coupon_code ? (
            <>
              <button
                type="button"
                data-tour="account-coupon"
                onClick={() => handleCopy(perfil.coupon_code!)}
                className="mt-2 inline-flex items-center gap-2 border-2 border-dashed border-[#0B0B0D]/45 px-3 py-2 font-mono text-sm font-black tracking-[0.18em] text-[#0B0B0D] transition hover:border-solid"
                style={{ background: copied ? GREEN : "transparent" }}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {perfil.coupon_code}
              </button>
              <p className="mt-2 text-[11px] leading-relaxed text-[#6B6457]">
                {tr(
                  "myCouponHint",
                  "Compartilhe: quem comprar na plataforma com ele fica vinculado a você e gera comissão."
                )}
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                data-tour="account-coupon"
                onClick={handleGenerate}
                disabled={generating}
                className="mt-2 inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5 disabled:opacity-50"
                style={{ background: GREEN }}
              >
                {generating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {generating ? tr("generating", "Gerando...") : tr("generateCoupon", "Gerar cupom")}
              </button>
              <p className="mt-2 text-[11px] leading-relaxed text-[#6B6457]">
                {tr("myCouponEmptyHint", "Você ainda não tem cupom. Gere o seu e comece a indicar.")}
              </p>
            </>
          )}
        </div>
      </section>

      {/* QUEM COMPROU COM ELE */}
      <section className="mx-auto mt-10 w-full max-w-6xl px-3 md:px-8">
        <div className="relative mb-6 inline-block">
          <h2 className="fl-display text-4xl text-[#F1EDE2] md:text-5xl">
            {tr("couponSalesTitle", "Vendas com o seu cupom")}
          </h2>
          <Underline className="absolute -bottom-2 left-0 h-3.5 w-32" style={{ color: GREEN }} />
        </div>

        {loading && sales.length === 0 ? (
          <ExtratoSkeleton />
        ) : error ? (
          <StateBox
            icon={<AlertCircle className="h-6 w-6" />}
            title={tr("loadFailedTitle", "Não deu pra carregar.")}
            desc={error}
            action={
              <button
                type="button"
                onClick={() => load(1, true)}
                className="border-2 border-[#0B0B0D] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5"
                style={{ background: GREEN }}
              >
                {tr("tryAgain", "Tentar de novo")}
              </button>
            }
          />
        ) : sales.length === 0 ? (
          <StateBox
            icon={<Ticket className="h-6 w-6" />}
            title={tr("couponSalesEmptyTitle", "Nenhuma venda com seu cupom ainda")}
            desc={tr("couponSalesEmptyHint", "Compartilhe seu cupom de afiliado pra começar a ver vendas aqui.")}
          />
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {sales.map((sale) => (
                <CouponSaleRow key={sale.id} sale={sale} />
              ))}
            </div>
            {page < totalPages && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    const next = page + 1
                    setPage(next)
                    void load(next, false)
                  }}
                  className="inline-flex items-center gap-2 border-2 border-[#F1EDE2]/25 px-5 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#F1EDE2] transition hover:border-[#F1EDE2]"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {tr("loadMore", "Carregar mais")}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* AFILIADO — herdado do extinto /account/afiliado. */}
      <section className="mx-auto mt-12 w-full max-w-6xl px-3 md:px-8">
        <div className="relative mb-6 inline-block">
          <h2 className="flex items-center gap-2 fl-display text-4xl text-[#F1EDE2] md:text-5xl">
            <Percent className="h-7 w-7" /> {tr("affiliateSection", "Afiliado")}
          </h2>
          <Underline className="absolute -bottom-2 left-0 h-3.5 w-28" style={{ color: GREEN }} />
        </div>
        <AfiliadoPanel />
      </section>
    </FinanceShell>
  )
}
