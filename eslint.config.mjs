import { createRequire } from "module"
import { UI_IMPORT_LEGACY } from "./eslint.legacy-ui.mjs"

const require = createRequire(import.meta.url)

/**
 * Caminho do App Router não é glob: `app/(header-only)/order/[id]/page.tsx`
 * está cheio de `()` e `[]`, que o minimatch lê como extglob e classe de
 * caracteres. Sem escapar, a lista de legado não casa com nada e a regra
 * acende nos 117 arquivos de uma vez. A lista fica legível; o escape é aqui.
 */
const escapeGlob = (p) => p.replace(/[()[\]{}!*?+@]/g, (c) => `\\${c}`)

/**
 * O kit tabloide é obrigatório.
 *
 * Nada obrigava a usar `@/components/tabloide` — a regra do redesign existia
 * só no papel. Foi assim que 40 páginas (29 delas no admin) nasceram em
 * shadcn cinza: quando precisaram de uma tabela e o kit não tinha uma,
 * alcançaram `@/components/ui` e ninguém reclamou.
 *
 * Agora reclama. `components/ui/*` é infraestrutura do kit, não API de
 * página: quem precisa de uma peça, cria a peça em `components/tabloide/`.
 * A lista de legado em `eslint.legacy-ui.mjs` segura os 117 arquivos que já
 * estavam fora e só encolhe — uma onda de cada vez.
 */
const uiImportRule = {
  "no-restricted-imports": [
    "error",
    {
      patterns: [
        {
          group: ["@/components/ui/*", "@/components/ui"],
          message:
            "Página não fala com shadcn direto — importe de @/components/tabloide. " +
            "Se a peça não existe no kit, crie em components/tabloide/pieces.tsx " +
            "(veja docs/PLANO_TABLOIDE_TOTAL.md).",
        },
      ],
    },
  ],
}

/** @type {import("eslint").Linter.Config[]} */
const config = [
  // Testes e2e (Playwright) ficam fora do lint do app — dependência opcional,
  // instalada sob demanda (npm i + npm run test:e2e:install).
  { ignores: ["e2e/**", "playwright.config.ts", "scripts/**"] },
  ...require("eslint-config-next/core-web-vitals"),
  {
    rules: {
      // Regra nova do React 19 que penaliza padrões legítimos (initial fetch,
      // mount detection, intentional reset on deps change). Desligada
      // intencionalmente — o overhead de migrar pra useSyncExternalStore não
      // compensa em nenhum dos casos atuais.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "features/**/*.{ts,tsx}", "hooks/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    // O próprio kit e os primitivos shadcn precisam alcançar `components/ui`.
    ignores: ["components/ui/**", "components/tabloide/**", ...UI_IMPORT_LEGACY.map(escapeGlob)],
    rules: uiImportRule,
  },
]

export default config
