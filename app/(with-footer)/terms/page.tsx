import type { Metadata } from "next"
import { LegalDocument } from "../_components/legal-document"
import { legalCompanyQualification } from "@/lib/legal"

export const metadata: Metadata = {
  title: "Termos de Uso — Freelandoo",
  description: "Leia os Termos de Uso da plataforma Freelandoo.",
}

const sections = [
  {
    title: "1. Definições",
    items: [
      `Plataforma / Freelandoo: o site, as aplicações e os serviços operados pela ${legalCompanyQualification()}.`,
      "Usuário: qualquer pessoa que acessa ou utiliza a plataforma, cadastrada ou não.",
      "Conta: o registro único de um usuário, vinculado a um e-mail.",
      "Perfil e subperfil: páginas profissionais públicas criadas pelo usuário; um usuário pode manter um perfil principal e subperfis.",
      "Clan: subperfil coletivo que reúne vários profissionais.",
      "Enxame: categoria temática da vitrine que agrupa profissões e perfis.",
      "Conteúdo do usuário: textos, imagens, vídeos, áudios, portfólios, posts, stories, transmissões ao vivo e mensagens publicados pelos usuários.",
      "Loja: o ambiente de compra e venda de produtos entre usuários dentro da plataforma.",
      "Lives: transmissões ao vivo realizadas por usuários na plataforma.",
      "Poléns: créditos virtuais utilizados na plataforma, sem valor monetário e não sacáveis.",
      "Presentes: itens virtuais adquiridos com Poléns e enviados durante transmissões ao vivo, regidos pelos Termos de Poléns e Itens Digitais.",
      "Carteira: o painel em que o usuário acompanha seu saldo, ganhos e repasses dentro da plataforma.",
    ],
  },
  {
    title: "2. Aceitação e elegibilidade",
    items: [
      "O uso da plataforma é destinado a pessoas com 18 anos ou mais.",
      "Menores de 18 anos só podem utilizar a plataforma por meio de uma Conta Supervisionada, com consentimento e acompanhamento de um responsável legal.",
      "Ao utilizar a plataforma, o usuário declara ter capacidade civil para celebrar este contrato.",
      "A aceitação destes termos ocorre no momento do cadastro e a cada novo acesso à plataforma.",
    ],
  },
  {
    title: "3. O papel da Freelandoo",
    paragraphs: [
      "A Freelandoo é uma plataforma que conecta profissionais, criadores e prestadores de serviço a clientes, oferecendo vitrine, rede social, comunicação e ferramentas de transação. O papel da Freelandoo varia conforme o tipo de interação:",
    ],
    items: [
      "Conexão e divulgação: na vitrine, no feed e nas mensagens, a Freelandoo apenas aproxima as partes. Negociações, valores, prazos e entregas de serviços contratados diretamente entre usuários são de responsabilidade exclusiva das partes.",
      "Transações dentro da plataforma: na Loja, nos Agendamentos e na compra de cursos e itens digitais, a Freelandoo atua como facilitadora, processando o pagamento por meio de parceiros e, quando aplicável, intermediando o repasse de valores.",
      "A Freelandoo não é empregadora, contratante, vendedora dos produtos anunciados por usuários nem prestadora dos serviços oferecidos pelos profissionais.",
      "A Freelandoo não garante a contratação, a qualidade, a entrega ou o resultado de qualquer serviço ou produto negociado entre usuários.",
    ],
  },
  {
    title: "4. Conta, perfis e segurança",
    items: [
      "O cadastro exige informações verdadeiras, completas e atualizadas.",
      "Cada usuário é responsável por manter a confidencialidade de suas credenciais e por toda atividade realizada em sua conta.",
      "É proibido criar contas com dados falsos, se passar por terceiros ou manter múltiplas contas para fraudar funcionalidades, rankings ou comissões.",
      "Qualquer uso não autorizado da conta deve ser comunicado imediatamente à Freelandoo.",
      "Um usuário pode manter um perfil principal e subperfis profissionais; cada subperfil profissional pode exigir ativação própria.",
    ],
  },
  {
    title: "5. Ativação, pagamentos e moeda virtual",
    items: [
      "Determinadas funcionalidades exigem a ativação paga do perfil, regida pelo Termo de Ativação.",
      "Os pagamentos são processados por provedores externos, como a Stripe, incluindo cartão e Pix, quando disponíveis; a Freelandoo não armazena dados completos de cartão.",
      "A plataforma oferece Poléns, créditos virtuais sem valor monetário, não reembolsáveis e não sacáveis, conforme os Termos de Poléns e Itens Digitais.",
      "Compras de itens digitais, como banners de Manifestação e destaques Premium, cursos, produtos da Loja e agendamentos possuem regras próprias descritas nos respectivos termos.",
    ],
  },
  {
    title: "6. Conteúdo gerado pelo usuário",
    items: [
      "O usuário é o único responsável pelo conteúdo que publica, incluindo textos, imagens, vídeos, áudios, posts, stories e mensagens.",
      "O usuário declara possuir todos os direitos necessários sobre o conteúdo que publica e não violar direitos de terceiros.",
      "Ao publicar conteúdo, o usuário concede à Freelandoo uma licença não exclusiva, mundial e gratuita para hospedar, exibir, reproduzir e divulgar esse conteúdo na plataforma e em suas comunicações, enquanto o conteúdo estiver publicado.",
      "A Freelandoo pode remover ou restringir conteúdo que viole estes termos, as Diretrizes da Comunidade ou a legislação aplicável.",
      "Qualquer usuário pode denunciar conteúdo pelos botões de denúncia da plataforma. As denúncias são analisadas conforme a gravidade e os prazos descritos na Política de Moderação e Denúncias.",
      "Nos termos do Marco Civil da Internet (Lei nº 12.965/2014), a Freelandoo não é previamente responsável por conteúdo de terceiros, podendo removê-lo mediante notificação — inclusive nas hipóteses do art. 21 (direitos autorais e exposição íntima não autorizada) — ou mediante ordem judicial.",
    ],
  },
  {
    title: "7. Funcionalidades da plataforma",
    paragraphs: [
      "A Freelandoo disponibiliza, entre outras, as seguintes funcionalidades, que podem ser alteradas, incluídas ou descontinuadas a qualquer momento:",
    ],
    items: [
      "Vitrine por Enxames, perfis, subperfis, clans, portfólios e ranking.",
      "Rede social: Feed, Bees, Stories, mensagens privadas, salas de chat ao vivo e transmissões ao vivo (Lives) com presentes virtuais.",
      "Cursos e conteúdos educacionais.",
      "Loja de produtos e agendamento de serviços.",
      "Carteira: acompanhamento de saldo, ganhos e repasses, e moeda virtual (Poléns).",
      "Itens de destaque e personalização, como Manifestação e Premium.",
      "Programa de afiliados e cupons.",
      "Casa Views: reality show, ranking de engajamento e participação da audiência, regidos pelo Regulamento da Casa Views.",
    ],
  },
  {
    title: "8. Transações entre usuários (Loja e Agendamentos)",
    items: [
      "Na Loja e nos Agendamentos, o pagamento é processado pela plataforma e o valor devido ao vendedor ou profissional fica retido por um período de garantia antes do repasse.",
      "As regras de venda, frete, prazos, garantias, devoluções e repasses estão detalhadas nos Termos do Marketplace e na Política de Trocas, Devoluções e Frete.",
      "A Freelandoo pode cobrar tarifas e custos operacionais sobre essas transações, informados antes da conclusão da compra.",
      "A responsabilidade pela qualidade, conformidade e entrega do produto ou serviço é do vendedor ou profissional.",
    ],
  },
  {
    title: "9. Condutas proibidas",
    paragraphs: ["É vedado ao usuário, entre outras condutas:"],
    items: [
      "Publicar conteúdo ilegal, ofensivo, discriminatório, violento, sexualmente explícito ou que explore menores.",
      "Fraudar pagamentos, cupons, comissões, rankings ou qualquer funcionalidade.",
      "Praticar spam, assédio, ameaças ou divulgação não autorizada de dados de terceiros.",
      "Comercializar produtos ou serviços ilícitos ou proibidos pela plataforma.",
      "Burlar mecanismos de segurança, realizar engenharia reversa ou sobrecarregar a infraestrutura.",
      "Utilizar a plataforma para contornar tarifas ou induzir terceiros a erro.",
    ],
  },
  {
    title: "10. Moderação, suspensão e encerramento",
    items: [
      "A Freelandoo pode moderar conteúdo e contas de forma automatizada e manual, conforme a Política de Moderação e Denúncias.",
      "Contas e conteúdos que violem estes termos podem ser advertidos, restringidos, suspensos ou excluídos.",
      "O usuário pode encerrar sua conta a qualquer momento; alguns registros podem ser mantidos conforme a lei.",
      "Valores pagos por funcionalidades já usufruídas não são restituídos em caso de encerramento por violação, salvo disposição legal em contrário.",
    ],
  },
  {
    title: "11. Propriedade intelectual",
    items: [
      "A marca, o logotipo, o nome Freelandoo, a interface, o código e os elementos visuais da plataforma pertencem à Freelandoo e são protegidos por lei.",
      "É proibido copiar, distribuir, modificar ou explorar comercialmente qualquer elemento da plataforma sem autorização.",
      "O conteúdo publicado pelos usuários permanece de titularidade dos respectivos autores, observada a licença prevista na cláusula 6.",
    ],
  },
  {
    title: "12. Privacidade e proteção de dados",
    paragraphs: [
      "O tratamento de dados pessoais segue a Política de Privacidade e a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).",
    ],
  },
  {
    title: "13. Publicidade",
    items: [
      "A plataforma pode exibir anúncios próprios e de terceiros, incluindo os fornecidos pelo Google e seus parceiros.",
      "O uso de cookies e tecnologias de publicidade é descrito na Política de Cookies e na Política de Publicidade.",
    ],
  },
  {
    title: "14. Isenções e limitação de responsabilidade",
    items: [
      "A plataforma é fornecida no estado em que se encontra, sem garantia de disponibilidade ininterrupta ou ausência de erros.",
      "A Freelandoo não se responsabiliza por danos decorrentes de negociações, produtos ou serviços contratados entre usuários.",
      "A Freelandoo não responde por condutas, conteúdo ou dados de terceiros, nem por falhas de provedores externos.",
      "Na máxima extensão permitida pela lei, a responsabilidade da Freelandoo limita-se aos valores efetivamente pagos pelo usuário à plataforma nos 12 meses anteriores ao evento.",
    ],
  },
  {
    title: "15. Indenização",
    paragraphs: [
      "O usuário concorda em indenizar e isentar a Freelandoo de reclamações, perdas e despesas decorrentes do uso indevido da plataforma, da violação destes termos ou de direitos de terceiros.",
    ],
  },
  {
    title: "16. Alterações destes termos",
    items: [
      "A Freelandoo pode atualizar estes termos a qualquer momento.",
      "Alterações relevantes serão comunicadas na plataforma e, quando cabível, por e-mail.",
      "O uso continuado após a publicação das alterações implica concordância com a nova versão.",
    ],
  },
  {
    title: "17. Lei aplicável e foro",
    items: [
      "Estes termos são regidos pelas leis da República Federativa do Brasil.",
      "Fica eleito o foro do domicílio do consumidor para dirimir controvérsias, quando aplicável a legislação consumerista.",
    ],
  },
  {
    title: "18. Contato",
    paragraphs: [
      "Dúvidas sobre estes termos, ou contato com o Encarregado de Proteção de Dados, podem ser enviadas para freelandoogroup@gmail.com ou pelo WhatsApp (11) 96275-7599.",
    ],
  },
]

export default function TermsPage() {
  return (
    <LegalDocument
      namespace="Terms"
      title="Termos de Uso"
      updatedAt="Última atualização: 14 de junho de 2026"
      intro="Estes Termos de Uso regulam o acesso e a utilização da plataforma Freelandoo. Ao criar uma conta, navegar ou utilizar qualquer funcionalidade, você declara que leu, compreendeu e concorda integralmente com este documento. Caso não concorde, não utilize a plataforma."
      sections={sections}
      footerPrefix="Ao utilizar o Freelandoo, você concorda integralmente com estes Termos de Uso. Veja também nossa"
      links={[
        { href: "/privacy-policy", label: "Política de Privacidade" },
        { href: "/subscription-terms", label: "Termo de Ativação" },
      ]}
    />
  )
}
