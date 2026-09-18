// AS SEÇÕES QUE SÓ A HOME TEM.
//
// `ui.tsx` guarda o que as catorze páginas dividem (faixa, cabeçalho, cartão,
// FAQ, chamada). Estas oito existem numa página só e vieram do brief de 14/09
// — juntá-las lá misturaria o vocabulário do site com a composição de uma
// página, e é assim que um arquivo de peças compartilhadas vira um depósito.
//
// ⚠️ TODA SEÇÃO QUE DEPENDE DE DADO DO CLIENTE DEVOLVE `null` QUANDO NÃO TEM
// DADO. Não é defensividade: é a regra que impede a única falha irreversível
// deste trabalho, que é publicar número, foto ou depoimento inventado com o
// nome da EcoLuz em cima. O que falta some da página; o que é inventado vai ao
// ar. Ver `content/company.ts`.

import Image from "next/image";

import { AREAS } from "./content/areas";
import { WA_DEFAULT, whatsappLink } from "./content/business";
import {
  ABOUT_HOME,
  PROJECTS,
  REVIEWS,
  REVIEWS_URL,
  STATS,
  UNITS,
  UNITS_NOTE,
} from "./content/company";
import { FINANCING, LOADS, LOADS_NOTE, SEGMENTS } from "./content/offer";
import { Icon } from "./icons";
import { PAGE, pageHref, type TemplateLinks } from "./lib";
import { Section, SectionHead } from "./ui";

/* ══════════════════ § 2 — OS NÚMEROS ════════════════════════════════════ */

/**
 * ⚠️ FAIXA ESTREITA, LOGO ABAIXO DA ABERTURA, E SEM CABEÇALHO DE SEÇÃO. Ela é
 * uma credencial, não um assunto: quem acabou de ler "podemos reduzir sua
 * conta" quer saber, na mesma respirada, se essa gente já fez isso antes. Um
 * cabeçalho de três degraus aqui transformaria a prova num capítulo.
 */
