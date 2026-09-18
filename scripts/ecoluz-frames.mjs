#!/usr/bin/env node
/**
 * O VÍDEO DA ABERTURA DA ECOLUZ → a sequência de quadros que a rolagem arrasta.
 *
 *   node scripts/ecoluz-frames.mjs <video.mp4>
 *   node scripts/ecoluz-frames.mjs <video.mp4> --frames=150
 *   node scripts/ecoluz-frames.mjs <video.mp4> --no-write   (não mexe no código)
 *
 * Ele corta o vídeo em N quadros igualmente espaçados, grava DOIS conjuntos
 * (um largo e um estreito) em `public/sites/ecoluz/abertura/` e ajusta o
 * `count` e o `seconds` de `components/site-templates/ecoluz/content/frames.ts`.
 * Depois disso a abertura passa a mostrar o vídeo sozinha.
 *
 * ⚠️ O QUE ELE NÃO MEXE É NAS DEIXAS (`ACT_CUES`), e é de propósito: em que
 * segundo o texto troca é decisão editorial, não medição. Ele só CONFERE se as
 * deixas antigas ainda cabem no vídeo novo e avisa quando não cabem.
 *
 * ═══ AS DECISÕES QUE ESTÃO AQUI DENTRO ═════════════════════════════════════
 *
 * ⚠️ QUADROS EM DISCO, NÃO UM `<video>`. Buscar posição num vídeo é assíncrono
 * e o navegador entrega o quadro quando puder — no iOS isso vira um salto a
 * cada dois ou três dedos de rolagem. A conta que se paga em troca é PESO: o
 * vídeo comprimido tem uns poucos megabytes e a sequência tem vários. É por
 * isso que o número de quadros é a variável mais importante deste arquivo, e
 * por isso ele imprime o peso no fim.
 *
 * ⚠️ DOIS CONJUNTOS, PORQUE A CONTA DO CELULAR É OUTRA. O largo serve monitor;
 * o estreito tem pouco mais de um terço dos bytes por quadro — e o site ainda
 * pula um quadro sim, outro não no celular (`narrowStep` em `frames.ts`), o
 * que corta o peso pela metade de novo.
 *
 * ⚠️ WEBP E NÃO JPEG. Na mesma qualidade percebida ele fica ~30% menor, e
 * multiplicado por cento e vinte quadros isso é o que decide se a abertura
 * carrega antes de a pessoa terminar de ler o primeiro ato.
 *
 * ⚠️ O NÚMERO GRAVADO É O QUE EXISTE EM DISCO, não o que foi pedido. O filtro
 * `fps` do ffmpeg arredonda, e sobra ou falta um quadro conforme a duração.
 * Contar os arquivos depois é a única fonte que não mente — se o código dissesse
 * 150 e houvesse 149, o último pedaço da rolagem congelaria no penúltimo.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "sites", "ecoluz", "abertura");
const CONTRACT = join(ROOT, "components", "site-templates", "ecoluz", "content", "frames.ts");

/** Os dois conjuntos. O nome da pasta é a largura — espelha `frameSrc()`. */
const SETS = [
  { dir: "w1600", width: 1600, quality: 72 },
  { dir: "w900", width: 900, quality: 70 },
];

const DEFAULT_FRAMES = 120;

/* ─────────────────────────────── entrada ─────────────────────────────────── */

const args = process.argv.slice(2);
const video = args.find((a) => !a.startsWith("--"));
const write = !args.includes("--no-write");
const askedFrames = Number(
  (args.find((a) => a.startsWith("--frames=")) || "").split("=")[1] || DEFAULT_FRAMES,
);

if (!video) {
  console.error("uso: node scripts/ecoluz-frames.mjs <video.mp4> [--frames=120] [--no-write]");
  process.exit(1);
}
if (!existsSync(video)) {
  console.error(`vídeo não encontrado: ${video}`);
  process.exit(1);
}
if (!Number.isFinite(askedFrames) || askedFrames < 24 || askedFrames > 400) {
  console.error("--frames precisa ser um número entre 24 e 400.");
  process.exit(1);
}

/* ─────────────────────────── ferramentas ─────────────────────────────────── */

