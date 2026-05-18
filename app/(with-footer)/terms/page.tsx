import type { Metadata } from "next"
import { LegalDocument } from "../_components/legal-document"

export const metadata: Metadata = {
  title: "Termos de Uso — Freelandoo",
  description: "Leia os Termos de Uso da plataforma Freelandoo.",
}

const sections = [
  {
    title: "1. Sobre a plataforma",
    items: [
      "A Freelandoo atua exclusivamente como plataforma de divulgação e conexão entre freelancers e clientes.",
      "Não intermedeia negociações, não participa de acordos financeiros e não recebe pagamentos entre usuários.",
      "Toda relação contratual, valores e entregas são tratadas diretamente entre as partes.",
    ],
  },
  {
    title: "2. Cadastro e responsabilidade do usuário",
    items: [
      "Cada usuário é responsável pela veracidade e completude das informações em seu perfil.",
      "É proibido fornecer informações falsas ou enganosas.",
      "O usuário é responsável pelo cumprimento de acordos e prazos com outros usuários.",
      "A Freelandoo não se responsabiliza por descumprimento de acordos, atrasos, qualidade de entregas ou prejuízos.",
    ],
  },
  {
    title: "3. Conta e segurança",
    items: [
      "É obrigatório fornecer e manter dados corretos e atualizados.",
      "O usuário é responsável por manter senha e credenciais seguras.",
      "Qualquer uso não autorizado da conta deve ser reportado imediatamente.",
    ],
  },
  {
    title: "4. Pagamentos e ativação",
    items: [
      "O acesso à plataforma é concedido mediante pagamento da ativação do perfil.",
      "Valores, formas de pagamento e política de reembolso estão disponíveis na página de ativação.",
      "O usuário é responsável por seus dados de pagamento; a Freelandoo não guarda informações sensíveis de cartão (usamos Stripe).",
    ],
  },
  {
    title: "5. Conteúdo e propriedade intelectual",
    items: [
      "Todo conteúdo criado e publicado pelos usuários é de responsabilidade do próprio usuário.",
      "A Freelandoo detém direitos sobre a marca, logo e interface da plataforma.",
      "Nenhum material da plataforma pode ser copiado, distribuído ou comercializado sem autorização.",
    ],
  },
  {
    title: "6. Privacidade e dados",
    paragraphs: ["A coleta e uso de dados segue a Política de Privacidade."],
  },
  {
    title: "7. Suspensão e exclusão",
    items: [
      "A Freelandoo reserva o direito de suspender ou excluir contas que violem os termos.",
      "Motivos incluem: conduta inadequada, fraude, violação de propriedade intelectual, ou descumprimento destes termos.",
    ],
  },
  {
    title: "8. Limitação de responsabilidade",
    items: [
      "A plataforma é fornecida no estado em que se encontra, sem garantias de qualquer tipo.",
      "A Freelandoo não será responsável por danos diretos, indiretos, incidentais ou consequentes.",
    ],
  },
  {
    title: "9. Alterações nos termos",
    items: [
      "A Freelandoo pode atualizar estes termos periodicamente.",
      "Atualizações são comunicadas no site e entram em vigor imediatamente após publicação.",
    ],
  },
  {
    title: "10. Legislação aplicável",
    items: [
      "Estes termos seguem as leis da República Federativa do Brasil.",
      "Qualquer disputa será resolvida no foro de domicílio da empresa.",
    ],
  },
]

export default function TermsPage() {
  return (
    <LegalDocument
      namespace="Terms"
      title="Termos de Uso"
      updatedAt="Última atualização: 28 de Abril de 2026"
      intro="Ao acessar e utilizar a plataforma Freelandoo, você declara que leu, compreendeu e concorda integralmente com os termos abaixo."
      sections={sections}
      footerPrefix="Ao utilizar o Freelandoo, você concorda integralmente com estes Termos de Uso. Veja também nossa"
      links={[
        { href: "/privacy-policy", label: "Política de Privacidade" },
        { href: "/subscription-terms", label: "Termo de Ativação" },
      ]}
    />
  )
}
