import { createRequire } from "module"

const require = createRequire(import.meta.url)

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
]

export default config
