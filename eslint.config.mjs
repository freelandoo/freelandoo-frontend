import { createRequire } from "module"

const require = createRequire(import.meta.url)

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...require("eslint-config-next/core-web-vitals"),
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]

export default config
