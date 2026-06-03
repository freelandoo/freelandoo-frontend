import type { Metadata } from "next"
import { LegalDocument } from "../_components/legal-document"

export const metadata: Metadata = {
  title: "Regulamento da Casa Views — Freelandoo",
  description:
    "Regras do reality show Casa Views: participantes, ranking, premiação por mérito e participação da audiência. Participação gratuita, sem sorteio.",
}

const sections = [
  {
    title: "1. O que é a Casa Views",
    paragraphs: [
      "A Casa Views é um programa de conteúdo (reality show) promovido pela Freelandoo, organizado em temporadas, no qual participantes convidados produzem conteúdo e competem em um ranking de engajamento. A audiência acompanha, interage e pode acumular pontos conforme as regras deste Regulamento.",
      "Este Regulamento integra os Termos de Uso da Freelandoo. Em caso de divergência sobre a mecânica da Casa Views, prevalece este documento.",
    ],
  },
  {
    title: "2. Natureza da premiação (sem sorteio)",
    items: [
      "A participação na Casa Views, tanto de participantes quanto da audiência, é gratuita e não exige qualquer pagamento, compra ou aposta como condição para participar ou para concorrer a prêmios.",
      "Os prêmios e pontuações são atribuídos exclusivamente por mérito, desempenho e engajamento mensuráveis — não há sorteio, loteria, aposta ou distribuição de prêmios mediante sorte.",
      "Por não envolver pagamento para concorrer nem elemento de azar, a Casa Views não constitui promoção comercial sujeita a autorização prévia nos termos da Lei nº 5.768/1971 e da legislação de loterias.",
      "A Freelandoo pode, a seu critério, oferecer prêmios em dinheiro, créditos, produtos ou benefícios, descritos nas comunicações de cada temporada.",
    ],
  },
  {
    title: "3. Participantes",
    items: [
      "Os participantes são convidados pela Freelandoo e devem ser maiores de 18 anos e plenamente capazes.",
      "Ao aceitar participar, o participante autoriza o uso de sua imagem, voz, nome e conteúdo produzido durante a temporada para fins de divulgação da Casa Views e da Freelandoo, nos canais da plataforma e em redes sociais.",
      "O conteúdo produzido deve respeitar as Diretrizes da Comunidade e a legislação aplicável. Conteúdo proibido pode levar à desclassificação.",
      "Eventuais cachês, premiações ou condições específicas de cada participante são tratados em acordo próprio, separado deste Regulamento.",
    ],
  },
  {
    title: "4. Ranking e pontuação",
    items: [
      "O desempenho dos participantes é apurado por métricas públicas de engajamento (como visualizações, curtidas, comentários e compartilhamentos) do conteúdo da temporada.",
      "Cada dia da temporada pode ser fechado em um ranking diário; a posição obtida converte-se em pontos, que se somam ao longo da temporada para compor o ranking geral.",
      "Os critérios de pontuação são informados nas comunicações da temporada e podem ser ajustados pela Freelandoo para preservar a integridade da competição.",
      "Métricas obtidas por fraude, automação, compra de engajamento ou qualquer manipulação são desconsideradas e podem gerar desclassificação.",
    ],
  },
  {
    title: "5. Participação e pontos da audiência",
    items: [
      "A audiência pode acumular pontos ou saldo ao interagir com a Casa Views, conforme as regras vigentes de cada temporada, sem qualquer custo para participar.",
      "Os pontos e saldos da audiência não constituem moeda, não têm valor monetário fora da plataforma, não são sacáveis em dinheiro e não rendem juros.",
      "Quando permitido, os pontos ou saldo podem ser convertidos em benefícios dentro da plataforma — como descontos em compras, serviços, cursos ou itens — nos termos e prazos informados.",
      "A Freelandoo pode definir limites, validade, regras antifraude e condições de resgate, e pode encerrar ou alterar a mecânica de pontos da audiência a qualquer tempo, mediante aviso na plataforma.",
      "Pontos obtidos de forma fraudulenta ou em violação a este Regulamento podem ser cancelados.",
    ],
  },
  {
    title: "6. Conveniência Views (loja)",
    items: [
      "Durante a Casa Views, a Freelandoo pode disponibilizar uma loja de produtos e itens (Conveniência Views), eventualmente associada aos participantes.",
      "As compras na Conveniência Views seguem os Termos do Marketplace e a Política de Trocas, Devoluções e Frete.",
      "A atribuição de uma venda a um participante, quando existir, é mecânica interna de pontuação e não altera os direitos do comprador.",
    ],
  },
  {
    title: "7. Elegibilidade e conduta da audiência",
    items: [
      "Para acumular ou resgatar pontos, o usuário deve possuir conta ativa e regular na Freelandoo.",
      "Menores de 18 anos só participam por meio de Conta Supervisionada, observada a Política de Privacidade de Menores.",
      "É vedado criar múltiplas contas, usar automação ou qualquer meio para inflar artificialmente pontos, votos ou engajamento.",
    ],
  },
  {
    title: "8. Alterações, suspensão e ausência de garantia",
    items: [
      "A Freelandoo pode alterar datas, regras, critérios, prêmios ou suspender e encerrar uma temporada da Casa Views por motivos operacionais, técnicos, legais ou de força maior.",
      "A Freelandoo não garante disponibilidade ininterrupta da transmissão, das interações ou do acúmulo de pontos.",
      "A participação não gera expectativa de direito a qualquer prêmio específico antes da apuração final conforme este Regulamento.",
    ],
  },
  {
    title: "9. Contato",
    paragraphs: [
      "Dúvidas sobre a Casa Views podem ser enviadas para freelandoogroup@gmail.com ou pelo WhatsApp (11) 96275-7599.",
    ],
  },
]

export default function CasaViewsRegulamentoPage() {
  return (
    <LegalDocument
      namespace="CasaViewsRegulamento"
      title="Regulamento da Casa Views"
      updatedAt="Última atualização: 3 de junho de 2026"
      intro="Este Regulamento descreve as regras do reality show Casa Views da Freelandoo: participantes, ranking, premiação por mérito e a participação da audiência. A participação é gratuita e os prêmios são atribuídos por desempenho e engajamento, sem sorteio."
      sections={sections}
      footerPrefix="Ao participar ou interagir com a Casa Views, você concorda com este Regulamento. Veja também nossos"
      links={[
        { href: "/terms", label: "Termos de Uso" },
        { href: "/polens-terms", label: "Poléns e Itens Digitais" },
        { href: "/marketplace-terms", label: "Termos do Marketplace" },
      ]}
    />
  )
}
