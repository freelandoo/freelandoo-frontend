import type { Metadata } from "next"
import { LegalDocument } from "../_components/legal-document"

export const metadata: Metadata = {
  title: "Política de Direitos Autorais — Freelandoo",
  description: "Como notificar e tratar violações de direitos autorais e propriedade intelectual na Freelandoo.",
}

const sections = [
  {
    title: "1. Compromisso com a propriedade intelectual",
    items: [
      "A Freelandoo respeita os direitos autorais e a propriedade intelectual de terceiros.",
      "Esta política descreve como notificar conteúdo que viole esses direitos na plataforma.",
      "Aplica-se a textos, imagens, vídeos, áudios, marcas e demais materiais protegidos.",
    ],
  },
  {
    title: "2. Responsabilidade do usuário",
    items: [
      "Cada usuário deve publicar apenas conteúdo próprio ou para o qual possua autorização ou licença.",
      "É proibido reproduzir obras, marcas ou conteúdo de terceiros sem direito.",
      "O usuário responde pelas perdas e danos decorrentes de violações que praticar.",
    ],
  },
  {
    title: "3. Como notificar uma infração",
    paragraphs: [
      "O titular de direitos, ou seu representante, pode enviar uma notificação para freelandoogroup@gmail.com contendo:",
    ],
    items: [
      "Identificação do titular e dados de contato.",
      "Descrição da obra ou do direito alegadamente violado.",
      "Localização do conteúdo na plataforma, com link ou identificação.",
      "Declaração de boa-fé de que o uso não é autorizado.",
      "Declaração de veracidade das informações e de legitimidade para notificar.",
    ],
  },
  {
    title: "4. O que acontece após a notificação",
    items: [
      "A Freelandoo analisa a notificação recebida.",
      "Conteúdo aparentemente infrator pode ser removido ou ter o acesso suspenso.",
      "O usuário responsável pelo conteúdo é informado sobre a medida.",
      "A Freelandoo pode solicitar informações adicionais antes de decidir.",
    ],
  },
  {
    title: "5. Contranotificação",
    items: [
      "O usuário que considerar indevida a remoção pode apresentar uma contranotificação para freelandoogroup@gmail.com ou pelo WhatsApp (11) 96275-7599.",
      "A contranotificação deve explicar por que o conteúdo não viola direitos de terceiros e apresentar provas, quando houver.",
      "Após a análise, o conteúdo pode ser restabelecido ou mantido removido.",
    ],
  },
  {
    title: "6. Reincidência",
    paragraphs: [
      "Contas que reincidirem em violações de direitos autorais podem ser suspensas ou excluídas.",
    ],
  },
  {
    title: "7. Uso da marca Freelandoo",
    paragraphs: [
      "A marca, o logotipo e a identidade visual da Freelandoo não podem ser usados sem autorização. Solicitações de uso devem ser enviadas para freelandoogroup@gmail.com ou pelo WhatsApp (11) 96275-7599.",
    ],
  },
  {
    title: "8. Contato",
    paragraphs: ["Notificações e dúvidas sobre direitos autorais devem ser enviadas para freelandoogroup@gmail.com ou pelo WhatsApp (11) 96275-7599."],
  },
]

export default function CopyrightPolicyPage() {
  return (
    <LegalDocument
      namespace="CopyrightPolicy"
      title="Política de Direitos Autorais"
      updatedAt="Última atualização: 21 de maio de 2026"
      intro="Esta política explica como a Freelandoo trata violações de direitos autorais e de propriedade intelectual, e como titulares de direitos podem notificar conteúdo infrator publicado na plataforma."
      sections={sections}
      footerPrefix="Esta política integra os Termos de Uso da Freelandoo. Veja também nossas"
      links={[
        { href: "/community-guidelines", label: "Diretrizes da Comunidade" },
        { href: "/terms", label: "Termos de Uso" },
      ]}
    />
  )
}
