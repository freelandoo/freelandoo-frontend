"use client"

import Link from "next/link"
import {
  ShoppingBag, PackageCheck, Truck, MapPin, ShieldCheck,
  Clock, RotateCcw, AlertTriangle, ArrowRight, Video, FileCheck,
} from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { ROUTES } from "@/lib/routes"

export function ShippingProtocolClient() {
  const t = useTranslations("Shipping")

  const steps = [
    { icon: ShoppingBag, title: t("step1Title", "Você compra"), body: t("step1Body", "Ao pagar, abrimos uma conversa de envio nas suas mensagens. É por ali que você acompanha tudo.") },
    { icon: Video, title: t("step2Title", "O vendedor mostra a embalagem"), body: t("step2Body", "O vendedor grava um vídeo embalando o seu produto, com o item e o lacre à vista.") },
    { icon: FileCheck, title: t("step3Title", "Postagem comprovada"), body: t("step3Body", "Outro vídeo na agência dos Correios, junto do comprovante de postagem com o código de rastreio.") },
    { icon: Truck, title: t("step4Title", "Rastreio narrado"), body: t("step4Body", "O sistema acompanha o rastreio e te avisa a cada passo: postado, em trânsito, saiu para entrega e entregue.") },
    { icon: MapPin, title: t("step5Title", "Chegou? Confira em 7 dias"), body: t("step5Body", "Quando o produto é entregue, você tem 7 dias para conferir e confirmar o recebimento ou relatar um problema.") },
    { icon: PackageCheck, title: t("step6Title", "Compra aprovada"), body: t("step6Body", "Se estiver tudo certo (ou se você não responder em 7 dias), a compra é aprovada automaticamente.") },
  ]

  const returnRows = [
    { reason: t("returnDefect", "Produto com defeito ou quebrado"), payer: t("payerSeller", "Vendedor"), refund: t("refundFull", "Reembolso total") },
    { reason: t("returnWrong", "Veio errado ou diferente do anúncio"), payer: t("payerSeller", "Vendedor"), refund: t("refundFull", "Reembolso total") },
    { reason: t("returnNotArrived", "Não chegou (rastreio comprova)"), payer: t("payerSeller", "Vendedor"), refund: t("refundFull", "Reembolso total") },
    { reason: t("returnRegret", "Arrependimento em até 7 dias (direito por lei)"), payer: t("payerSeller", "Vendedor"), refund: t("refundFull", "Reembolso total") },
    { reason: t("returnVoluntary", "Devolução por vontade própria após 7 dias"), payer: t("payerBuyer", "Comprador"), refund: t("refundMinusReturn", "Produto, menos o frete da volta") },
  ]

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8">
      {/* Hero */}
      <header className="mx-auto max-w-3xl text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <ShieldCheck className="h-4 w-4" aria-hidden />
          {t("badge", "Compra protegida")}
        </div>
        <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-5xl">
          {t("heroTitle", "Protocolo de Envios Freelandoo")}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
          {t("heroSubtitle", "Compra protegida de ponta a ponta. Seu dinheiro só vai para o vendedor depois que você recebe e confere o produto.")}
        </p>
      </header>

      {/* Passos */}
      <section className="mt-14">
        <h2 className="text-2xl font-black text-foreground">{t("howTitle", "Como funciona")}</h2>
        <ol className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((s, i) => {
            const Icon = s.icon
            return (
              <li key={i} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-black text-primary">
                    {i + 1}
                  </span>
                  <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
                </div>
                <h3 className="mt-3 font-bold text-foreground">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </li>
            )
          })}
        </ol>
      </section>

      {/* Dinheiro protegido */}
      <section className="mt-12">
        <div className="rounded-2xl border border-border bg-muted/30 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <Clock className="mt-1 h-6 w-6 shrink-0 text-primary" aria-hidden />
            <div>
              <h2 className="text-xl font-black text-foreground">{t("moneyTitle", "Seu dinheiro fica protegido")}</h2>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                {t("moneyBody", "O valor da compra fica retido com a Freelandoo por 30 dias. O vendedor só recebe depois desse período e desde que não haja problema em aberto. É o que garante a sua proteção contra golpes.")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Devoluções */}
      <section className="mt-12">
        <h2 className="text-2xl font-black text-foreground">{t("returnTitle", "Devoluções: quem paga o frete de volta")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {t("returnIntro", "O vendedor paga o frete de devolução sempre que o problema for culpa dele ou um direito seu por lei. Você só paga o frete de volta quando devolve por vontade própria fora desses casos.")}
        </p>
        <div className="mt-5 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("colReason", "Situação")}</th>
                <th className="px-4 py-3 font-semibold">{t("colPayer", "Quem paga a volta")}</th>
                <th className="px-4 py-3 font-semibold">{t("colRefund", "Reembolso")}</th>
              </tr>
            </thead>
            <tbody>
              {returnRows.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-4 py-3 text-foreground">{r.reason}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                      {r.payer}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.refund}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Aviso de golpe */}
      <section className="mt-12">
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="mt-1 h-6 w-6 shrink-0 text-amber-500" aria-hidden />
            <div>
              <h2 className="text-lg font-black text-foreground">{t("scamTitle", "Cuidado com golpes")}</h2>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                {t("scamBody", "Nunca pague por fora da Freelandoo. Quem pede Pix ou pagamento direto “para sair mais barato” está tirando você da proteção — é o sinal nº 1 de golpe. Dentro do protocolo, seu dinheiro está garantido.")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-14 mb-4 flex flex-col items-center gap-4 text-center">
        <p className="text-sm text-muted-foreground">{t("ctaText", "Pronto para comprar com segurança?")}</p>
        <Link
          href={ROUTES.search}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          {t("ctaButton", "Explorar a Loja")}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>
    </div>
  )
}
