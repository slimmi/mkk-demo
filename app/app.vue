<template>
  <a class="skip-link" href="#main">К содержимому</a>
  <header class="site-header">
    <NuxtLink to="/" class="brand"
      ><span class="brand-mark" aria-hidden="true">▤</span> Личный блокнот
    </NuxtLink>
    <span class="header-caption">Для мыслей и дел</span>
  </header>
  <main id="main" tabindex="-1">
    <NuxtPage :page-key="$route.fullPath" />
  </main>
  <footer class="site-footer">Ваши заметки хранятся в этом браузере</footer>
</template>

<style scoped lang="scss">
@use "~/assets/scss/breakpoints";

.site-header {
  align-items: center;
  border-bottom: var(--border-default);
  display: flex;
  gap: var(--space-16);
  justify-content: space-between;
  margin: auto;
  max-width: var(--content-width);
  padding: max(var(--space-24), env(safe-area-inset-top))
    max(var(--space-24), env(safe-area-inset-right)) var(--space-24)
    max(var(--space-24), env(safe-area-inset-left));
}

.brand {
  align-items: center;
  color: var(--color-text);
  display: inline-flex;
  font-weight: 600;
  gap: var(--space-12);
  min-height: var(--control-size);
  text-decoration: none;
  transition: transform 0.1s ease;

  &:hover {
    text-decoration: none;
    transform: translate(0, -2px);
  }
}

.brand-mark {
  color: var(--color-accent);
  font-size: 32px;
}

.header-caption {
  color: var(--color-muted);
}

.site-footer {
  color: var(--color-muted);
  font-size: var(--font-size-small);
  padding: var(--space-24) max(var(--space-24), env(safe-area-inset-right))
    max(var(--space-32), env(safe-area-inset-bottom))
    max(var(--space-24), env(safe-area-inset-left));
  text-align: center;
}

.skip-link:focus {
  background: var(--color-surface);
  left: 12px;
  padding: var(--space-12);
  position: fixed;
  top: 12px;
  z-index: 5;
}

@media (width <= breakpoints.$mobile) {
  .header-caption {
    display: none;
  }
}
</style>
