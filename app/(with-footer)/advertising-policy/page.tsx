import type { Metadata } from "next"
import { LegalDocument } from "../_components/legal-document"

export const metadata: Metadata = {
  title: "Política de Publicidade — Freelandoo",
  description: "Como a Freelandoo exibe anúncios, usa o Google AdSense e respeita o consentimento do usuário.",
}

const sections = [
  {
    title: "1. Sobre esta política",
    items: [
      "Esta política explica como a Freelandoo exibe publicidade na plataforma.",
      "Ela complementa a Política de Privacidade e a Política de Cookies.",
      "A receita de publicidade ajuda a manter e a evoluir a plataforma.",
    ],
  },
  {
    title: "2. Anúncios na plataforma",
    items: [
      "A Freelandoo pode exibir anúncios próprios e de terceiros.",
      "Os anúncios são identificáveis e separados do conteúdo editorial e do conteúdo dos usuários.",
      "A exibição de anúncios pode variar conforme a página, o dispositivo e as preferências do usuário.",
    ],
  },
  {
    title: "3. Google AdSense e parceiros",
    items: [
      "Utilizamos o Google AdSense para exibir anúncios de terceiros.",
      "O Google e seus parceiros podem usar cookies e identificadores para selecionar e medir anúncios.",
      "O tratamento de dados por esses parceiros segue as políticas de privacidade do Google e dos respectivos fornecedores.",
    ],
  },
  {
    title: "4. Onde os anúncios aparecem",
    items: [
      "Os anúncios são exibidos principalmente em páginas de conteúdo e institucionais.",
      "Procuramos não exibir anúncios de forma a prejudicar a navegação ou as funcionalidades essenciais.",
      "Áreas sensíveis, como fluxos de pagamento e telas administrativas, não exibem anúncios de terceiros.",
    ],
  },
  {
    title: "5. Cookies e consentimento",
    items: [
      "Os anúncios podem utilizar cookies, conforme descrito na Política de Cookies.",
      "Enquanto não houver consentimento, a publicidade personalizada permanece desativada.",
      "Sem consentimento, exibimos anúncios não personalizados sempre que possível.",
    ],
  },
  {
    title: "6. Publicidade personalizada e seu controle",
    items: [
      "O usuário pode aceitar ou recusar cookies de publicidade no banner de consentimento.",
      "É possível desativar a personalização de anúncios do Google em adssettings.google.com.",
      "É possível gerenciar preferências de anúncios de parceiros em www.aboutads.info e youronlinechoices.com.",
    ],
  },
  {
    title: "7. Compromissos da Freelandoo",
    items: [
      "Não exibimos publicidade personalizada baseada em dados de Contas Supervisionadas de menores.",
      "Não utilizamos categorias sensíveis de forma indevida para segmentar anúncios.",
      "Não permitimos, conscientemente, anúncios enganosos ou ilegais.",
    ],
  },
  {
    title: "8. Conteúdo dos anúncios",
    paragraphs: [
      "Os anúncios de terceiros são selecionados por redes de publicidade, e o seu conteúdo não reflete necessariamente a opinião da Freelandoo. Anúncios impróprios podem ser reportados para freelandoogroup@gmail.com ou pelo WhatsApp (11) 96275-7599.",
    ],
  },
  {
    title: "9. Contato",
    paragraphs: ["Dúvidas sobre publicidade podem ser enviadas para freelandoogroup@gmail.com ou pelo WhatsApp (11) 96275-7599."],
  },
]

export default function AdvertisingPolicyPage() {
  return (
    <LegalDocument
      namespace="AdvertisingPolicy"
      title="Política de Publicidade"
      updatedAt="Última atualização: 21 de maio de 2026"
      intro="A Freelandoo exibe anúncios para manter a plataforma acessível e em constante evolução. Esta política explica como a publicidade funciona, como utilizamos o Google AdSense e como você pode controlar a personalização dos anúncios."
      sections={sections}
      footerPrefix="Esta política complementa a Política de Cookies e a Política de Privacidade da Freelandoo. Veja também nossa"
      links={[
        { href: "/cookies-policy", label: "Política de Cookies" },
        { href: "/privacy-policy", label: "Política de Privacidade" },
      ]}
    />
  )
}
