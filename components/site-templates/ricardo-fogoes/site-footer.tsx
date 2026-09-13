/**
 * O CARIMBO.
 *
 * Toda prancha técnica termina num carimbo: a grade de campos no canto que
 * diz de quem é o desenho, de que trata, em que escala e quando foi revisto.
 *
 * Aqui ele é o rodapé — e isso não é metáfora forçada, é o lugar natural
 * do NAP. Nome, endereço e telefone precisam aparecer IGUAIS em todo lugar
 * (site, Google, redes); consistência de citação é sinal de prominência em
 * busca local. Uma grade de campos rotulados é a forma que torna a
 * divergência óbvia à vista, em vez de escondê-la num parágrafo.
 *
 * Componente de servidor: NAP no HTML, sem depender de JS.
 */

import Link from "next/link";
import BrandMark from "./draw/brand-mark";
import { BUSINESS, navFor, TEL_HREF } from "./content/business";
import type { TemplateLinks } from "@/types/site-template";
import { PAGE, pageHref } from "./lib";
import { CITIES } from "./content/cities";
import { SERVICES } from "./content/services";

function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={`border-b border-r border-[var(--rf-line)] px-4 py-3 ${wide ? "sm:col-span-2" : ""}`}
    >
      <span className="note block">{label}</span>
      <span className="mt-1 block text-sm leading-snug text-[var(--rf-chalk)]">
        {children}
      </span>
    </div>
  );
}

export default function SiteFooter({ links }: { links: TemplateLinks }) {
  const NAV = navFor(links);
  return (
    <footer className="mt-28 border-t border-[var(--rf-line)]">
      <div className="mx-auto max-w-[1400px] px-[var(--sheet-pad)] py-14">
        {/* índice: é por link que o buscador descobre página interna */}
        <nav className="grid gap-10 border-b border-[var(--rf-line)] pb-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h2 className="d-sm text-[var(--rf-chalk)]">Serviços</h2>
            <ul className="mt-4 space-y-2">
              {SERVICES.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={pageHref(links, s.slug)}
                    className="text-sm text-[var(--rf-chalk-dim)] transition-colors hover:text-[var(--rf-chalk)]"
                  >
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="d-sm text-[var(--rf-chalk)]">Onde atendemos</h2>
            <ul className="mt-4 space-y-2">
              {CITIES.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={pageHref(links, c.slug)}
                    className="text-sm text-[var(--rf-chalk-dim)] transition-colors hover:text-[var(--rf-chalk)]"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={pageHref(links, PAGE.areas)}
                  className="text-sm text-[var(--rf-chalk-dim)] transition-colors hover:text-[var(--rf-chalk)]"
                >
                  Cobertura completa
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="d-sm text-[var(--rf-chalk)]">Site</h2>
            <ul className="mt-4 space-y-2">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    className="text-sm text-[var(--rf-chalk-dim)] transition-colors hover:text-[var(--rf-chalk)]"
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col items-start gap-4">
            <BrandMark size={40} />
            <p className="max-w-[34ch] text-sm leading-relaxed text-[var(--rf-chalk-dim)]">
              A chama certa é azul. Quando ela abre amarela, alguma coisa no
              caminho do gás precisa de atenção.
            </p>
          </div>
        </nav>

        {/* ── o carimbo ─────────────────────────────────────────────────── */}
        <section
          aria-label="Dados da empresa"
          className="mt-12 border-l border-t border-[var(--rf-line)]"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4">
            <Field label="Empresa" wide>
              {BUSINESS.name}
            </Field>
            <Field label="Atividade" wide>
              {BUSINESS.tagline} · {BUSINESS.subTagline}
            </Field>

            <Field label="Endereço" wide>
              {BUSINESS.street}
              <br />
              {BUSINESS.city}/{BUSINESS.state} · CEP {BUSINESS.postalCode}
            </Field>
            <Field label="Telefone">
              <a
                href={TEL_HREF}
                className="transition-colors hover:text-[var(--rf-flame-hi)]"
              >
                {BUSINESS.phoneDisplay}
              </a>
            </Field>
            <Field label="Atendimento">
              {BUSINESS.hoursShort}
              <br />
              <span className="text-[var(--rf-chalk-dim)]">{BUSINESS.scheduling}</span>
            </Field>

            <Field label="Área atendida" wide>
              {CITIES.map((c) => c.name).join(" · ")}
            </Field>
            <Field label="Pagamento">
              {BUSINESS.payments.join(" · ")}
            </Field>
            <Field label="No local">
              {BUSINESS.amenities.join(" · ")}
            </Field>
          </div>
        </section>

        <p className="mt-8 text-xs text-[var(--rf-chalk-faint)]">
          © {new Date().getFullYear()} {BUSINESS.name}. {BUSINESS.closedHuman}.
        </p>
      </div>
    </footer>
  );
}
