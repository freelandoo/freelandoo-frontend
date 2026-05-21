import type { Metadata } from "next"
import { LegalDocument } from "../_components/legal-document"

export const metadata: Metadata = {
  title: "Política de Cookies — Freelandoo",
  description: "Saiba como a Freelandoo utiliza cookies e tecnologias similares, inclusive para publicidade do Google.",
}

const sections = [
  {
    title: "1. O que são cookies",
    items: [
      "Cookies são pequenos arquivos de texto armazenados no seu navegador quando você visita um site.",
      "Eles podem ser de sessão, apagados ao fechar o navegador, ou persistentes, mantidos por um período definido.",
      "Tecnologias semelhantes, como pixels, armazenamento local e identificadores de dispositivo, também podem ser utilizadas.",
    ],
  },
  {
    title: "2. Tipos de cookies que usamos",
    items: [
      "Essenciais: necessários para login, sessão, segurança e funcionamento básico. Não podem ser desativados.",
      "Analíticos: medem tráfego, desempenho e comportamento de navegação, por exemplo via Google Analytics.",
      "Funcionais: lembram preferências como idioma, país, filtros e configurações de exibição.",
      "Publicidade: usados para exibir e medir anúncios, inclusive personalizados, por meio do Google AdSense e parceiros.",
    ],
  },
  {
    title: "3. Cookies de publicidade e Google AdSense",
    items: [
      "Utilizamos o Google AdSense para exibir anúncios na plataforma.",
      "O Google e outros fornecedores usam cookies para veicular anúncios com base nas visitas do usuário a este e a outros sites.",
      "Esses cookies permitem mensurar o desempenho das campanhas e limitar a repetição de anúncios.",
      "O usuário pode optar por não receber publicidade personalizada do Google em adssettings.google.com.",
    ],
  },
  {
    title: "4. Consentimento e controle",
    items: [
      "Ao acessar a plataforma, é exibido um banner para aceitar ou recusar cookies não essenciais.",
      "Enquanto não houver consentimento, os cookies de publicidade e analíticos permanecem desativados por padrão.",
      "O usuário pode alterar sua escolha a qualquer momento, limpando os cookies do navegador ou ajustando as preferências.",
      "Cookies essenciais não dependem de consentimento, pois são indispensáveis ao funcionamento da plataforma.",
    ],
  },
  {
    title: "5. Como gerenciar cookies no navegador",
    items: [
      "É possível configurar o navegador para bloquear cookies ou avisar quando forem enviados.",
      "Bloquear cookies pode afetar funcionalidades como login social, personalização e medição.",
      "Cada navegador oferece instruções próprias para gerenciar cookies em suas configurações.",
    ],
  },
  {
    title: "6. Cookies de terceiros",
    paragraphs: [
      "Alguns cookies são definidos por terceiros, como Google, Stripe e Cloudflare, para publicidade, análise, pagamento e segurança. Esses cookies seguem as políticas de privacidade dos respectivos provedores.",
    ],
  },
  {
    title: "7. Alterações nesta política",
    paragraphs: [
      "Esta política pode ser atualizada periodicamente. Recomendamos revisá-la com regularidade para se manter informado.",
    ],
  },
  {
    title: "8. Contato",
    paragraphs: ["Dúvidas sobre cookies ou privacidade podem ser enviadas para suporte@freelandoo.com."],
  },
]

export default function CookiesPolicyPage() {
  return (
    <LegalDocument
      namespace="CookiesPolicy"
      title="Política de Cookies"
      updatedAt="Última atualização: 21 de maio de 2026"
      intro="A Freelandoo utiliza cookies e tecnologias similares para melhorar sua experiência, analisar desempenho, fornecer funcionalidades essenciais e exibir anúncios. Esta política explica quais cookies usamos, por que usamos e como você pode controlar suas preferências."
      sections={sections}
      footerPrefix="Ao continuar navegando no Freelandoo, você concorda com esta Política de Cookies. Veja também nossa"
      links={[{ href: "/privacy-policy", label: "Política de Privacidade" }]}
    />
  )
}
