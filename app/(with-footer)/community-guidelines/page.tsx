import type { Metadata } from "next"
import { LegalDocument } from "../_components/legal-document"

export const metadata: Metadata = {
  title: "Diretrizes da Comunidade — Freelandoo",
  description: "As regras de conteúdo e convivência para perfis, feed, vídeos, stories, mensagens e chat na Freelandoo.",
}

const sections = [
  {
    title: "1. Propósito destas diretrizes",
    items: [
      "Estas diretrizes valem para todo conteúdo e interação na Freelandoo, incluindo perfis, portfólios, Feed, Bees, Stories, comentários, mensagens e salas de chat.",
      "O objetivo é manter um ambiente profissional, seguro e respeitoso para todos os usuários.",
      "Estas diretrizes complementam os Termos de Uso; a sua violação pode gerar sanções.",
    ],
  },
  {
    title: "2. Princípios gerais",
    items: [
      "Respeite os demais usuários, suas opiniões e sua privacidade.",
      "Publique conteúdo verdadeiro, próprio ou devidamente autorizado.",
      "Use a plataforma para fins profissionais, criativos e de conexão legítima.",
      "Aja de boa-fé em negociações, avaliações e indicações.",
    ],
  },
  {
    title: "3. Conteúdo permitido",
    items: [
      "Apresentação profissional, portfólio e trabalhos realizados.",
      "Publicações sobre serviços, produtos, bastidores e conteúdo educacional.",
      "Interações respeitosas com clientes, colegas e clans.",
      "Divulgação de oportunidades e pedidos legítimos.",
    ],
  },
  {
    title: "4. Conteúdo e condutas proibidos",
    paragraphs: ["É proibido publicar ou praticar:"],
    items: [
      "Discurso de ódio, racismo, discriminação, assédio, ameaças ou bullying.",
      "Conteúdo sexual explícito, nudez não consentida ou qualquer material que envolva menores de forma imprópria.",
      "Violência gráfica, incitação a crimes, automutilação ou suicídio.",
      "Desinformação grave, golpes, esquemas fraudulentos e falsas promessas.",
      "Spam, divulgação massiva não solicitada e manipulação de métricas.",
      "Divulgação de dados pessoais de terceiros sem autorização.",
      "Conteúdo que viole direitos autorais, marcas ou outros direitos de terceiros.",
      "Oferta ou venda de itens e serviços ilícitos.",
    ],
  },
  {
    title: "5. Mensagens, chat e transmissões ao vivo",
    items: [
      "As mensagens privadas, as salas de chat e as transmissões ao vivo (Lives) devem seguir as mesmas regras de respeito e legalidade.",
      "É proibido usar mensagens, chat ou transmissões para assédio, spam ou aliciamento.",
      "Quem transmite ao vivo é responsável por tudo o que exibe e diz durante a transmissão, em tempo real.",
      "Os presentes virtuais enviados durante as Lives não autorizam, solicitam ou recompensam qualquer conteúdo proibido por estas diretrizes.",
      "A plataforma utiliza ferramentas de moderação, incluindo filtros automáticos de termos, no chat e nas transmissões ao vivo.",
      "Conversas e transmissões podem ser revisadas mediante denúncia ou exigência legal.",
    ],
  },
  {
    title: "6. Vídeos (Bees e Stories)",
    items: [
      "Vídeos publicados devem respeitar estas diretrizes e os direitos de imagem das pessoas exibidas.",
      "É proibido publicar vídeos com conteúdo proibido ou que induzam terceiros a erro.",
      "A trilha sonora e os demais elementos do vídeo devem ser de uso autorizado.",
    ],
  },
  {
    title: "7. Proteção de menores",
    items: [
      "É terminantemente proibido qualquer conteúdo que sexualize, explore ou coloque menores em risco.",
      "Contas Supervisionadas têm regras e proteções adicionais, descritas em termos próprios.",
      "Conteúdo que viole a proteção de menores é removido e pode ser comunicado às autoridades.",
    ],
  },
  {
    title: "8. Propriedade intelectual",
    paragraphs: [
      "Publique apenas conteúdo próprio ou autorizado. Reivindicações de violação de direitos autorais seguem a Política de Direitos Autorais.",
    ],
  },
  {
    title: "9. Consequências das violações",
    items: [
      "Conteúdo que viole estas diretrizes pode ser removido ou ter o alcance reduzido.",
      "Contas podem ser advertidas, restringidas, suspensas ou excluídas conforme a gravidade.",
      "Casos graves podem ser comunicados às autoridades competentes.",
      "O detalhamento do processo está na Política de Moderação e Denúncias.",
    ],
  },
  {
    title: "10. Como denunciar",
    paragraphs: [
      "Conteúdo ou conduta que viole estas diretrizes pode ser denunciado pelos botões de denúncia da plataforma ou pelo e-mail freelandoogroup@gmail.com ou pelo WhatsApp (11) 96275-7599.",
    ],
  },
  {
    title: "11. Contato",
    paragraphs: ["Dúvidas sobre estas diretrizes podem ser enviadas para freelandoogroup@gmail.com ou pelo WhatsApp (11) 96275-7599."],
  },
]

export default function CommunityGuidelinesPage() {
  return (
    <LegalDocument
      namespace="CommunityGuidelines"
      title="Diretrizes da Comunidade"
      updatedAt="Última atualização: 14 de junho de 2026"
      intro="A Freelandoo é uma comunidade de profissionais e criadores. Estas diretrizes definem o que é esperado de todo conteúdo e interação na plataforma, para que o ambiente permaneça seguro, respeitoso e profissional."
      sections={sections}
      footerPrefix="Ao publicar conteúdo na Freelandoo, você concorda com estas Diretrizes da Comunidade. Veja também nossa"
      links={[
        { href: "/moderation-policy", label: "Política de Moderação e Denúncias" },
        { href: "/terms", label: "Termos de Uso" },
      ]}
    />
  )
}
