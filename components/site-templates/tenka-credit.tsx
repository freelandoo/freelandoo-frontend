// components/site-templates/tenka-credit.tsx
// Crédito no fim do rodapé de todo site feito por nós, igual ao do site da Innovation Week.
// O estilo é inline de propósito: cada tema tem o próprio CSS e esta peça não depende de nenhum.

export function TenkaCredit({ tone = "dark" }: { tone?: "dark" | "light" }) {
  return (
    <a
      href="https://tenkagroup.com.br/tech"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Desenvolvido por TENKA Tech — conheça o site"
      style={{
        display: "grid",
        justifyItems: "center",
        gap: 10,
        width: "fit-content",
        margin: "32px auto 24px",
        color: "inherit",
        fontSize: 12,
        letterSpacing: "0.2em",
        opacity: 0.9,
        textDecoration: "none",
      }}
    >
      <span>DESENVOLVIDO POR</span>
      {/* eslint-disable-next-line @next/next/no-img-element -- logo de 3 KB, sem otimizador */}
      <img
        src={tone === "dark" ? "/images/tenka/tenka-tech.svg" : "/images/tenka/tenka-tech-dark.svg"}
        alt=""
        width={140}
        height={32}
        loading="lazy"
      />
    </a>
  )
}
