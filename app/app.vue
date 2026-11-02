<template>
  <a class="skip-link" href="#main">К содержимому</a>
  <header class="site-header">
    <NuxtLink to="/" class="brand"
      ><span class="brand-mark" aria-hidden="true">▤</span> Личный
      блокнот</NuxtLink
    ><span class="header-caption">Для мыслей и дел</span>
  </header>
  <main id="main" tabindex="-1"><NuxtPage :page-key="$route.fullPath" /></main>
  <footer class="site-footer">Ваши заметки хранятся в этом браузере.</footer>
</template>
