// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },

  // Workaround for https://github.com/nuxt/nuxt/issues/34812
  // Remove the @nuxt/nitro-server duplicate useAppConfig auto-import
  // (safe to remove once the upstream fix lands)
  hooks: {
    'nitro:config'(nitroConfig) {
      const imports = nitroConfig.imports
      if (imports && typeof imports === 'object' && 'imports' in imports && imports.imports) {
        imports.imports = imports.imports.filter(
          (i) =>
            !(
              (i as { name?: string })?.name === 'useAppConfig' &&
              String((i as { from?: string })?.from || '').includes('nitro-server')
            ),
        )
      }
    },
  },

  css: ['~/assets/css/code-highlight.css'],

  app: {
    head: {
      title: 'Numori Clips',
      htmlAttrs: { lang: 'en' },
      meta: [
        {
          name: 'viewport',
          content:
            'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
        },
        {
          name: 'description',
          content:
            'Free, open-source clipboard app with sync ability and truly multi-platform.',
        },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: 'Numori Clips' },
        { name: 'application-name', content: 'Numori Clips' },
        { name: 'theme-color', content: '#ffffff' },
        { name: 'og:title', content: 'Numori Clips' },
        {
          name: 'og:description',
          content:
            'Free, open-source clipboard app with sync ability and truly multi-platform.',
        },
        { name: 'og:type', content: 'website' },
        { name: 'twitter:card', content: 'summary' },
        { name: 'twitter:title', content: 'Numori Clips' },
        {
          name: 'twitter:description',
          content:
            'Free, open-source clipboard app with sync ability and truly multi-platform.',
        },
      ],
      link: [
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/favicon.ico' },
      ],
    },
  },
  modules: [
    '@vueuse/nuxt',
    '@nuxt/icon',
    '@nuxt/fonts',
    '@nuxt/eslint',
    '@nuxtjs/i18n',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/color-mode',
    '~/modules/version',
  ],
  icon: {
    // Ensure all icons are bundled into the app — no network requests at runtime.
    // This is critical for the mobile app which must work fully offline.
    provider: 'server',
    serverBundle: 'local',
    clientBundle: {
      scan: true,
      includeCustomCollections: true,
      icons: [
        'mdi:account',
        'mdi:account-circle-outline',
        'mdi:account-edit-outline',
        'mdi:account-outline',
        'mdi:alert-circle',
        'mdi:alert-circle-outline',
        'mdi:alert-outline',
        'mdi:arrow-left',
        'mdi:check',
        'mdi:check-circle',
        'mdi:chevron-down',
        'mdi:chevron-left',
        'mdi:chevron-right',
        'mdi:chevron-up',
        'mdi:clipboard-text-outline',
        'mdi:close',
        'mdi:close-circle',
        'mdi:code-tags',
        'mdi:cog-outline',
        'mdi:content-copy',
        'mdi:cursor-text',
        'mdi:delete-outline',
        'mdi:delete-sweep-outline',
        'mdi:devices',
        'mdi:download',
        'mdi:earth',
        'mdi:email',
        'mdi:email-alert-outline',
        'mdi:email-lock-outline',
        'mdi:email-outline',
        'mdi:emoticon-outline',
        'mdi:eye-off',
        'mdi:eye-off-outline',
        'mdi:eye-outline',
        'mdi:eye-lock-outline',
        'mdi:file-outline',
        'mdi:filter-outline',
        'mdi:fingerprint',
        'mdi:fingerprint-off',
        'mdi:format-font',
        'mdi:github',
        'mdi:help-circle-outline',
        'mdi:history',
        'mdi:image-outline',
        'mdi:information',
        'mdi:information-outline',
        'mdi:key-outline',
        'mdi:key-variant',
        'mdi:keyboard-outline',
        'mdi:link-variant',
        'mdi:loading',
        'mdi:lock',
        'mdi:lock-open-outline',
        'mdi:lock-outline',
        'mdi:login',
        'mdi:logout',
        'mdi:logout-variant',
        'mdi:magnify',
        'mdi:menu',
        'mdi:minus',
        'mdi:open-in-new',
        'mdi:page-layout-body',
        'mdi:palette',
        'mdi:palette-outline',
        'mdi:plus',
        'mdi:puzzle-outline',
        'mdi:refresh',
        'mdi:shield-account-outline',
        'mdi:shield-alert-outline',
        'mdi:shield-check-outline',
        'mdi:shield-lock-outline',
        'mdi:star',
        'mdi:star-outline',
        'mdi:text',
        'mdi:theme-light-dark',
        'mdi:translate',
        'mdi:tune-variant',
        'mdi:update',
        'mdi:volume-high',
        'mdi:weather-night',
        'mdi:weather-sunny',
        'mdi:web',
        'mdi:wifi-off',
      ],
    },
  },
  colorMode: {
    classSuffix: '',
    preference: 'system',
    fallback: 'light',
  },
  i18n: {
    defaultLocale: 'en-GB',
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
    },
    locales: [
      {
        code: 'en-GB',
        language: 'en-GB',
        name: 'English (UK)',
        dir: 'ltr',
        file: 'en-GB.json',
      },
    ],
  },
  nitro: {
    prerender: {
      routes: ['/'],
    },
    routeRules: {
      '/version.json': {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store',
        },
      },
    },
  },
  runtimeConfig: {
    appVersion: process.env.npm_package_version || '0.0.0',
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '',
      storeAndroid:
        process.env.NUXT_PUBLIC_STORE_ANDROID || '',
      storeIos:
        process.env.NUXT_PUBLIC_STORE_IOS || '',
    },
  },
  vite: {
    optimizeDeps: {
      include: [
        'tailwind-merge',
        'dexie',
        'highlight.js/lib/core',
        '@capacitor/app',
        '@capacitor/core',
        '@capacitor/status-bar',
        '@capacitor/filesystem',
        '@capacitor/share',
        '@capacitor/privacy-screen',
        '@capacitor/network',
      ],
    },
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.0.0'),
    },
    build: {
      sourcemap: false,
      rollupOptions: {
        onwarn(warning, warn) {
          if (warning.plugin === 'nuxt:module-preload-polyfill') return
          warn(warning)
        },
        output: {
          manualChunks(id) {
            // Split Capacitor plugins into their own chunk
            if (id.includes('@capacitor')) {
              return 'capacitor'
            }
          },
        },
      },
    },
  },
  ssr: false, // Pure client-side SPA
})