function run(bin, argv) {
  return execFileSync(bin, argv, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function have(bin) {
  try {
    run(bin, ["-version"]);
    return true;
  } catch {
    return false;
  }
}

if (!have("ffmpeg")) {
  console.error("ffmpeg não encontrado no PATH. Instale-o e rode de novo.");
  process.exit(1);
}

/**
 * A duração do vídeo, em segundos.
 *
 * ⚠️ O `ffprobe` NEM SEMPRE ESTÁ AO LADO DO `ffmpeg` — a build embutida que o
 * backend usa (`ffmpeg-static`) não o traz, e a lição já foi paga lá. Por isso
 * a leitura do stderr do próprio ffmpeg é o caminho de reserva, e não o
 * contrário: quando o ffprobe existe ele é exato.
 */
function durationOf(file) {
  if (have("ffprobe")) {
    const out = run("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=nw=1:nk=1",
      file,
    ]).trim();
    const n = Number(out);
    if (Number.isFinite(n) && n > 0) return n;
  }
  try {
    run("ffmpeg", ["-i", file]);
  } catch (err) {
    const text = String(err.stderr || "");
    const m = text.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
    if (m) return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  }
  return 0;
}

/* ──────────────────────────── a extração ─────────────────────────────────── */

const seconds = durationOf(video);
if (!seconds) {
  console.error("não consegui ler a duração do vídeo.");
  process.exit(1);
}

console.log(`vídeo:   ${video}`);
console.log(`duração: ${seconds.toFixed(2)}s`);
console.log(`alvo:    ${askedFrames} quadros\n`);

// A taxa que produz N quadros ao longo de toda a duração. Fração, não inteiro:
// um vídeo de 9,4s com 120 quadros pede 12,77 q/s, e arredondar para 13 daria
// quadros a mais no fim — que o `fps` do ffmpeg descartaria de forma desigual.
const rate = (askedFrames / seconds).toFixed(6);

let counts = [];

for (const set of SETS) {
  const dir = join(OUT_DIR, set.dir);
  // ⚠️ APAGAR ANTES É OBRIGATÓRIO. Uma segunda passada com MENOS quadros
  // deixaria os do fim da passada anterior em disco — e a contagem seguinte
  // veria uma sequência maior do que a que o vídeo novo produziu, misturando
  // dois vídeos na mesma abertura.
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  process.stdout.write(`${set.dir}: extraindo… `);
  try {
    run("ffmpeg", [
      "-hide_banner",
      "-loglevel", "error",
      "-i", video,
      "-an",
      "-vf", `fps=${rate},scale=${set.width}:-2:flags=lanczos`,
      "-vsync", "0",
      "-c:v", "libwebp",
      "-quality", String(set.quality),
      "-compression_level", "6",
      "-preset", "photo",
      join(dir, "%04d.webp"),
    ]);
  } catch (err) {
    console.error("\nffmpeg falhou:\n" + String(err.stderr || err.message));
    process.exit(1);
  }

  const files = readdirSync(dir).filter((f) => f.endsWith(".webp")).sort();
  const bytes = files.reduce((sum, f) => sum + statSync(join(dir, f)).size, 0);
  counts.push(files.length);
  const mb = (bytes / 1024 / 1024).toFixed(2);
  const each = files.length ? Math.round(bytes / files.length / 1024) : 0;
  console.log(`${files.length} quadros · ${mb} MB · ~${each} KB cada`);
}

/* ─────────────────────── a conferência e o registro ──────────────────────── */

const [wide, narrow] = counts;

// ⚠️ OS DOIS CONJUNTOS PRECISAM TER O MESMO NÚMERO. O site usa UM índice para
// os dois — se divergirem, o celular e o monitor mostrariam pontos diferentes
// do vídeo na mesma posição de rolagem, e o quadro final de um deles nunca
// apareceria. Divergência aqui é sempre erro de extração, não escolha.
if (wide !== narrow) {
  console.error(`\nERRO: os conjuntos saíram com contagens diferentes (${wide} × ${narrow}).`);
  console.error("Não gravei o número no código — rode de novo antes de publicar.");
  process.exit(1);
}

const count = wide;
if (!count) {
  console.error("\nERRO: nenhum quadro foi gerado.");
  process.exit(1);
}

console.log(`\ntotal: ${count} quadros por conjunto`);

if (!write) {
  console.log(`\n--no-write: ajuste à mão em content/frames.ts → count: ${count} as number,`);
  process.exit(0);
}

const src = readFileSync(CONTRACT, "utf8");

// ⚠️ SÃO DOIS NÚMEROS, E O SEGUNDO É O QUE NINGUÉM LEMBRA DE ATUALIZAR.
// `count` só decide a fluidez; `seconds` é a RÉGUA DAS DEIXAS — é por ele que
// "o texto troca aos 3,25s" vira posição de rolagem. Gravado um e esquecido o
// outro, a abertura fica bonita e o texto troca no lugar errado da imagem, sem
// erro nenhum aparecer.
const FIELDS = [
  { name: "count", pattern: /count:\s*\d+\s*as number,/, value: `count: ${count} as number,` },
  {
    name: "seconds",
    pattern: /seconds:\s*[\d.]+\s*as number,/,
    value: `seconds: ${Number(seconds.toFixed(2))} as number,`,
  },
];

let next = src;
for (const field of FIELDS) {
  if (!field.pattern.test(next)) {
    console.error(`\nERRO: não achei o campo \`${field.name}\` em ${CONTRACT}.`);
    console.error(`Ajuste à mão: ${field.value}`);
    process.exit(1);
  }
  next = next.replace(field.pattern, field.value);
}
writeFileSync(CONTRACT, next, "utf8");

console.log(`gravado em content/frames.ts → count: ${count} · seconds: ${seconds.toFixed(2)}`);

/* ⚠️ AS DEIXAS NÃO SÃO REESCRITAS — ELAS SÃO CONFERIDAS. Onde o texto troca é
   decisão editorial (o cliente pediu "aos 3,25s"), e um script não tem como
   adivinhá-la para um vídeo novo. O que ele PODE fazer é gritar quando a
   decisão antiga deixou de caber na duração nova — que é o único jeito de isso
   aparecer antes de alguém abrir a home. */
const cuesSrc = (src.match(/export const ACT_CUES: number\[\] = \[([^\]]*)\]/) || [])[1];
if (cuesSrc) {
  const cues = cuesSrc.split(",").map((s) => Number(s.trim())).filter((n) => Number.isFinite(n));
  const fora = cues.filter((t) => t >= seconds);
  if (fora.length) {
    console.warn(
      `\n⚠️  ATENÇÃO: ${fora.length} deixa(s) de ACT_CUES caem fora do vídeo novo ` +
        `(${fora.join("s, ")}s ≥ ${seconds.toFixed(2)}s).`,
    );
    console.warn("   O motor vai DESCARTAR as deixas e repartir a rolagem em partes iguais.");
    console.warn("   Reveja ACT_CUES em content/frames.ts antes de publicar.");
  } else {
    console.log(`deixas conferidas: ${cues.join("s, ")}s — todas dentro do vídeo.`);
  }
}
console.log("\nA abertura já mostra o vídeo. Falta commitar os quadros:");
console.log("  git add public/sites/ecoluz/abertura components/site-templates/ecoluz/content/frames.ts");
