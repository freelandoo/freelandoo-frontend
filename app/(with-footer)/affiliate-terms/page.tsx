import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Contrato de Afiliados — Freelandoo",
  description: "Regras do programa de afiliados e uso de cupons da plataforma Freelandoo.",
}

export default function AffiliateTermsPage() {
  return (
    <main className="flex-1 bg-background">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-2">Contrato de Afiliados e Uso de Cupons</h1>
        <p className="text-sm text-muted-foreground mb-10">Última atualização: 28 de Abril de 2026</p>

        <p className="text-muted-foreground mb-8">
          Este contrato regula a utilização do sistema de cupons e a participação no programa de
          afiliados da plataforma Freelandoo.
        </p>

        <Section title="1. Objetivo">
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>O sistema permite que usuários afiliados promovam a plataforma e recebam comissão sobre novas assinaturas de usuários que utilizem seus cupons.</li>
            <li>Cada usuário pode gerar um código de cupom para compartilhar.</li>
          </ul>
        </Section>

        <Section title="2. Descontos e comissões">
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>A plataforma define o valor de desconto aplicado a cada cupom.</li>
            <li>Cada afiliado recebe <strong className="text-foreground">comissão sobre o valor líquido da assinatura</strong>, ou seja, após aplicação de qualquer desconto.</li>
            <li>Percentuais de desconto e de comissão podem ser alterados a qualquer momento pelo administrador da plataforma.</li>
            <li>As alterações serão aplicadas <strong className="text-foreground">somente para assinaturas geradas após a modificação</strong>.</li>
          </ul>
        </Section>

        <Section title="3. Registro e validação">
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Para participar do programa de afiliados, o usuário deve ter assinatura ativa.</li>
            <li>O cadastro no sistema de afiliados é automático após ativação da assinatura.</li>
            <li>Cada cupom é vinculado ao usuário que o criou, garantindo rastreabilidade.</li>
          </ul>
        </Section>

        <Section title="4. Pagamento de comissão">
          <p className="text-muted-foreground mb-2">O pagamento das comissões será realizado conforme histórico registrado no painel de administração. A plataforma disponibiliza um dashboard para que cada afiliado acompanhe:</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Cupons utilizados.</li>
            <li>Valor líquido da assinatura.</li>
            <li>Comissão recebida.</li>
            <li>Status do pagamento.</li>
          </ul>
          <p className="text-muted-foreground mt-2">As comissões não são cumulativas com outros benefícios de desconto aplicados aos usuários.</p>
        </Section>

        <Section title="5. Limitações">
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Afiliados não podem criar múltiplos perfis para gerar comissão extra de forma fraudulenta.</li>
            <li>Qualquer uso indevido pode resultar em exclusão do programa e perda de comissões acumuladas.</li>
          </ul>
        </Section>

        <Section title="6. Alterações no contrato">
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>A Freelandoo pode alterar regras do programa, taxas de desconto e comissão a qualquer momento.</li>
            <li>Alterações serão notificadas aos afiliados através do painel administrativo.</li>
          </ul>
        </Section>

        <Section title="7. Aceitação">
          <p className="text-muted-foreground">
            Ao gerar ou compartilhar um cupom, o usuário declara que leu, compreendeu e concorda
            integralmente com este contrato.
          </p>
        </Section>

        <Section title="8. Legislação aplicável">
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Este contrato segue as leis da República Federativa do Brasil.</li>
            <li>Disputas serão resolvidas no foro do domicílio da empresa.</li>
          </ul>
        </Section>

        <div className="mt-10 pt-8 border-t border-border text-sm text-muted-foreground">
          Ao gerar ou compartilhar um cupom, você concorda com este contrato. Veja também nossos{" "}
          <Link href="/terms" className="text-primary hover:underline">Termos de Uso</Link> e{" "}
          <Link href="/subscription-terms" className="text-primary hover:underline">Contrato de Assinatura</Link>.
        </div>
      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-foreground mb-3">{title}</h2>
      {children}
    </section>
  )
}
