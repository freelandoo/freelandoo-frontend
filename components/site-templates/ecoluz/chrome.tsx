"use client";

/**
 * A CASCA: barra fixa, menu do celular, rodapé e botão flutuante.
 *
 * ⚠️ ESTE É O ÚNICO ARQUIVO DE CLIENTE COM GESTO nas bordas do site (o de
 * movimento não desenha nada, e a calculadora é uma peça isolada). Tudo mais é
 * componente de servidor, porque fonte, folha e JSON-LD precisam estar no HTML
 * que o buscador lê.
 */

import { useEffect, useRef, useState } from "react";

import { AREAS } from "./content/areas";
import { ADDRESS_LINE, BUSINESS, MAIL_HREF, TEL_HREF, WA_DEFAULT, whatsappLink } from "./content/business";
import { SERVICES } from "./content/services";
import { Monogram } from "./icons";
import { PAGE, pageHref, type TemplateLinks } from "./lib";

/**
 * Os destinos da barra.
 *
 * ⚠️ UM SÓ DECISOR. A barra, o menu do celular e o rodapé leem desta função —
 * escritos em três lugares, o dia em que uma página entrar, dois deles ficam
 * para trás e a página nasce inalcançável em dois dos três menus.
 */
function navFor(links: TemplateLinks) {
  return [
    { href: pageHref(links, PAGE.servicos), label: "Serviços" },
    { href: pageHref(links, "sistema-off-grid"), label: "Off-grid" },
    { href: pageHref(links, PAGE.areas), label: "Onde atendemos" },
    { href: pageHref(links, PAGE.sobre), label: "A EcoLuz" },
    { href: pageHref(links, PAGE.contato), label: "Contato" },
  ];
}

/* ───────────────────────────── BARRA FIXA ──────────────────────────────── */

