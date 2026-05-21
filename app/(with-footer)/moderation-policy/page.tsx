import type { Metadata } from "next"
import { LegalDocument } from "../_components/legal-document"

export const metadata: Metadata = {
  title: "Política de Moderação e Denúncias — Freelandoo",
  description: "Como a Freelandoo modera conteúdo, processa denúncias e aplica sanções.",
}

const sections = [
  {
    title: "1. Objetivo",
    items: [
      "Esta política descreve como a Freelandoo modera conteúdo e contas e como os usuários podem denunciar violações.",
      "A moderação busca equilibrar a liberdade de expressão com a segurança e a legalidade na plataforma.",
      "Esta política complementa os Termos de Uso e as Diretrizes da Comunidade.",
    ],
  },
  {
    title: "2. Como a moderação funciona",
    items: [
      "Moderação automática: filtros analisam textos e termos, sinalizando ou bloqueando conteúdo potencialmente abusivo, especialmente nas salas de chat.",
      "Moderação manual: a equipe analisa denúncias e situações sinalizadas.",
      "A moderação pode ocorrer antes ou depois da publicação, conforme o tipo de conteúdo.",
      "Nem todo conteúdo é revisado previamente; a análise prioriza denúncias e sinais de risco.",
    ],
  },
  {
    title: "3. O que pode ser denunciado",
    paragraphs: ["Podem ser denunciados, entre outros:"],
    items: [
      "Perfis, posts, vídeos, stories e comentários.",
      "Mensagens privadas e conteúdo em salas de chat.",
      "Produtos e pedidos da Loja.",
      "Condutas como assédio, fraude, spam e discurso de ódio.",
    ],
  },
  {
    title: "4. Como funciona uma denúncia",
    items: [
      "O usuário aciona o botão de denúncia e seleciona o motivo correspondente.",
      "A denúncia é registrada e encaminhada para análise.",
      "A análise considera o conteúdo, o contexto, o histórico e a gravidade.",
      "A identidade de quem denuncia é tratada com confidencialidade sempre que possível.",
    ],
  },
  {
    title: "5. Medidas e sanções",
    paragraphs: ["Conforme o resultado da análise, a Freelandoo pode adotar, entre outras medidas:"],
    items: [
      "Manter o conteúdo, quando não houver violação.",
      "Remover ou restringir o conteúdo denunciado.",
      "Reduzir o alcance ou a visibilidade de conteúdo e perfis.",
      "Advertir, restringir, suspender ou excluir a conta.",
      "Reter valores ou cancelar transações associadas a fraude.",
    ],
  },
  {
    title: "6. Reincidência",
    paragraphs: [
      "Violações repetidas ou graves levam a sanções progressivamente mais severas, podendo resultar na exclusão definitiva da conta.",
    ],
  },
  {
    title: "7. Recurso e contestação",
    items: [
      "O usuário afetado por uma medida de moderação pode contestá-la pelo e-mail suporte@freelandoo.com.",
      "A contestação deve indicar o conteúdo ou a conta e os motivos da discordância.",
      "A Freelandoo reavalia a decisão e comunica o resultado.",
    ],
  },
  {
    title: "8. Conteúdo ilegal e autoridades",
    items: [
      "Conteúdo manifestamente ilegal pode ser removido a qualquer momento.",
      "Conteúdo que envolva crimes, especialmente contra menores, pode ser comunicado às autoridades competentes.",
      "A Freelandoo atende a ordens judiciais e a requisições legais válidas.",
    ],
  },
  {
    title: "9. Isenção de responsabilidade",
    paragraphs: [
      "A moderação é feita com diligência, mas não garante a identificação prévia de todo conteúdo impróprio. Nos termos do Marco Civil da Internet, a responsabilidade da Freelandoo por conteúdo de terceiros observa a legislação aplicável.",
    ],
  },
  {
    title: "10. Contato",
    paragraphs: ["Dúvidas sobre moderação e denúncias podem ser enviadas para suporte@freelandoo.com."],
  },
]

export default function ModerationPolicyPage() {
  return (
    <LegalDocument
      namespace="ModerationPolicy"
      title="Política de Moderação e Denúncias"
      updatedAt="Última atualização: 21 de maio de 2026"
      intro="Esta política explica como a Freelandoo modera o conteúdo publicado na plataforma, como qualquer usuário pode denunciar violações e quais medidas podem ser aplicadas."
      sections={sections}
      footerPrefix="Esta política complementa as Diretrizes da Comunidade da Freelandoo. Veja também nossos"
      links={[
        { href: "/community-guidelines", label: "Diretrizes da Comunidade" },
        { href: "/terms", label: "Termos de Uso" },
      ]}
    />
  )
}
