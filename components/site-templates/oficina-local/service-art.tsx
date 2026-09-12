
import { SERVICE_ICONS } from "./icons";
import type { TemplateArt } from "@/types/site-template";

/**
 * Placa técnica de cada serviço.
 *
 * Enquanto não há fotografia do serviço, a placa é desenhada — arcos
 * concêntricos do banner, marcação de instrumento e o símbolo do serviço em
 * ouro. É deliberado: foto de banco de imagem genérica denunciaria template.
 *
 * PARA TROCAR POR FOTO REAL: basta preencher `photo` no serviço, no documento
 * do site — o componente usa a foto e a placa desenhada some.
 *
 * ⚠️ A foto entra por `<img>`, não por `next/image`: a URL vem do documento e o
 * otimizador do Next RECUSA host fora de `remotePatterns`, com erro de runtime.
 * Uma foto hospedada no lugar "errado" derrubaria a página do cliente em vez de
 * simplesmente aparecer.
 */

const CAPTION: Record<TemplateArt, string> = {
  burner: "Queimador · chama azul regulada",
  refit: "Recuperação · peças de uso e vedação",
  industrial: "Alta pressão · bateria de queimadores",
  clean: "Desobstrução · injetor e espalhador",
  griddle: "Chapa · distribuição de calor",
  install: "Instalação · teste de estanqueidade",
};

export default function ServiceArt({
  art,
  photo,
  alt,
  ratio = "4/3",
  fill = false,
  priority = false,
  className = "",
}: {
  art: TemplateArt;
  photo?: string;
  alt: string;
  ratio?: "4/3" | "16/10" | "1/1" | "3/2";
  /** Usar quando a placa divide a linha com o texto: a partir do md ela passa
   *  a tirar largura e altura da celula, largando a proporcao. Sem isso a
   *  proporcao recalcula a largura pela altura esticada e invade a coluna. */
  fill?: boolean;
  priority?: boolean;
  className?: string;
}) {
  const Icon = SERVICE_ICONS[art];

  return (
    <div
      className={`fx-art fx-grain relative overflow-hidden border border-white/10 bg-[#0b0b0e] ${fill ? "fx-art-fill" : ""} ${className}`}
      style={{ "--art-ratio": ratio.replace("/", " / ") } as React.CSSProperties}
    >
      {photo ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo}
            alt={alt}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(5,5,6,.15) 0%, rgba(5,5,6,.05) 40%, rgba(5,5,6,.82) 100%)",
            }}
          />
        </>
      ) : (
        <>
          {/* arcos concêntricos — assinatura da marca */}
          <svg
            viewBox="0 0 400 300"
            aria-hidden
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <radialGradient id={`gp-${art}`} cx="50%" cy="46%" r="62%">
                <stop offset="0%" stopColor="#f3b73f" stopOpacity="0.30" />
                <stop offset="55%" stopColor="#f3b73f" stopOpacity="0.10" />
                <stop offset="100%" stopColor="#f3b73f" stopOpacity="0" />
              </radialGradient>
              <linearGradient id={`gl-${art}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffe7a3" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#c98a1c" stopOpacity="0.55" />
              </linearGradient>
            </defs>

            <rect width="400" height="300" fill={`url(#gp-${art})`} />

            <g stroke="#f3b73f" fill="none">
              {[38, 62, 86, 110, 134, 158, 182].map((r, i) => (
                <circle
                  key={r}
                  cx="200"
                  cy="138"
                  r={r}
                  strokeOpacity={0.3 - i * 0.033}
                  strokeWidth={i === 1 ? 0.9 : 0.55}
                />
              ))}
            </g>

            {/* retículo de instrumento */}
            <g stroke="#f3b73f" strokeOpacity="0.22" strokeWidth="0.6">
              <line x1="200" y1="16" x2="200" y2="52" />
              <line x1="200" y1="224" x2="200" y2="260" />
              <line x1="24" y1="138" x2="60" y2="138" />
              <line x1="340" y1="138" x2="376" y2="138" />
            </g>

            {/* marcações laterais */}
            <g stroke="#ffffff" strokeOpacity="0.14" strokeWidth="0.7">
              {Array.from({ length: 11 }).map((_, i) => (
                <line key={i} x1="16" y1={40 + i * 22} x2={i % 5 === 0 ? 30 : 23} y2={40 + i * 22} />
              ))}
            </g>
          </svg>

          {/* símbolo do serviço */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon
              className="h-[38%] max-h-[150px] w-[38%] max-w-[150px] text-[#ffe7a3]"
              strokeWidth={1.1}
              style={{ filter: "drop-shadow(0 0 26px rgba(243,183,63,.38))" }}
            />
          </div>

          {/* véu inferior para o texto assentar */}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-2/5"
            style={{ background: "linear-gradient(180deg, transparent, rgba(5,5,6,.9))" }}
          />

          <p className="absolute inset-x-0 bottom-0 px-5 py-4 text-[0.6875rem] tracking-[0.18em] text-[#f3b73f]/70 uppercase">
            {CAPTION[art]}
          </p>
        </>
      )}

      {/* cantos técnicos */}
      <span
        aria-hidden
        className="absolute top-3 left-3 h-4 w-4 border-t border-l border-[#f3b73f]/55"
      />
      <span
        aria-hidden
        className="absolute right-3 bottom-3 h-4 w-4 border-r border-b border-[#f3b73f]/55"
      />
    </div>
  );
}
