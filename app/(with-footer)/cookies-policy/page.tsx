import type { Metadata } from "next"
import { LegalDocument } from "../_components/legal-document"

export const metadata: Metadata = {
  title: "Política de Cookies — Freelandoo",
  description: "Saiba como a Freelandoo utiliza cookies e tecnologias similares.",
}

const sections = [
  {
    title: "1. O que são cookies",
    items: [
      "Cookies são pequenos arquivos de texto enviados para seu navegador pelo site que armazenam informações sobre sua navegação e preferências.",
      "Eles podem ser temporários (expiram ao fechar o navegador) ou persistentes (permanecem após fechar o navegador).",
    ],
  },
  {
    title: "2. Tipos de cookies que usamos",
    items: [
      "Essenciais: necessários para funcionamento do site, login, cadastro, sessões e segurança. Não podem ser desativados.",
      "Analíticos: para medir desempenho, tráfego e comportamento de usuários (ex: Google Analytics, Hotjar).",
      "Funcionais: lembram preferências de idioma, filtros e configurações visuais.",
      "Marketing / Publicidade: rastreamento de cliques, campanhas e remarketing.",
    ],
  },
  {
    title: "3. Consentimento",
    items: [
      "Ao usar o Freelandoo, você concorda com o uso de cookies.",
      "Cookies essenciais não podem ser desativados, mas cookies de marketing e analíticos podem ser controlados via banner ou configurações de privacidade.",
    ],
  },
  {
    title: "4. Como gerenciar cookies",
    items: [
      "É possível configurar seu navegador para bloquear cookies ou ser avisado quando forem enviados.",
      "Limitar cookies pode impactar funcionalidades da plataforma, incluindo login social, personalização e analytics.",
    ],
  },
  {
    title: "5. Terceiros",
    paragraphs: [
      "Alguns cookies podem ser colocados por terceiros (Stripe, Google, Hotjar, Cloudflare) para análise, anúncios e processamento de pagamento. Esses cookies seguem as políticas de privacidade desses serviços.",
    ],
  },
  {
    title: "6. Alterações na política",
    paragraphs: ["Mudanças nesta política serão comunicadas na plataforma. Recomendamos revisar periodicamente para se manter informado."],
  },
  {
    title: "7. Contato",
    paragraphs: ["Caso tenha dúvidas sobre cookies ou privacidade, entre em contato: suporte@freelandoo.com"],
  },
]

export default function CookiesPolicyPage() {
  return (
    <LegalDocument
      namespace="CookiesPolicy"
      title="Política de Cookies"
      updatedAt="Última atualização: 28 de Abril de 2026"
      intro="A Freelandoo utiliza cookies e tecnologias similares para melhorar sua experiência na plataforma, analisar desempenho e fornecer funcionalidades essenciais. Esta política explica quais cookies usamos, por que usamos e como você pode controlar suas preferências."
      sections={sections}
      footerPrefix="Ao continuar navegando no Freelandoo, você concorda com esta Política de Cookies. Veja também nossa"
      links={[{ href: "/privacy-policy", label: "Política de Privacidade" }]}
    />
  )
}