export function SiteHeader({ links }: { links: TemplateLinks }) {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const progress = useRef<HTMLSpanElement | null>(null);
  const nav = navFor(links);

  /**
   * A barra e a LINHA DE PROGRESSO DE LEITURA, no mesmo ouvinte de rolagem.
   *
   * ⚠️ A LINHA É ESCRITA DIRETO NO DOM, nunca por estado do React: ela muda a
   * cada quadro de rolagem, e por `setState` isso remontaria a barra inteira
   * 60 vezes por segundo. `solid` continua sendo estado porque muda duas
   * vezes na página toda — e o React ignora o `set` quando o valor é o mesmo.
   *
   * ⚠️ `scaleX` E NÃO `width`. Largura é LAYOUT: animada a cada quadro, custa
   * o documento inteiro por quadro. `transform` é composto.
   *
   * ⚠️ E A BARRA NÃO CONDENSA. Encolher a altura do cabeçalho ao rolar seria
   * o gesto óbvio e é exatamente o proibido — `height` é layout, e sujá-lo a
   * cada quadro trava a rolagem justamente onde ela é mais visível. A linha de
   * progresso resolve a mesma necessidade (dizer que a página está andando) e
   * é de graça.
   */
  useEffect(() => {
    let frame = 0;

    const read = () => {
      frame = 0;
      const y = window.scrollY;
      setSolid(y > 24);

      const el = progress.current;
      if (!el) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      // Página que cabe na tela não tem progresso a mostrar — e a divisão por
      // zero escreveria `NaN` no transform, que o navegador descarta em
      // silêncio deixando a linha cheia.
      const done = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
      el.style.transform = `scaleX(${done})`;
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(read);
    };

    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Esc fecha o menu. Sem isto, quem abriu pelo teclado fica preso dentro
  // dele — a saída seria caçar o botão de fechar com Tab.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 transition-colors duration-300"
      style={{
        background: solid || open ? "rgb(7 6 3 / 0.94)" : "transparent",
        borderBottom: `1px solid ${solid || open ? "var(--el-line-soft)" : "transparent"}`,
        backdropFilter: solid || open ? "blur(10px)" : undefined,
      }}
    >
      <div
        className="mx-auto flex w-full max-w-[78rem] items-center justify-between gap-4 py-3"
        style={{ paddingInline: "var(--el-pad)" }}
      >
        <a
          href={links.home}
          className="flex items-center gap-2.5 text-[var(--el-sun)]"
          aria-label={`${BUSINESS.name} — início`}
        >
          <Monogram className="h-9 w-9" />
          <span className="display hidden text-[1.15rem] leading-none text-[var(--el-cream)] sm:block">
            Eco<span className="text-[var(--el-sun)]">Luz</span>
          </span>
        </a>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Navegação principal">
          {nav.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="text-[0.8125rem] uppercase tracking-[0.14em] text-[var(--el-cream-dim)] transition-colors duration-200 hover:text-[var(--el-sun-hi)]"
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={whatsappLink(WA_DEFAULT)}
            target="_blank"
            rel="noopener"
            className="btn btn-solid !px-4 !py-2.5 !text-[0.6875rem]"
          >
            Falar agora
          </a>

          {/* O botão do menu só existe abaixo do lg — acima dele a navegação
              está toda visível, e um botão que abre o que já está na tela é um
              passo a mais para nada. */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="menu-celular"
            aria-label={open ? "Fechar o menu" : "Abrir o menu"}
            className="flex h-10 w-10 items-center justify-center border border-[var(--el-line)] text-[var(--el-sun-hi)] lg:hidden"
          >
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6">
              {open ? (
                <path d="M4 4l12 12M16 4L4 16" strokeLinecap="round" />
              ) : (
                <path d="M2 5h16M2 10h16M2 15h16" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* A linha de progresso: filha direta da barra (que já é `fixed`, e
          portanto elemento posicionado), então ela atravessa a tela de ponta a
          ponta em vez de parar na coluna de conteúdo. */}
      <span ref={progress} className="el-progress" aria-hidden="true" />

      {open ? (
        <nav
          id="menu-celular"
          aria-label="Navegação"
          className="max-h-[70vh] overflow-y-auto border-t border-[var(--el-line-soft)] lg:hidden"
          style={{ background: "rgb(7 6 3 / 0.98)" }}
        >
          <ul className="flex flex-col py-2" style={{ paddingInline: "var(--el-pad)" }}>
            {nav.map((n) => (
              <li key={n.href} className="border-b border-[var(--el-line-soft)] last:border-0">
                <a
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="block py-3.5 text-[0.9375rem] uppercase tracking-[0.12em] text-[var(--el-cream)]"
                >
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}

/* ─────────────────────────────── RODAPÉ ────────────────────────────────── */

/**
 * ⚠️ O RODAPÉ LISTA AS 14 PÁGINAS, e isso não é enfeite: a barra mostra cinco
 * destinos, e as outras oito só são alcançadas pelo "veja também" de outra
 * página. Aqui elas ganham um link fixo, em toda página do site — que é o que
 * garante que o buscador encontre todas partindo de qualquer uma.
 */
export function SiteFooter({ links }: { links: TemplateLinks }) {
  return (
    <footer className="relative border-t border-[var(--el-line-soft)] bg-[var(--el-ink-deep)]">
      <div
        className="mx-auto grid w-full max-w-[78rem] gap-12 py-16 md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]"
        style={{ paddingInline: "var(--el-pad)" }}
      >
        <div>
          <a href={links.home} className="flex items-center gap-2.5 text-[var(--el-sun)]">
            <Monogram className="h-10 w-10" />
            <span className="display text-[1.3rem] leading-none text-[var(--el-cream)]">
              Eco<span className="text-[var(--el-sun)]">Luz</span>
            </span>
          </a>

          <p className="mt-5 max-w-xs text-[0.9375rem] leading-relaxed text-[var(--el-cream-dim)]">
            Projetos de energia solar em São Luís e na Ilha do Maranhão —
            sistemas conectados à rede e off-grid com baterias.
          </p>

          <address className="mt-6 not-italic text-[0.875rem] leading-relaxed text-[var(--el-cream-faint)]">
            {ADDRESS_LINE}
          </address>

          <div className="mt-5 flex flex-col gap-1.5 text-[0.9375rem]">
            <a href={TEL_HREF} className="text-[var(--el-cream)] transition-colors hover:text-[var(--el-sun-hi)]">
              {BUSINESS.phoneDisplay}
            </a>
            <a href={MAIL_HREF} className="break-all text-[var(--el-cream-dim)] transition-colors hover:text-[var(--el-sun-hi)]">
              {BUSINESS.email}
            </a>
            <a
              href={BUSINESS.instagram}
              target="_blank"
              rel="noopener"
              className="text-[var(--el-cream-dim)] transition-colors hover:text-[var(--el-sun-hi)]"
            >
              Instagram
            </a>
          </div>
        </div>

        <div className="grid gap-10 sm:grid-cols-3">
          <FooterColumn
            title="Serviços"
            items={[
              ...SERVICES.map((s) => ({ href: pageHref(links, s.slug), label: s.label })),
              { href: pageHref(links, PAGE.servicos), label: "Ver todos" },
            ]}
          />
          <FooterColumn
            title="Onde atendemos"
            items={[
              ...AREAS.map((a) => ({ href: pageHref(links, a.slug), label: `${a.name}/${a.uf}` })),
              { href: pageHref(links, PAGE.areas), label: "Ver a região" },
            ]}
          />
          <FooterColumn
            title="A empresa"
            items={[
              { href: links.home, label: "Início" },
              { href: pageHref(links, PAGE.sobre), label: "Sobre a EcoLuz" },
              { href: pageHref(links, PAGE.contato), label: "Contato" },
            ]}
          />
        </div>
      </div>

      <div
        className="mx-auto flex w-full max-w-[78rem] flex-wrap items-center justify-between gap-3 border-t border-[var(--el-line-soft)] py-6 text-[0.8125rem] text-[var(--el-cream-faint)]"
        style={{ paddingInline: "var(--el-pad)" }}
      >
        <span>© {new Date().getFullYear()} {BUSINESS.name}</span>
        <span>A economia depende de análise técnica individual.</span>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  items,
}: {
  title: string;
  items: { href: string; label: string }[];
}) {
  return (
    <div>
      <p className="eyebrow mb-4 text-[var(--el-sun)]">{title}</p>
      <ul className="grid gap-2.5">
        {items.map((it) => (
          <li key={it.href + it.label}>
            <a
              href={it.href}
              className="text-[0.875rem] text-[var(--el-cream-dim)] transition-colors hover:text-[var(--el-sun-hi)]"
            >
              {it.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ────────────────────────── BOTÃO FLUTUANTE ────────────────────────────── */

/**
 * ⚠️ O PULSO É `box-shadow`, NUNCA `transform: scale` — ver a nota longa em
 * `theme.css`. Este botão é `fixed` e encosta na borda, e elemento fixo na
 * borda não é recortado por nada: o recorte mora em `> main`, que é irmão
 * dele. Um anel em `scale` passaria da borda da tela e abriria rolagem
 * horizontal no documento inteiro, com o sintoma aparecendo só no celular.
 */
export function WhatsappFab() {
  return (
    <a
      href={whatsappLink(WA_DEFAULT)}
      target="_blank"
      rel="noopener"
      aria-label="Falar com a EcoLuz no WhatsApp"
      className="fab-zap fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-[#07240f] transition-transform duration-200 hover:brightness-110"
    >
      <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
        <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.38a9.87 9.87 0 0 0 4.73 1.2h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.64-1.03-5.13-2.9-7A9.82 9.82 0 0 0 12.04 2Zm0 18.05h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.1.81.83-3.03-.2-.31a8.17 8.17 0 0 1-1.26-4.38c0-4.53 3.7-8.22 8.23-8.22a8.17 8.17 0 0 1 8.21 8.23c0 4.53-3.69 8.23-8.22 8.23Zm4.51-6.16c-.25-.13-1.46-.72-1.69-.8-.22-.09-.39-.13-.55.12s-.63.8-.77.96c-.14.17-.28.19-.53.07-.25-.13-1.04-.39-1.99-1.23-.73-.66-1.23-1.46-1.37-1.71-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.55-1.34-.76-1.83-.2-.48-.4-.42-.55-.43h-.47c-.16 0-.43.06-.65.31-.22.25-.85.84-.85 2.04s.87 2.37.99 2.53c.12.17 1.71 2.62 4.15 3.67.58.25 1.03.4 1.39.51.58.19 1.11.16 1.53.1.47-.07 1.46-.6 1.66-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.3Z" />
      </svg>
    </a>
  );
}
