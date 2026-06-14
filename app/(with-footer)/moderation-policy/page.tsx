import type { Metadata } from "next"
import { LegalDocument } from "../_components/legal-document"

export const metadata: Metadata = {
  title: "Política de Moderação e Denúncias — Freelandoo",
  description: "Como a Freelandoo modera conteúdo, processa denúncias, em que prazos e quais sanções aplica.",
}

const sections = [
  {
    title: "1. Objetivo",
    items: [
      "Esta política descreve como a Freelandoo modera conteúdo e contas, como os usuários podem denunciar violações e em que prazos as denúncias são analisadas.",
      "A moderação busca equilibrar a liberdade de expressão com a segurança, a legalidade e a proteção das pessoas na plataforma.",
      "Esta política complementa os Termos de Uso e as Diretrizes da Comunidade.",
    ],
  },
  {
    title: "2. Como a moderação funciona",
    items: [
      "Moderação automática: filtros analisam textos e termos e podem sinalizar, pontuar ou bloquear conteúdo potencialmente abusivo, especialmente nas salas de chat e nas transmissões ao vivo.",
      "Moderação manual: a equipe analisa denúncias e situações sinalizadas, considerando o conteúdo, o contexto, o histórico e a gravidade.",
      "Denúncias pendentes e sinais de risco são destacados para a administração para que sejam tratados com prioridade.",
      "A moderação pode ocorrer antes ou depois da publicação, conforme o tipo de conteúdo. Nem todo conteúdo é revisado previamente; a análise prioriza denúncias e sinais de risco.",
    ],
  },
  {
    title: "3. O que pode ser denunciado",
    paragraphs: ["Podem ser denunciados, entre outros:"],
    items: [
      "Perfis, posts, vídeos (Bees e Stories), transmissões ao vivo, comentários e avaliações.",
      "Mensagens privadas e conteúdo em salas de chat ao vivo.",
      "Produtos, cursos, serviços, agendamentos e pedidos da Loja.",
      "Condutas como assédio, fraude, spam, discurso de ódio e violação de direitos de terceiros.",
    ],
  },
  {
    title: "4. Como funciona uma denúncia",
    items: [
      "O usuário aciona o botão de denúncia disponível no conteúdo ou no perfil e seleciona o motivo correspondente.",
      "A denúncia é registrada e encaminhada para análise da equipe de moderação.",
      "A análise considera o conteúdo, o contexto, o histórico do usuário e a gravidade do caso.",
      "A identidade de quem denuncia é tratada com confidencialidade sempre que possível.",
    ],
  },
  {
    title: "5. Prazos de análise e priorização",
    paragraphs: [
      "A Freelandoo trata as denúncias de acordo com a gravidade do caso, observando, como metas operacionais de diligência, os seguintes critérios:",
    ],
    items: [
      "Conteúdo manifestamente ilegal ou que envolva risco a crianças e adolescentes é tratado de forma prioritária e pode ser removido assim que identificado, independentemente de denúncia.",
      "Casos graves — como assédio, ameaças, fraude, nudez ou atos sexuais não consentidos e exposição indevida de dados pessoais — recebem análise prioritária.",
      "As demais denúncias são analisadas em prazo razoável, em regra em até 7 (sete) dias úteis, conforme o volume recebido e a complexidade do caso.",
      "Enquanto a denúncia é analisada, o conteúdo pode ser mantido, ter o alcance reduzido ou ser restringido preventivamente, conforme o risco.",
      "Esses prazos são metas de diligência e não constituem garantia de resultado; podem variar conforme o volume de denúncias, a necessidade de informações adicionais e a gravidade.",
      "Quando aplicável, o denunciante e o usuário afetado podem ser informados sobre o desfecho da análise.",
    ],
  },
  {
    title: "6. Medidas e sanções",
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
    title: "7. Reincidência",
    paragraphs: [
      "Violações repetidas ou graves levam a sanções progressivamente mais severas, podendo resultar na exclusão definitiva da conta.",
    ],
  },
  {
    title: "8. Recurso e contestação",
    items: [
      "O usuário afetado por uma medida de moderação pode contestá-la pelo e-mail freelandoogroup@gmail.com ou pelo WhatsApp (11) 96275-7599.",
      "A contestação deve indicar o conteúdo ou a conta e os motivos da discordância.",
      "A Freelandoo reavalia a decisão e comunica o resultado.",
    ],
  },
  {
    title: "9. Conteúdo ilegal, direitos de terceiros e autoridades",
    items: [
      "Conteúdo manifestamente ilegal pode ser removido a qualquer momento.",
      "Conteúdo que viole direitos autorais ou que exponha nudez ou atos sexuais de caráter privado sem autorização pode ser removido mediante notificação do interessado, nos termos do art. 21 do Marco Civil da Internet (Lei nº 12.965/2014).",
      "Nos demais casos, a responsabilização da Freelandoo por conteúdo de terceiros, em regra, depende do descumprimento de ordem judicial específica de remoção (art. 19 do Marco Civil da Internet).",
      "Conteúdo que envolva crimes, especialmente contra crianças e adolescentes, pode ser comunicado às autoridades competentes.",
      "A Freelandoo atende a ordens judiciais e a requisições legais válidas.",
    ],
  },
  {
    title: "10. Isenção de responsabilidade",
    paragraphs: [
      "A moderação é feita com diligência, mas não garante a identificação prévia de todo conteúdo impróprio. Nos termos do Marco Civil da Internet, a responsabilidade da Freelandoo por conteúdo de terceiros observa a legislação aplicável.",
    ],
  },
  {
    title: "11. Contato",
    paragraphs: ["Dúvidas sobre moderação e denúncias podem ser enviadas para freelandoogroup@gmail.com ou pelo WhatsApp (11) 96275-7599."],
  },
]

export default function ModerationPolicyPage() {
  return (
    <LegalDocument
      namespace="ModerationPolicy"
      title="Política de Moderação e Denúncias"
      updatedAt="Última atualização: 14 de junho de 2026"
      intro="Esta política explica como a Freelandoo modera o conteúdo publicado na plataforma, como qualquer usuário pode denunciar violações, em que prazos as denúncias são analisadas e quais medidas podem ser aplicadas."
      sections={sections}
      footerPrefix="Esta política complementa as Diretrizes da Comunidade da Freelandoo. Veja também nossos"
      links={[
        { href: "/community-guidelines", label: "Diretrizes da Comunidade" },
        { href: "/terms", label: "Termos de Uso" },
      ]}
    />
  )
}
