import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Política de Privacidade — Freelandoo",
  description: "Entenda como a Freelandoo coleta, usa e protege seus dados pessoais.",
}

export default function PrivacyPolicyPage() {
  return (
    <main className="flex-1 bg-background">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-2">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground mb-10">Última atualização: 28 de Abril de 2026</p>

        <p className="text-muted-foreground mb-8">
          A Freelandoo valoriza a sua privacidade e se compromete a proteger os dados dos usuários da
          plataforma. Esta política explica como coletamos, usamos, armazenamos e compartilhamos as
          informações que você fornece.
        </p>

        <Section title="1. Dados que coletamos">
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Informações de cadastro: nome, e-mail, CPF (opcional), senha.</li>
            <li>Informações de perfil: profissão, experiência, portfólio, localização.</li>
            <li>Dados de uso da plataforma: histórico de login, interações e preferências.</li>
            <li>Dados de pagamento: informações de cartão ou Stripe, histórico de assinaturas.</li>
            <li>Dados coletados via login social (Google/Apple): nome, e-mail e foto de perfil.</li>
          </ul>
        </Section>

        <Section title="2. Uso dos dados">
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Gerenciar contas e perfis de usuários.</li>
            <li>Exibir freelancers e oportunidades de forma personalizada.</li>
            <li>Processar pagamentos e cupons.</li>
            <li>Garantir a segurança da plataforma.</li>
            <li>Cumprir obrigações legais e regulatórias.</li>
          </ul>
        </Section>

        <Section title="3. Compartilhamento de dados">
          <p className="text-muted-foreground mb-2">Compartilhamos dados apenas com parceiros necessários para o funcionamento da plataforma:</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Serviços de pagamento: Stripe.</li>
            <li>Armazenamento de arquivos: Cloudflare R2.</li>
            <li>Analytics e monitoramento: Google Analytics, Hotjar.</li>
          </ul>
        </Section>

        <Section title="4. Armazenamento e segurança">
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Os dados são armazenados em servidores seguros.</li>
            <li>Apenas pessoal autorizado tem acesso.</li>
            <li>Utilizamos criptografia em trânsito (HTTPS) e em repouso quando aplicável.</li>
          </ul>
        </Section>

        <Section title="5. Direitos do usuário">
          <p className="text-muted-foreground mb-2">Você tem direito a:</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Acessar, corrigir ou excluir seus dados.</li>
            <li>Solicitar histórico de dados.</li>
            <li>Revogar consentimento para processamentos não essenciais.</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            Contato:{" "}
            <a href="mailto:suporte@freelandoo.com" className="text-primary hover:underline">
              suporte@freelandoo.com
            </a>
          </p>
        </Section>

        <Section title="6. Uso de cookies">
          <p className="text-muted-foreground">
            Utilizamos cookies para autenticação, experiência de uso e análise de desempenho. O usuário
            pode aceitar ou recusar cookies não essenciais. Consulte nossa{" "}
            <Link href="/cookies-policy" className="text-primary hover:underline">
              Política de Cookies
            </Link>{" "}
            para mais detalhes.
          </p>
        </Section>

        <Section title="7. Alterações nesta política">
          <p className="text-muted-foreground">
            Atualizações serão comunicadas no site e por e-mail quando relevante. Ao continuar usando o
            Freelandoo após alterações, você concorda com a versão atualizada.
          </p>
        </Section>

        <div className="mt-10 pt-8 border-t border-border text-sm text-muted-foreground">
          Ao usar o Freelandoo, você concorda com esta Política de Privacidade. Veja também nossos{" "}
          <Link href="/terms" className="text-primary hover:underline">Termos de Uso</Link> e{" "}
          <Link href="/cookies-policy" className="text-primary hover:underline">Política de Cookies</Link>.
        </div>
      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-foreground mb-3">{title}</h2>
      {children}
    </section>
  )
}
