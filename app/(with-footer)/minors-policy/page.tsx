import type { Metadata } from "next"
import { LegalDocument } from "../_components/legal-document"

export const metadata: Metadata = {
  title: "Privacidade de Menores e Contas Supervisionadas — Freelandoo",
  description: "Como a Freelandoo protege menores de idade, trata seus dados e funciona o sistema de Contas Supervisionadas.",
}

const sections = [
  {
    title: "1. Objetivo",
    items: [
      "Este documento explica como a Freelandoo trata o acesso de menores de 18 anos e os dados pessoais de crianças e adolescentes.",
      "Reúne o aviso de privacidade para menores e as regras das Contas Supervisionadas.",
      "Observa a Lei Geral de Proteção de Dados (art. 14) e o Estatuto da Criança e do Adolescente.",
    ],
  },
  {
    title: "2. Idade mínima e Contas Supervisionadas",
    items: [
      "O uso geral da plataforma é destinado a pessoas com 18 anos ou mais.",
      "Menores de 18 anos só podem utilizar a plataforma por meio de uma Conta Supervisionada.",
      "A Conta Supervisionada é vinculada a um responsável legal adulto, com conta própria na plataforma.",
      "É proibido que menores criem contas comuns sem supervisão.",
    ],
  },
  {
    title: "3. Consentimento do responsável legal",
    items: [
      "A criação de uma Conta Supervisionada exige o consentimento específico e destacado de um responsável legal.",
      "O responsável declara ser pai, mãe ou representante legal do menor.",
      "O consentimento pode ser revisto e revogado a qualquer momento pelo responsável.",
      "O tratamento de dados do menor ocorre sempre no seu melhor interesse.",
    ],
  },
  {
    title: "4. O que a Conta Supervisionada permite e bloqueia",
    paragraphs: ["A Conta Supervisionada aplica restrições para proteger o menor:"],
    items: [
      "Funcionalidades como vitrine, ranking, mural e prestação de serviços ficam bloqueadas.",
      "Recursos sociais como feed, vídeos, cursos, chats e mensagens podem ser liberados ou bloqueados pelo responsável.",
      "Funcionalidades de venda e de transações financeiras não são disponibilizadas ao menor.",
      "As restrições podem ser ajustadas pelo responsável conforme a maturidade do menor.",
    ],
  },
  {
    title: "5. Acompanhamento pelo responsável",
    items: [
      "O responsável pode acompanhar a atividade da Conta Supervisionada.",
      "O responsável tem acesso, em modo de leitura, às conversas do menor na plataforma.",
      "O acompanhamento tem a finalidade exclusiva de proteção e segurança do menor.",
    ],
  },
  {
    title: "6. Dados pessoais de menores",
    items: [
      "Coletamos apenas os dados necessários para a finalidade da Conta Supervisionada.",
      "Os dados do menor não são utilizados para publicidade personalizada.",
      "Os dados do menor recebem proteção reforçada e acesso interno restrito.",
      "O responsável pode solicitar acesso, correção ou eliminação dos dados do menor.",
    ],
  },
  {
    title: "7. Conteúdo e segurança",
    items: [
      "Conteúdo que sexualize, explore ou coloque menores em risco é terminantemente proibido e removido.",
      "Situações de risco podem ser comunicadas às autoridades competentes.",
      "A moderação dedica atenção especial à proteção de menores.",
    ],
  },
  {
    title: "8. Responsabilidades do responsável legal",
    items: [
      "Supervisionar o uso da plataforma pelo menor.",
      "Definir as restrições adequadas à idade e à maturidade do menor.",
      "Manter as credenciais de acesso seguras.",
      "Comunicar à Freelandoo qualquer uso indevido ou situação de risco.",
    ],
  },
  {
    title: "9. Encerramento e revogação",
    paragraphs: [
      "O responsável pode encerrar a Conta Supervisionada ou revogar o consentimento a qualquer momento. Nesse caso, os dados do menor são tratados conforme a Política de Privacidade e a legislação aplicável.",
    ],
  },
  {
    title: "10. Contato",
    paragraphs: [
      "Dúvidas sobre Contas Supervisionadas e privacidade de menores podem ser enviadas para suporte@freelandoo.com ou ao Encarregado em [E-MAIL DO ENCARREGADO].",
    ],
  },
]

export default function MinorsPolicyPage() {
  return (
    <LegalDocument
      namespace="MinorsPolicy"
      title="Privacidade de Menores e Contas Supervisionadas"
      updatedAt="Última atualização: 21 de maio de 2026"
      intro="A Freelandoo dedica atenção especial à proteção de crianças e adolescentes. Este documento explica como funcionam as Contas Supervisionadas e como os dados pessoais de menores são tratados, com consentimento e acompanhamento de um responsável legal."
      sections={sections}
      footerPrefix="Este documento complementa a Política de Privacidade da Freelandoo. Veja também nossos"
      links={[
        { href: "/privacy-policy", label: "Política de Privacidade" },
        { href: "/terms", label: "Termos de Uso" },
      ]}
    />
  )
}
