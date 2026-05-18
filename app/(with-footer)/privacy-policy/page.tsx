import type { Metadata } from "next"
import { LegalDocument } from "../_components/legal-document"

export const metadata: Metadata = {
  title: "Política de Privacidade — Freelandoo",
  description: "Entenda como a Freelandoo coleta, usa e protege seus dados pessoais.",
}

const sections = [
  {
    title: "1. Dados que coletamos",
    items: [
      "Informações de cadastro: nome, e-mail, CPF (opcional), senha.",
      "Informações de perfil: profissão, experiência, portfólio, localização.",
      "Dados de uso da plataforma: histórico de login, interações e preferências.",
      "Dados de pagamento: informações de cartão ou Stripe, histórico de ativações.",
      "Dados coletados via login social (Google/Apple): nome, e-mail e foto de perfil.",
    ],
  },
  {
    title: "2. Uso dos dados",
    items: [
      "Gerenciar contas e perfis de usuários.",
      "Exibir freelancers e oportunidades de forma personalizada.",
      "Processar pagamentos e cupons.",
      "Garantir a segurança da plataforma.",
      "Cumprir obrigações legais e regulatórias.",
    ],
  },
  {
    title: "3. Compartilhamento de dados",
    paragraphs: ["Compartilhamos dados apenas com parceiros necessários para o funcionamento da plataforma:"],
    items: ["Serviços de pagamento: Stripe.", "Armazenamento de arquivos: Cloudflare R2.", "Analytics e monitoramento: Google Analytics, Hotjar."],
  },
  {
    title: "4. Armazenamento e segurança",
    items: [
      "Os dados são armazenados em servidores seguros.",
      "Apenas pessoal autorizado tem acesso.",
      "Utilizamos criptografia em trânsito (HTTPS) e em repouso quando aplicável.",
    ],
  },
  {
    title: "5. Direitos do usuário",
    paragraphs: ["Você tem direito a:", "Contato: suporte@freelandoo.com"],
    items: [
      "Acessar, corrigir ou excluir seus dados.",
      "Solicitar histórico de dados.",
      "Revogar consentimento para processamentos não essenciais.",
    ],
  },
  {
    title: "6. Uso de cookies",
    paragraphs: [
      "Utilizamos cookies para autenticação, experiência de uso e análise de desempenho. O usuário pode aceitar ou recusar cookies não essenciais. Consulte nossa Política de Cookies para mais detalhes.",
    ],
  },
  {
    title: "7. Alterações nesta política",
    paragraphs: [
      "Atualizações serão comunicadas no site e por e-mail quando relevante. Ao continuar usando o Freelandoo após alterações, você concorda com a versão atualizada.",
    ],
  },
]

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument
      namespace="PrivacyPolicy"
      title="Política de Privacidade"
      updatedAt="Última atualização: 28 de Abril de 2026"
      intro="A Freelandoo valoriza a sua privacidade e se compromete a proteger os dados dos usuários da plataforma. Esta política explica como coletamos, usamos, armazenamos e compartilhamos as informações que você fornece."
      sections={sections}
      footerPrefix="Ao usar o Freelandoo, você concorda com esta Política de Privacidade. Veja também nossos"
      links={[
        { href: "/terms", label: "Termos de Uso" },
        { href: "/cookies-policy", label: "Política de Cookies" },
      ]}
    />
  )
}
