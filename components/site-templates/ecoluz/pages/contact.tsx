// A PÁGINA DE CONTATO.
//
// ⚠️ O MAPA É UM `<iframe>` DERIVADO DO ENDEREÇO (ver `MAP_EMBED` em
// `content/business.ts`), e não uma coordenada digitada. Campo próprio seria a
// segunda verdade de sempre: o endereço mudaria num lugar e o alfinete
// continuaria no antigo. `www.google.com` já está no `frame-src` da CSP da
// plataforma, e o formato `?q=…&output=embed` não pede chave de API.
//
// ⚠️ OS TRÊS CARDS DE ATENDIMENTO SÃO NOMES FABRICADOS — ver a nota em
// `content/site.ts`. Eles vieram do site original e o Alex decidiu mantê-los
// depois de o problema ter sido apontado. A página lê a lista: trocar por um
// card único com o nome do dono é uma edição naquele arquivo, e nada aqui
// muda.

import {
  ADDRESS_LINE,
  BUSINESS,
  MAIL_HREF,
  MAP_EMBED,
  TEL_HREF,
  WA_DEFAULT,
  whatsappLink,
} from "../content/business";
import { TEAM } from "../content/site";
import { Icon } from "../icons";
import { type Ctx } from "../lib";
import { CtaBand, Section, SectionHead } from "../ui";

export default function ContatoPage({ links }: Ctx) {
  return (
    <>
      <section className="relative pb-14 pt-32 md:pb-16 md:pt-44">
        <div className="mx-auto w-full max-w-[78rem]" style={{ paddingInline: "var(--el-pad)" }}>
          <nav aria-label="Você está em" className="mb-8 text-[0.8125rem] text-[var(--el-cream-faint)]" data-reveal="fade">
            <a href={links.home} className="transition-colors hover:text-[var(--el-sun-hi)]">
              Início
            </a>
            <span aria-hidden="true" className="mx-2">/</span>
            <span className="text-[var(--el-cream-dim)]">Contato</span>
          </nav>

          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-16">
            <div>
              <p className="eyebrow text-[var(--el-sun)]" data-reveal="up">
                Atendimento
              </p>
              <h1
                className="display mt-5 text-[2.5rem] text-[var(--el-cream)] sm:text-[3.25rem] md:text-[4rem]"
                data-reveal="up"
                data-reveal-delay="60"
              >
                Comece pelo WhatsApp.
              </h1>
              <p
                className="mt-7 max-w-xl text-[1.0625rem] leading-relaxed text-[var(--el-cream-dim)]"
                data-reveal="up"
                data-reveal-delay="120"
              >
                A conversa já abre com uma mensagem pronta, para a equipe
                entender o seu caso mais rápido. Se puder, mande junto uma foto
                da sua conta de luz — é ela que responde quase tudo.
              </p>
              <div className="mt-9 flex flex-wrap gap-3" data-reveal="up" data-reveal-delay="180">
                <a href={whatsappLink(WA_DEFAULT)} target="_blank" rel="noopener" className="btn btn-solid">
                  Chamar no WhatsApp
                </a>
                <a href={TEL_HREF} className="btn btn-ghost">
                  Ligar
                </a>
              </div>
            </div>

            {/* Os canais, em lista — para quem prefere copiar em vez de clicar. */}
            <aside className="panel p-7 md:p-8" data-reveal="up" data-reveal-delay="240">
              <ContactRow icon="bolt" label="WhatsApp" value={BUSINESS.phoneDisplay} href={whatsappLink(WA_DEFAULT)} external />
              <ContactRow icon="file" label="E-mail" value={BUSINESS.email} href={MAIL_HREF} />
              <ContactRow icon="sun" label="Instagram" value="@ecoluzmaranhao" href={BUSINESS.instagram} external />
              <div className="mt-6 border-t border-[var(--el-line-soft)] pt-6">
                <p className="eyebrow text-[var(--el-cream-faint)]">A loja</p>
                <address className="mt-2.5 not-italic text-[0.9375rem] leading-relaxed text-[var(--el-cream-dim)]">
                  {ADDRESS_LINE}
                </address>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ── QUEM ATENDE ─────────────────────────────────────────────────── */}
      <Section tone="paper">
        <SectionHead
          tone="paper"
          eyebrow="Escolha por onde começar"
          title="Qual é o seu caso?"
          lead="Cada opção abre a conversa com um assunto diferente — é o que evita você ter que explicar tudo do zero."
        />

        <div className="mt-14 grid gap-px sm:grid-cols-2 lg:grid-cols-3" style={{ background: "var(--el-paper-line)" }}>
          {TEAM.map((p, i) => (
            <article
              key={p.name}
              className="flex flex-col bg-[var(--el-paper)] p-7"
              data-reveal="up"
              data-reveal-delay={i * 70}
            >
              <span className="eyebrow text-[var(--el-amber-ink)]">{p.role}</span>
              <h3 className="display mt-3 text-[1.375rem] text-[var(--el-paper-ink)]">{p.name}</h3>
              <p className="mt-3 flex-1 text-[0.9375rem] leading-relaxed text-[var(--el-paper-dim)]">
                {p.text}
              </p>
              <a
                href={whatsappLink(p.wa)}
                target="_blank"
                rel="noopener"
                className="btn btn-paper mt-6"
              >
                Mandar mensagem
              </a>
            </article>
          ))}
        </div>
      </Section>

      {/* ── O MAPA ──────────────────────────────────────────────────────── */}
      <Section tone="deep">
        <SectionHead align="stack" eyebrow="Como chegar" title="Av. Mário Andreazza, no Turu." />
        <div
          className="mt-10 border border-[var(--el-line-soft)]"
          data-reveal="scale"
        >
          <iframe
            src={MAP_EMBED}
            title={`Mapa: ${BUSINESS.name}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="block h-[22rem] w-full md:h-[26rem]"
          />
        </div>
      </Section>

      <CtaBand
        title="Mande a sua conta de luz."
        text="É o jeito mais rápido de sair da estimativa e chegar num número que vale para a sua casa ou para o seu negócio."
        href={whatsappLink(WA_DEFAULT)}
      />
    </>
  );
}

function ContactRow({
  icon,
  label,
  value,
  href,
  external = false,
}: {
  icon: "bolt" | "file" | "sun";
  label: string;
  value: string;
  href: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener" } : {})}
      className="group flex items-center gap-4 border-b border-[var(--el-line-soft)] py-4 first:pt-0 last:border-0"
    >
      <span className="text-[var(--el-sun)]">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="eyebrow block text-[var(--el-cream-faint)]">{label}</span>
        <span className="mt-1 block truncate text-[0.9375rem] text-[var(--el-cream)] transition-colors group-hover:text-[var(--el-sun-hi)]">
          {value}
        </span>
      </span>
    </a>
  );
}
