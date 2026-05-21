import type { Metadata } from "next"
import { LegalDocument } from "../_components/legal-document"

export const metadata: Metadata = {
  title: "Política de Privacidade — Freelandoo",
  description: "Entenda como a Freelandoo coleta, usa, compartilha e protege seus dados pessoais, conforme a LGPD.",
}

const sections = [
  {
    title: "1. Controlador dos dados e Encarregado",
    items: [
      "O controlador dos dados pessoais tratados na plataforma é [RAZÃO SOCIAL], CNPJ [CNPJ], com sede em [ENDEREÇO].",
      "O Encarregado pelo Tratamento de Dados Pessoais (DPO) pode ser contatado em [E-MAIL DO ENCARREGADO].",
      "Esta política observa a Lei Geral de Proteção de Dados (Lei nº 13.709/2018) e o Marco Civil da Internet.",
    ],
  },
  {
    title: "2. Dados que coletamos",
    items: [
      "Dados de cadastro: nome, e-mail, senha, data de nascimento e, quando fornecidos, CPF e telefone.",
      "Dados de perfil: profissão, experiência, portfólio, fotos, vídeos, localização e descrição.",
      "Conteúdo publicado: posts, stories, vídeos, comentários e arquivos enviados.",
      "Comunicações: mensagens privadas, áudios e interações em salas de chat.",
      "Dados de transações: histórico de ativações, compras na Loja, cursos, Poléns e dados parciais de pagamento.",
      "Dados de uso e dispositivo: endereço IP, navegador, sistema, páginas visitadas, cliques e preferências.",
      "Dados de localização: cidade e região informadas ou inferidas, usadas na vitrine e na busca.",
      "Dados de login social: nome, e-mail e foto, quando o acesso é feito via Google ou Apple.",
      "Dados de contas supervisionadas: informações de menores cadastrados sob responsabilidade de um adulto.",
    ],
  },
  {
    title: "3. Como usamos os dados (finalidades e bases legais)",
    paragraphs: ["Tratamos dados pessoais com fundamento nas seguintes bases legais da LGPD:"],
    items: [
      "Execução de contrato: criar e manter contas, exibir perfis, processar pagamentos e viabilizar transações.",
      "Consentimento: envio de comunicações de marketing, cookies não essenciais e publicidade personalizada.",
      "Legítimo interesse: segurança, prevenção a fraudes, melhoria da plataforma e personalização de conteúdo.",
      "Cumprimento de obrigação legal ou regulatória: guarda de registros e atendimento a autoridades.",
      "Exercício regular de direitos em processo judicial, administrativo ou arbitral, quando aplicável.",
    ],
  },
  {
    title: "4. Compartilhamento de dados",
    paragraphs: ["Compartilhamos dados apenas quando necessário, com as seguintes categorias de terceiros:"],
    items: [
      "Processamento de pagamentos: Stripe.",
      "Logística e envio de produtos da Loja: Melhor Envio e transportadoras.",
      "Armazenamento de arquivos: Cloudflare R2.",
      "Hospedagem e infraestrutura: Vercel e Railway.",
      "Análise de audiência e publicidade: Google (Analytics e AdSense) e parceiros de medição.",
      "Autoridades públicas e judiciais, mediante requisição legal.",
      "Não vendemos dados pessoais a terceiros.",
    ],
  },
  {
    title: "5. Publicidade e Google AdSense",
    items: [
      "A plataforma exibe anúncios fornecidos pelo Google AdSense e por parceiros de publicidade.",
      "Fornecedores de anúncios terceiros, incluindo o Google, utilizam cookies para exibir anúncios com base em visitas anteriores do usuário a este e a outros sites.",
      "Esses cookies permitem mensurar o desempenho de campanhas e limitar a repetição de anúncios.",
      "O usuário pode desativar a publicidade personalizada do Google em adssettings.google.com e gerenciar cookies de parceiros em www.aboutads.info.",
      "Anúncios só são personalizados após consentimento; sem consentimento, exibimos anúncios não personalizados sempre que possível.",
    ],
  },
  {
    title: "6. Cookies",
    paragraphs: [
      "Utilizamos cookies essenciais, analíticos, funcionais e de publicidade. O detalhamento e o controle de preferências estão na Política de Cookies.",
    ],
  },
  {
    title: "7. Transferência internacional de dados",
    paragraphs: [
      "Alguns parceiros, como Stripe, Google, Cloudflare e Vercel, processam dados fora do Brasil. Nesses casos, adotamos salvaguardas para garantir nível de proteção compatível com a LGPD.",
    ],
  },
  {
    title: "8. Armazenamento e retenção",
    items: [
      "Os dados são mantidos pelo tempo necessário às finalidades descritas e ao cumprimento de obrigações legais.",
      "Registros de acesso são guardados pelo prazo mínimo previsto no Marco Civil da Internet.",
      "Após o encerramento da conta, os dados podem ser anonimizados ou eliminados, salvo obrigação legal de retenção.",
    ],
  },
  {
    title: "9. Segurança",
    items: [
      "Adotamos medidas técnicas e administrativas para proteger os dados, incluindo criptografia em trânsito (HTTPS).",
      "O acesso interno aos dados é restrito a pessoal autorizado.",
      "Nenhum sistema é completamente imune a incidentes; em caso de incidente relevante, comunicaremos os titulares e a ANPD conforme a lei.",
    ],
  },
  {
    title: "10. Direitos do titular",
    paragraphs: ["Nos termos da LGPD, o titular pode, a qualquer momento:"],
    items: [
      "Confirmar a existência de tratamento e acessar seus dados.",
      "Corrigir dados incompletos, inexatos ou desatualizados.",
      "Solicitar anonimização, bloqueio ou eliminação de dados desnecessários.",
      "Solicitar a portabilidade dos dados.",
      "Revogar o consentimento e se opor a tratamentos baseados em legítimo interesse.",
      "Exercer esses direitos por meio do contato com o Encarregado em [E-MAIL DO ENCARREGADO].",
    ],
  },
  {
    title: "11. Dados de crianças e adolescentes",
    items: [
      "Dados de menores só são tratados no contexto de Contas Supervisionadas, com consentimento de um responsável legal.",
      "O tratamento ocorre no melhor interesse do menor, conforme o art. 14 da LGPD e o Estatuto da Criança e do Adolescente.",
      "Mais detalhes constam no Aviso de Privacidade para Menores e Contas Supervisionadas.",
    ],
  },
  {
    title: "12. Alterações nesta política",
    paragraphs: [
      "Esta política pode ser atualizada. Mudanças relevantes serão comunicadas na plataforma e, quando cabível, por e-mail. O uso continuado após a atualização implica concordância.",
    ],
  },
  {
    title: "13. Contato",
    paragraphs: [
      "Dúvidas sobre privacidade podem ser enviadas para suporte@freelandoo.com ou ao Encarregado em [E-MAIL DO ENCARREGADO]. O titular também pode peticionar à Autoridade Nacional de Proteção de Dados (ANPD).",
    ],
  },
]

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument
      namespace="PrivacyPolicy"
      title="Política de Privacidade"
      updatedAt="Última atualização: 21 de maio de 2026"
      intro="A Freelandoo valoriza a sua privacidade e se compromete a proteger os dados pessoais dos usuários da plataforma. Esta política explica, de forma transparente, como coletamos, usamos, armazenamos e compartilhamos as informações que você fornece, em conformidade com a Lei Geral de Proteção de Dados."
      sections={sections}
      footerPrefix="Ao usar o Freelandoo, você concorda com esta Política de Privacidade. Veja também nossos"
      links={[
        { href: "/terms", label: "Termos de Uso" },
        { href: "/cookies-policy", label: "Política de Cookies" },
      ]}
    />
  )
}
