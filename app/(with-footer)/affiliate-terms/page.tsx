import type { Metadata } from "next"
import { LegalDocument } from "../_components/legal-document"

export const metadata: Metadata = {
  title: "Contrato de Afiliados — Freelandoo",
  description: "Regras do programa de afiliados e uso de cupons da plataforma Freelandoo.",
}

const sections = [
  {
    title: "1. Objetivo",
    items: [
      "O sistema permite que usuários afiliados promovam a plataforma e recebam comissão sobre novas ativações de usuários que utilizem seus cupons.",
      "Cada usuário pode gerar um código de cupom para compartilhar.",
    ],
  },
  {
    title: "2. Descontos e comissões",
    items: [
      "A plataforma define o valor de desconto aplicado a cada cupom.",
      "Cada afiliado recebe comissão sobre o valor líquido da ativação, ou seja, após aplicação de qualquer desconto.",
      "Percentuais de desconto e de comissão podem ser alterados a qualquer momento pelo administrador da plataforma.",
      "As alterações serão aplicadas somente para ativações geradas após a modificação.",
    ],
  },
  {
    title: "3. Registro e validação",
    items: [
      "Para participar do programa de afiliados, o usuário deve ter um perfil ativado.",
      "O cadastro no sistema de afiliados é automático após ativação do perfil.",
      "Cada cupom é vinculado ao usuário que o criou, garantindo rastreabilidade.",
    ],
  },
  {
    title: "4. Pagamento de comissão",
    paragraphs: [
      "O pagamento das comissões será realizado conforme histórico registrado no painel de administração. A plataforma disponibiliza um dashboard para que cada afiliado acompanhe:",
      "As comissões não são cumulativas com outros benefícios de desconto aplicados aos usuários.",
    ],
    items: ["Cupons utilizados.", "Valor líquido da ativação.", "Comissão recebida.", "Status do pagamento."],
  },
  {
    title: "5. Limitações",
    items: [
      "Afiliados não podem criar múltiplos perfis para gerar comissão extra de forma fraudulenta.",
      "Qualquer uso indevido pode resultar em exclusão do programa e perda de comissões acumuladas.",
    ],
  },
  {
    title: "6. Alterações no contrato",
    items: [
      "A Freelandoo pode alterar regras do programa, taxas de desconto e comissão a qualquer momento.",
      "Alterações serão notificadas aos afiliados através do painel administrativo.",
    ],
  },
  {
    title: "7. Aceitação",
    paragraphs: ["Ao gerar ou compartilhar um cupom, o usuário declara que leu, compreendeu e concorda integralmente com este contrato."],
  },
  {
    title: "8. Legislação aplicável",
    items: [
      "Este contrato segue as leis da República Federativa do Brasil.",
      "Disputas serão resolvidas no foro do domicílio da empresa.",
    ],
  },
]

export default function AffiliateTermsPage() {
  return (
    <LegalDocument
      namespace="AffiliateTerms"
      title="Contrato de Afiliados e Uso de Cupons"
      updatedAt="Última atualização: 28 de Abril de 2026"
      intro="Este contrato regula a utilização do sistema de cupons e a participação no programa de afiliados da plataforma Freelandoo."
      sections={sections}
      footerPrefix="Ao gerar ou compartilhar um cupom, você concorda com este contrato. Veja também nossos"
      links={[
        { href: "/terms", label: "Termos de Uso" },
        { href: "/subscription-terms", label: "Termo de Ativação" },
      ]}
    />
  )
}
