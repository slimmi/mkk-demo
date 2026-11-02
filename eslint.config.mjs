import prettier from "eslint-config-prettier/flat";
import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt(
  {
    ignores: [
      ".agents/**",
      ".data/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  prettier,
);
