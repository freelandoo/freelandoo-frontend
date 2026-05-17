import { createRequire } from "module"

const require = createRequire(import.meta.url)

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...require("eslint-config-next/core-web-vitals"),
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]