export function StatsBand() {
  if (!STATS.length) return null;

  return (
    <section className="relative border-y border-[var(--el-line-soft)] bg-[var(--el-ink-deep)] py-12 md:py-14">
      <div
        className="mx-auto grid w-full max-w-[78rem] gap-px sm:grid-cols-2 lg:grid-cols-4"
        style={{ paddingInline: "var(--el-pad)" }}
      >
        {STATS.map((s, i) => (
          <div key={s.label} data-reveal="up" data-reveal-delay={i * 70}>
            <p className="display text-[2.5rem] leading-none text-[var(--el-sun)] md:text-[3.25rem]">
              {s.value}
            </p>
            <p className="eyebrow mt-3 text-[var(--el-cream)]">{s.label}</p>
            {/* ⚠️ A RESSALVA ANDA COLADA NO NÚMERO. "+180 projetos" sem data
                envelhece sozinho; com "até setembro de 2026" continua
                verdadeiro para sempre, e é o que separa um número de uma
                alegação. */}
            {s.note ? (
              <p className="mt-1 text-[0.8125rem] text-[var(--el-cream-faint)]">{s.note}</p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ══════════════════ § 4 — NOSSAS SOLUÇÕES ═══════════════════════════════ */

export function SegmentsSection({ links }: { links: TemplateLinks }) {
  return (
    <Section id="solucoes" tone="deep">
      <SectionHead
        eyebrow="Nossas soluções"
        title="Quatro frentes, e cada uma resolve um problema diferente."
        lead="O recorte aqui é por quem pergunta, não por tecnologia: casa, comércio, campo ou um consumo grande o bastante para ser linha de orçamento. A escolha entre com bateria e sem vem depois, na análise."
      />

      <div
        className="mt-14 grid gap-px sm:grid-cols-2"
        style={{ background: "var(--el-line-soft)" }}
      >
        {SEGMENTS.map((seg, i) => {
          // ⚠️ O DESTINO SAI DO CONTEÚDO, NÃO DE UM `if` AQUI. Rural e maior
          // porte ainda não têm página própria e vão para a conversa; quando
          // ganharem, basta trocar `wa` por `page` em `content/offer.ts` e este
          // bloco continua igual.
          const href = seg.page ? pageHref(links, seg.page) : whatsappLink(seg.wa ?? WA_DEFAULT);
          const external = !seg.page;

          return (
            <a
              key={seg.label}
              href={href}
              {...(external ? { target: "_blank", rel: "noopener" } : {})}
              className="group flex flex-col bg-[var(--el-ink)] p-7 transition-colors hover:bg-[var(--el-ink-up)] md:p-8"
              data-reveal="up"
              data-reveal-delay={i * 60}
            >
              <span className="text-[var(--el-sun)]">
                <Icon name={seg.icon} className="h-8 w-8" />
              </span>
              <h3 className="display mt-6 text-[1.5rem] text-[var(--el-cream)] transition-colors group-hover:text-[var(--el-sun-hi)]">
                {seg.label}
              </h3>
              <p className="mt-3 flex-1 text-[0.9375rem] leading-relaxed text-[var(--el-cream-dim)]">
                {seg.text}
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-[0.8125rem] uppercase tracking-[0.14em] text-[var(--el-sun-hi)]">
                {seg.page ? "Ver detalhes" : "Falar sobre esse caso"}{" "}
                <span aria-hidden="true">→</span>
              </span>
            </a>
          );
        })}
      </div>
    </Section>
  );
}

/* ══════════════════ § 7 — PROJETOS REALIZADOS ═══════════════════════════ */

export function ProjectsSection() {
  if (!PROJECTS.length) return null;

  return (
    <Section id="projetos" tone="deep">
      <SectionHead
        eyebrow="Projetos realizados"
        title="Obra da EcoLuz, no Maranhão."
        lead="Cada foto abaixo é de um sistema que a nossa equipe projetou e instalou. Nenhuma é banco de imagens — se está aqui, existe e pode ser visitada."
      />

      <div
        className="mt-14 grid gap-px sm:grid-cols-2 lg:grid-cols-3"
        style={{ background: "var(--el-line-soft)" }}
      >
        {PROJECTS.map((p, i) => (
          <figure
            key={p.photo}
            className="flex flex-col bg-[var(--el-ink)]"
            data-reveal="up"
            data-reveal-delay={i * 60}
          >
            {/* ⚠️ `next/image` AQUI, E `<img>` NO RESTO DA PLATAFORMA. A regra
                da casa manda otimizar só onde a cardinalidade de imagens é
                BAIXA e a superfície é pública: um feed com milhares de mídias
                explodiria o custo de transformação da Vercel, uma galeria de
                seis obras não. E são fotos locais (`public/`), então não
                dependem de `remotePatterns` — o otimizador recusaria host
                desconhecido em tempo de execução, derrubando a página do
                cliente por causa de onde a imagem está hospedada. */}
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src={p.photo}
                alt={p.alt}
                fill
                sizes="(min-width: 1024px) 26rem, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition-transform duration-700 hover:scale-[1.03]"
              />
            </div>
            <figcaption className="p-6">
              <p className="eyebrow text-[var(--el-sun)]">{p.kind}</p>
              <p className="display mt-2 text-[1.125rem] text-[var(--el-cream)]">
                {p.place}
                {p.power ? <span className="text-[var(--el-cream-faint)]"> · {p.power}</span> : null}
              </p>
              {p.note ? (
                <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--el-cream-dim)]">
                  {p.note}
                </p>
              ) : null}
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}

/* ══════════════════ § 8 — FINANCIAMENTO ═════════════════════════════════ */

export function FinancingSection() {
  return (
    <Section id="financiamento" tone="paper">
      <SectionHead tone="paper" eyebrow={FINANCING.eyebrow} title={FINANCING.title} lead={FINANCING.lead} />

      <div className="mt-14 grid gap-px sm:grid-cols-3" style={{ background: "var(--el-paper-line)" }}>
        {FINANCING.points.map((p, i) => (
          <div
            key={p.title}
            className="bg-[var(--el-paper)] p-7"
            data-reveal="up"
            data-reveal-delay={i * 60}
          >
            <span className="text-[var(--el-amber-ink)]">
              <Icon name={p.icon} className="h-7 w-7" />
            </span>
            <h3 className="display mt-5 text-[1.25rem] text-[var(--el-paper-ink)]">{p.title}</h3>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--el-paper-dim)]">
              {p.text}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-6" data-reveal="up">
        <a
          href={whatsappLink(FINANCING.wa)}
          target="_blank"
          rel="noopener"
          className="btn btn-paper"
        >
          {FINANCING.cta}
        </a>
        {/* ⚠️ A RESSALVA FICA AO LADO DO BOTÃO, EM CORPO LEGÍVEL — não em
            rodapé nem em letra miúda. Quem lê "até 120x" e clica precisa saber,
            no mesmo olhar, que a aprovação não é nossa. */}
        <p className="max-w-md text-[0.8125rem] leading-relaxed text-[var(--el-paper-dim)]">
          {FINANCING.note}
        </p>
      </div>
    </Section>
  );
}

/* ══════════════════ § 9 — CONHEÇA A ECOLUZ ══════════════════════════════ */

export function AboutSection({ links }: { links: TemplateLinks }) {
  const hasPhoto = Boolean(ABOUT_HOME.photo);

  return (
    <Section id="a-ecoluz">
      <div
        className={
          hasPhoto
            ? "grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]"
            : ""
        }
      >
        <div>
          <SectionHead
            align="stack"
            eyebrow={ABOUT_HOME.eyebrow}
            title={ABOUT_HOME.title}
          />
          <div className="prose-el mt-8 max-w-2xl text-[1.0625rem] leading-relaxed text-[var(--el-cream-dim)]">
            {ABOUT_HOME.paragraphs.map((p) => (
              <p key={p.slice(0, 32)} data-reveal="up">
                {p}
              </p>
            ))}
          </div>
          <a
            href={pageHref(links, "sobre")}
            className="mt-8 inline-flex items-center gap-2 text-[0.8125rem] uppercase tracking-[0.14em] text-[var(--el-sun-hi)] transition-colors hover:text-[var(--el-sun)]"
            data-reveal="up"
          >
            Conhecer a empresa <span aria-hidden="true">→</span>
          </a>
        </div>

        {hasPhoto ? (
          <div className="relative aspect-[4/5] overflow-hidden" data-reveal="scale">
            <Image
              src={ABOUT_HOME.photo}
              alt={ABOUT_HOME.alt}
              fill
              sizes="(min-width: 1024px) 30rem, 100vw"
              className="object-cover"
            />
          </div>
        ) : null}
      </div>
    </Section>
  );
}

/* ══════════════════ § 10 — ONDE ESTAMOS ═════════════════════════════════ */

/**
 * ⚠️ AS UNIDADES E OS MUNICÍPIOS ATENDIDOS FICAM NA MESMA SEÇÃO, e isso é
 * decisão de estrutura, não de estilo.
 *
 * São duas perguntas diferentes — *"onde vocês estão"* e *"até onde vocês
 * vão"* —, mas quem lê faz as duas de uma vez. Em seções separadas a home
 * teria dois blocos com o mesmo título aparente ("Onde...") a uma rolagem de
 * distância, e a segunda pareceria repetição da primeira.
 *
 * ⚠️ E A GRADE DOS MUNICÍPIOS NÃO PODE SUMIR DAQUI. Ela é o ÚNICO caminho da
 * home para as quatro páginas de município — a barra mostra cinco destinos e
 * nenhum deles é uma cidade. Tirada, as quatro páginas continuam no ar e
 * ninguém, nem o visitante nem o buscador, chega nelas por link.
 */
export function UnitsSection({ links }: { links: TemplateLinks }) {
  return (
    <Section id="onde-estamos" tone="paper">
      <SectionHead
        tone="paper"
        eyebrow="Onde estamos"
        title="Duas unidades no Maranhão."
        lead={UNITS_NOTE}
      />

      <div
        className="mt-14 grid gap-px sm:grid-cols-2"
        style={{ background: "var(--el-paper-line)" }}
      >
        {UNITS.map((u, i) => (
          <div
            key={`${u.city}-${u.uf}`}
            className="bg-[var(--el-paper)] p-7 md:p-8"
            data-reveal="up"
            data-reveal-delay={i * 70}
          >
            <span className="text-[var(--el-amber-ink)]">
              <Icon name="pin" className="h-7 w-7" />
            </span>
            <h3 className="display mt-5 text-[1.5rem] text-[var(--el-paper-ink)]">
              {u.city} <span className="text-[var(--el-paper-dim)]">/ {u.uf}</span>
            </h3>
            {u.isBase ? <p className="eyebrow mt-2 text-[var(--el-amber-ink)]">Nossa base</p> : null}
            {/* Unidade sem endereço informado aparece como cidade e ponto. Um
                endereço inventado mandaria cliente para uma porta que não
                existe — ver a nota em `content/company.ts`. */}
            {u.address ? (
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-[var(--el-paper-dim)]">
                {u.address}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      {/* ── Até onde a EcoLuz vai ─────────────────────────────────────── */}
      <div className="mt-16">
        <div className="rule rule-ink mb-5 w-16" data-rule />
        <h3 className="display text-[1.75rem] text-[var(--el-paper-ink)] md:text-[2.125rem]" data-reveal="up">
          Atendimento na Ilha do Maranhão.
        </h3>
        <p
          className="mt-3 max-w-2xl text-[1.0625rem] leading-relaxed text-[var(--el-paper-dim)]"
          data-reveal="up"
          data-reveal-delay="80"
        >
          A partir da loja no Turu o atendimento cobre os quatro municípios da
          ilha — e cada um tem a sua particularidade técnica.
        </p>

        <div
          className="mt-10 grid gap-px sm:grid-cols-2 lg:grid-cols-4"
          style={{ background: "var(--el-paper-line)" }}
        >
          {AREAS.map((a, i) => (
            <a
              key={a.slug}
              href={pageHref(links, a.slug)}
              className="group flex flex-col bg-[var(--el-paper)] p-6 transition-colors hover:bg-[var(--el-paper-up)]"
              data-reveal="up"
              data-reveal-delay={i * 60}
            >
              <h4 className="display text-[1.1875rem] text-[var(--el-paper-ink)] transition-colors group-hover:text-[var(--el-amber-ink)]">
                {a.name}
              </h4>
              <p className="eyebrow mt-1.5 text-[var(--el-amber-ink)]">
                {a.isBase ? "Nossa base" : a.uf}
              </p>
              <p className="mt-4 flex-1 text-[0.9375rem] leading-relaxed text-[var(--el-paper-dim)]">
                {a.card}
              </p>
            </a>
          ))}
        </div>

        <p className="mt-8 text-[0.9375rem] text-[var(--el-paper-dim)]" data-reveal="fade">
          Projeto fora da ilha?{" "}
          <a
            href={pageHref(links, PAGE.areas)}
            className="text-[var(--el-amber-ink)] underline underline-offset-4"
          >
            Veja como funciona
          </a>
          .
        </p>
      </div>
    </Section>
  );
}

/* ══════════════════ § 11 — AVALIAÇÕES ═══════════════════════════════════ */

function Stars({ n }: { n: number }) {
  const full = Math.max(0, Math.min(5, Math.round(n)));
  return (
    <p className="flex gap-1 text-[var(--el-sun)]" aria-label={`${full} de 5 estrelas`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" focusable="false">
          <path
            d="m12 3.5 2.6 5.5 5.9.8-4.3 4.2 1 6-5.2-2.9-5.2 2.9 1-6L3.5 9.8l5.9-.8z"
            fill={i < full ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={1.4}
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </p>
  );
}

export function ReviewsSection() {
  if (!REVIEWS.length) return null;

  return (
    <Section id="avaliacoes">
      <SectionHead
        eyebrow="Avaliações"
        title="Quem já escolheu a EcoLuz, recomenda."
        lead="As avaliações abaixo foram publicadas por clientes no perfil da empresa no Google. Estão aqui como foram escritas."
      />

      {/* ⚠️ A TERCEIRA COLUNA SÓ EXISTE COM TRÊS AVALIAÇÕES. O fundo deste
          bloco é a linha divisória e cada card a cobre — então célula VAZIA
          não fica vazia: vira um retângulo da cor da linha, que lê como
          defeito. Hoje são duas. */}
      <div
        className={`mt-14 grid gap-px sm:grid-cols-2 ${
          REVIEWS.length >= 3 ? "lg:grid-cols-3" : ""
        }`}
        style={{ background: "var(--el-line-soft)" }}
      >
        {REVIEWS.map((r, i) => (
          <blockquote
            key={`${r.name}-${i}`}
            className="flex flex-col bg-[var(--el-ink)] p-7"
            data-reveal="up"
            data-reveal-delay={i * 60}
          >
            <Stars n={r.stars} />
            <p className="mt-5 flex-1 text-[0.9375rem] leading-relaxed text-[var(--el-cream-dim)]">
              {r.text}
            </p>
            <footer className="display mt-6 text-[1rem] text-[var(--el-cream)]">{r.name}</footer>
          </blockquote>
        ))}
      </div>

      {/* ⚠️ O BOTÃO SÓ EXISTE COM O LINK DO PERFIL. É ele que torna as citações
          verificáveis — sem ele, são só frases que nós escrevemos numa página
          que nós controlamos. */}
      {REVIEWS_URL ? (
        <a
          href={REVIEWS_URL}
          target="_blank"
          rel="noopener"
          className="btn btn-ghost mt-10"
          data-reveal="up"
        >
          Ver todas no Google
        </a>
      ) : null}
    </Section>
  );
}

/* ══════════════════ § 13 — O QUE CABE NA SUA CONTA ══════════════════════ */

export function LoadsSection() {
  return (
    <Section id="consumo">
      <SectionHead
        eyebrow="Identifique o seu caso"
        title="O que cabe na sua conta de energia?"
        lead="Quase toda conta alta tem um ou dois responsáveis. Reconhecer o seu é o primeiro passo — é ele que define o tamanho do sistema."
      />

      <div
        className="mt-14 grid gap-px sm:grid-cols-2 lg:grid-cols-3"
        style={{ background: "var(--el-line-soft)" }}
      >
        {LOADS.map((l, i) => (
          <div
            key={l.label}
            className="bg-[var(--el-ink)] p-7"
            data-reveal="up"
            data-reveal-delay={i * 50}
          >
            <span className="text-[var(--el-sun)]">
              <Icon name={l.icon} className="h-7 w-7" />
            </span>
            <h3 className="display mt-5 text-[1.1875rem] text-[var(--el-cream)]">{l.label}</h3>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--el-cream-dim)]">
              {l.text}
            </p>
          </div>
        ))}
      </div>

      <p
        className="mt-10 max-w-2xl text-[1.0625rem] leading-relaxed text-[var(--el-cream)]"
        data-reveal="fade"
      >
        {LOADS_NOTE}
      </p>
    </Section>
  );
}
