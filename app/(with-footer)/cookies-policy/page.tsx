import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Política de Cookies — Freelandoo",
  description: "Saiba como a Freelandoo utiliza cookies e tecnologias similares.",
}

export default function CookiesPolicyPage() {
  return (
    <main className="flex-1 bg-background">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-2">Política de Cookies</h1>
        <p className="text-sm text-muted-foreground mb-10">Última atualização: 28 de Abril de 2026</p>

        <p className="text-muted-foreground mb-8">
          A Freelandoo utiliza cookies e tecnologias similares para melhorar sua experiência na
          plataforma, analisar desempenho e fornecer funcionalidades essenciais. Esta política explica
          quais cookies usamos, por que usamos e como você pode controlar suas preferências.
        </p>

        <Section title="1. O que são cookies">
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Cookies são pequenos arquivos de texto enviados para seu navegador pelo site que armazenam informações sobre sua navegação e preferências.</li>
            <li>Eles podem ser temporários (expiram ao fechar o navegador) ou persistentes (permanecem após fechar o navegador).</li>
          </ul>
        </Section>

        <Section title="2. Tipos de cookies que usamos">
          <div className="space-y-3">
            <div className="rounded-lg border border-border p-4">
              <p className="font-medium text-foreground mb-1">Essenciais</p>
              <p className="text-sm text-muted-foreground">Necessários para funcionamento do site, login, cadastro, sessões e segurança. Não podem ser desativados.</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="font-medium text-foreground mb-1">Analíticos</p>
              <p className="text-sm text-muted-foreground">Para medir desempenho, tráfego e comportamento de usuários (ex: Google Analytics, Hotjar).</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="font-medium text-foreground mb-1">Funcionais</p>
              <p className="text-sm text-muted-foreground">Lembram preferências de idioma, filtros e configurações visuais.</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="font-medium text-foreground mb-1">Marketing / Publicidade</p>
              <p className="text-sm text-muted-foreground">Rastreamento de cliques, campanhas e remarketing.</p>
            </div>
          </div>
        </Section>

        <Section title="3. Consentimento">
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Ao usar o Freelandoo, você concorda com o uso de cookies.</li>
            <li>Cookies essenciais não podem ser desativados, mas cookies de marketing e analíticos podem ser controlados via banner ou configurações de privacidade.</li>
          </ul>
        </Section>

        <Section title="4. Como gerenciar cookies">
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>É possível configurar seu navegador para bloquear cookies ou ser avisado quando forem enviados.</li>
            <li>Limitar cookies pode impactar funcionalidades da plataforma, incluindo login social, personalização e analytics.</li>
          </ul>
        </Section>

        <Section title="5. Terceiros">
          <p className="text-muted-foreground">
            Alguns cookies podem ser colocados por terceiros (Stripe, Google, Hotjar, Cloudflare) para
            análise, anúncios e processamento de pagamento. Esses cookies seguem as políticas de
            privacidade desses serviços.
          </p>
        </Section>

        <Section title="6. Alterações na política">
          <p className="text-muted-foreground">
            Mudanças nesta política serão comunicadas na plataforma. Recomendamos revisar
            periodicamente para se manter informado.
          </p>
        </Section>

        <Section title="7. Contato">
          <p className="text-muted-foreground">
            Caso tenha dúvidas sobre cookies ou privacidade, entre em contato:{" "}
            <a href="mailto:suporte@freelandoo.com" className="text-primary hover:underline">
              suporte@freelandoo.com
            </a>
          </p>
        </Section>

        <div className="mt-10 pt-8 border-t border-border text-sm text-muted-foreground">
          Ao continuar navegando no Freelandoo, você concorda com esta Política de Cookies. Veja também nossa{" "}
          <Link href="/privacy-policy" className="text-primary hover:underline">Política de Privacidade</Link>.
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
