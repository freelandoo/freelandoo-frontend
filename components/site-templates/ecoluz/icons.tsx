// OS ÍCONES — desenhados aqui, em SVG inline.
//
// ⚠️ NÃO VEM DE CDN. O site original carregava a biblioteca de ícones do
// `unpkg`, e dentro da Freelandoo isso morre em silêncio: a CSP da plataforma
// não tem esse host, o script é bloqueado e TODO ícone da página simplesmente
// não é desenhado — sem erro visível para quem abriu o site. Um `<i>` vazio
// não parece defeito, parece espaço.
//
// ⚠️ E NÃO VEM DE `lucide-react` tampouco. A plataforma tem a biblioteca, mas
// um tema autoral que puxa o mesmo conjunto de ícones de todo mundo perde a
// única coisa que o distingue de um template. São dez desenhos, todos no mesmo
// traço de 1.5 e na mesma grade de 24.
//
// ⚠️ `IconName` É LISTA FECHADA de propósito: `content/` escolhe o ícone pelo
// NOME, e um nome torto viraria um buraco no card em vez de erro de
// compilação. Ícone novo entra no tipo E no mapa — faltando no mapa, o
// TypeScript reprova na hora.

export type IconName =
  | "home"
  | "building"
  | "battery"
  | "file"
  | "wrench"
  | "wallet"
  | "shield"
  | "leaf"
  | "sun"
  | "bolt";

const PATHS: Record<IconName, React.ReactNode> = {
  home: (
    <>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M9.5 20v-5.5h5V20" />
    </>
  ),
  building: (
    <>
      <path d="M4 20V5.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1V20" />
      <path d="M14 10h5a1 1 0 0 1 1 1v9" />
      <path d="M2.5 20h19" />
      <path d="M7 8.5h4M7 12h4M7 15.5h4M17 13.5h0M17 17h0" />
    </>
  ),
  battery: (
    <>
      <rect x="2.5" y="7.5" width="16" height="9" rx="1.5" />
      <path d="M21.5 11v2" />
      <path d="M11 9.5 8.5 12.5h3L9 14.5" />
    </>
  ),
  file: (
    <>
      <path d="M14 3H6.5a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z" />
      <path d="M14 3v5h5" />
      <path d="M8.5 13.5h7M8.5 17h4.5" />
    </>
  ),
  wrench: (
    <>
      <path d="M14.5 6.5a4 4 0 0 0 5 5l-8.2 8.2a2.1 2.1 0 0 1-3-3l8.2-8.2a4 4 0 0 0-5-5l2.7 2.7-1.7 3.3-3.3 1.7z" />
    </>
  ),
  wallet: (
    <>
      <path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h12.5a1.5 1.5 0 0 1 1.5 1.5v1" />
      <rect x="3.5" y="7.5" width="17" height="11" rx="1.5" />
      <path d="M16.5 13h.01" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 4.5 6v5.5c0 4.3 3 8.2 7.5 9.5 4.5-1.3 7.5-5.2 7.5-9.5V6z" />
      <path d="m8.8 12 2.3 2.3 4.1-4.4" />
    </>
  ),
  leaf: (
    <>
      <path d="M20 4c0 8-4.6 13-10 13a5 5 0 0 1-5-5C5 7.6 10.5 4 20 4Z" />
      <path d="M4 20c1.5-4.5 4.5-8 9-10" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
    </>
  ),
  bolt: <path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z" />,
};

export function Icon({
  name,
  className = "h-6 w-6",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}

/**
 * A MARCA, desenhada — um sol sobre a curva do telhado.
 *
 * ⚠️ É SVG e não a PNG do logo de propósito: ela aparece na barra fixa, no
 * rodapé e no favicon, em três tamanhos, e uma PNG de 3 KB redimensionada fica
 * borrada na tela retina exatamente onde a marca precisa estar nítida. O
 * desenho também herda a cor do contexto, o que faz a versão do rodapé
 * (creme) e a da barra (amarelo) saírem do mesmo componente.
 */
export function Monogram({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      <circle cx="24" cy="20" r="9.5" fill="currentColor" />
      <path
        d="M23 10 16.5 25.5h6.2L20.5 36 32 20.5h-6.5L28 10z"
        fill="var(--el-ink)"
      />
      <path
        d="M9 35.5c5.5-5.5 24.5-5.5 30 0"
        fill="none"
        stroke="currentColor"
        strokeWidth={4}
        strokeLinecap="round"
      />
    </svg>
  );
}
