export default defineNuxtConfig({
  compatibilityDate: "2026-11-03",
  ssr: false,
  modules: ["@pinia/nuxt", "@nuxt/eslint"],
  css: ["~/assets/scss/main.scss"],
  typescript: { strict: true, typeCheck: true },
  app: {
    head: {
      htmlAttrs: { lang: "ru" },
      title: "Заметки — личный блокнот",
      meta: [
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1, viewport-fit=cover",
        },
      ],
    },
  },
});
