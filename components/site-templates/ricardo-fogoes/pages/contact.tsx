import type { Ctx } from "../lib";
import { PAGE, pageHref } from "../lib";

import {
  Actions,
  Breadcrumb,
  Head,
  ScopeList,
  Section,
  Shell,
} from "../ui";
import { Reveal } from "../motion";
import { BOOKING_URL, BUSINESS, TEL_HREF } from "../content/business";
import { CITIES } from "../content/cities";
import { BreadcrumbLd } from "../schema";





export default function ContatoPage({ links }: Ctx) {
  const TRAIL = [
    { name: "Início", path: links.home },
    { name: "Contato", path: pageHref(links, PAGE.contato) },
  ];
  return (
    <>
      <BreadcrumbLd trail={TRAIL} />

      <Section className="pt-32 md:pt-40">
        <Shell>
          <Reveal>
            <Breadcrumb trail={TRAIL} />
            <div className="mt-8">
              <Head
                level={1}
                title="Contato"
                lead="O caminho mais rápido é o WhatsApp, porque dá para mandar foto do fogão junto — e foto resolve metade do diagnóstico antes de alguém sair de casa."
              />
            </div>
            <Actions
              waMessage="Olá, Ricardo! Vi o site e preciso de atendimento no meu fogão."
              className="mt-9 pl-[calc(var(--datum)+1rem)]"
            />
          </Reveal>

          <div className="mt-16 grid gap-14 lg:grid-cols-2 lg:gap-20">
            <Reveal>
              <h2 className="d-md text-[var(--rf-chalk)]">Dados</h2>
              <dl className="mt-6 border-t border-[var(--rf-line)]">
                <Row label="Telefone e WhatsApp">
                  <a
                    href={TEL_HREF}
                    className="text-[var(--rf-chalk)] transition-colors hover:text-[var(--rf-flame-hi)]"
                  >
                    {BUSINESS.phoneDisplay}
                  </a>
                </Row>
                <Row label="Endereço">
                  {BUSINESS.street}
                  <br />
                  {BUSINESS.city}/{BUSINESS.state} · CEP {BUSINESS.postalCode}
                </Row>
                <Row label="Horário">
                  {BUSINESS.hoursHuman}
                  <br />
                  <span className="text-[var(--rf-chalk-dim)]">{BUSINESS.closedHuman}</span>
                </Row>
                <Row label="Visita">{BUSINESS.scheduling}</Row>
                <Row label="Pagamento">{BUSINESS.payments.join(" · ")}</Row>
                <Row label="No local">{BUSINESS.amenities.join(" · ")}</Row>
                <Row label="Cidades atendidas">
                  {CITIES.map((c) => c.name).join(" · ")}
                </Row>
              </dl>

              {BOOKING_URL ? (
                <div className="mt-10 border border-[var(--rf-line)] p-6">
                  <h3 className="d-sm text-[var(--rf-chalk)]">Agendar pela agenda online</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--rf-chalk-dim)]">
                    Escolha o dia e o horário direto na agenda, sem precisar
                    combinar por mensagem.
                  </p>
                  <a href={BOOKING_URL} className="btn btn-primary mt-5">
                    Abrir a agenda
                  </a>
                </div>
              ) : null}
            </Reveal>

            <Reveal delay={0.08}>
              <h2 className="d-md text-[var(--rf-chalk)]">O que ter em mãos</h2>
              <p className="mt-4 max-w-[58ch] leading-relaxed text-[var(--rf-chalk-dim)]">
                Nada disso é obrigatório, mas cada item encurta a conversa e
                aumenta a chance de o defeito já ser identificado antes da
                visita.
              </p>
              <ScopeList
                items={[
                  "Marca e, se souber, o modelo do fogão",
                  "Quantas bocas, e se o forno também está com problema",
                  "O que acontece: não acende, apaga sozinho, chama amarela",
                  "Há quanto tempo começou",
                  "Uma foto da chama acesa, se for possível",
                  "Se é fogão de casa ou de estabelecimento",
                ]}
              />

              <div
                className="mt-10 border p-6"
                style={{
                  borderColor: "var(--rf-ember-deep)",
                  background: "rgb(184 67 11 / 0.07)",
                }}
              >
                <span
                  className="note"
                  style={{ color: "var(--rf-ember)" }}
                >
                  Cheiro de gás
                </span>
                <p className="mt-3 leading-relaxed text-[var(--rf-chalk-dim)]">
                  Feche o registro, abra portas e janelas e{" "}
                  <strong className="text-[var(--rf-chalk)]">
                    não acione interruptor nem acenda nada
                  </strong>{" "}
                  — faísca é o que falta para o gás pegar. Com o ambiente
                  ventilado e o registro fechado, aí sim ligue, de preferência
                  de fora do cômodo.
                </p>
              </div>
            </Reveal>
          </div>
        </Shell>
      </Section>
    </>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,10rem)_1fr] gap-4 border-b border-[var(--rf-line)] py-4">
      <dt className="note pt-1">{label}</dt>
      <dd className="text-[var(--rf-chalk)]">{children}</dd>
    </div>
  );
}
