<!--
  Standalone About page — rendered directly as window content (no modal).
  Used by the Electron about window.
-->
<template>
  <div class="h-screen flex flex-col bg-white dark:bg-gray-925">
    <!-- Title bar -->
    <div
      class="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 bg-gray-100 dark:bg-gray-900"
      :class="{ 'electron-drag': isElectron }"
    >
      <div class="flex items-center gap-2">
        <div
          v-if="isElectron"
          class="flex items-center gap-1.5 electron-no-drag group/traffic"
        >
          <button
            class="w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 focus:outline-none flex items-center justify-center"
            title="Close"
            @click="handleClose"
          >
            <Icon name="mdi:close" class="w-2.5 h-2.5 text-red-900 opacity-0 group-hover/traffic:opacity-100 transition-opacity" />
          </button>
          <button
            class="w-5 h-5 rounded-full bg-yellow-500 hover:bg-yellow-600 focus:outline-none flex items-center justify-center"
            title="Minimize"
            @click="handleMinimize"
          >
            <Icon name="mdi:minus" class="w-2.5 h-2.5 text-yellow-900 opacity-0 group-hover/traffic:opacity-100 transition-opacity" />
          </button>
        </div>
        <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-200 leading-none">About</h2>
      </div>
    </div>

    <!-- Body -->
    <div class="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-5 py-5 space-y-5">
      <!-- Hero -->
      <div class="flex flex-col items-center text-center space-y-3">
        <div class="w-16 h-16 rounded-2xl bg-gray-900 dark:bg-gray-800 flex items-center justify-center shadow-lg ring-1 ring-gray-200 dark:ring-gray-700">
          <img src="/favicon.svg" alt="Numori Clips" class="w-10 h-10" >
        </div>
        <div>
          <p class="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">Numori Clips</p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-mono">v{{ appVersion }}</p>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-500">
          Made with <span class="text-red-500">❤</span> and code from Manchester, England
        </p>
        <div class="flex items-center justify-center gap-3 pt-1">
          <a href="https://numori.app" target="_blank" rel="noopener noreferrer" class="group flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800/50 hover:border-primary-300 dark:hover:border-primary-700 transition-colors">
            <Icon name="mdi:web" class="w-4 h-4 text-primary-500 group-hover:text-primary-600 dark:group-hover:text-primary-300 transition-colors" />
            <span class="text-xs font-semibold text-primary-700 dark:text-primary-300">numori.app</span>
          </a>
          <a href="https://github.com/Numori-Ecosystem/Numori-Clips" target="_blank" rel="noopener noreferrer" class="group flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 hover:border-gray-400 dark:hover:border-gray-600 transition-colors">
            <Icon name="mdi:github" class="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors" />
            <span class="text-xs font-semibold text-gray-700 dark:text-gray-300">GitHub</span>
          </a>
        </div>
      </div>

      <!-- Check for updates -->
      <div class="flex flex-col items-center gap-1.5">
        <UiButton v-slot="{ spinning }" variant="outline" color="gray" size="sm" :loading="checking" loading-style="icon" @click="handleCheckUpdate">
          <Icon name="mdi:update" class="w-3.5 h-3.5" :class="{ 'animate-spin': spinning }" />
          Check for updates
        </UiButton>
      </div>

      <!-- Donate / Support -->
      <div class="rounded-xl bg-gradient-to-br from-pink-50 to-amber-50 dark:from-pink-900/10 dark:to-amber-900/10 border border-pink-100 dark:border-pink-900/30 overflow-hidden">
        <button class="w-full flex items-center justify-between p-4 text-left hover:bg-pink-100/40 dark:hover:bg-pink-900/20 transition-colors" @click="showDonate = !showDonate">
          <div class="flex items-center gap-2">
            <Icon name="mdi:heart-outline" class="w-4 h-4 text-pink-500 dark:text-pink-400" />
            <div>
              <p class="text-xs font-semibold text-gray-900 dark:text-gray-300 uppercase tracking-wider">Support the Project</p>
              <p class="text-[11px] text-gray-500 dark:text-gray-500 mt-0.5">Help keep Numori free and open-source</p>
            </div>
          </div>
          <Icon name="mdi:chevron-down" class="w-4 h-4 text-gray-400 transition-transform duration-200" :class="{ 'rotate-180': showDonate }" />
        </button>
        <Transition enter-active-class="transition-all duration-200 ease-out" enter-from-class="max-h-0 opacity-0" enter-to-class="max-h-[300px] opacity-100" leave-active-class="transition-all duration-150 ease-in" leave-from-class="max-h-[300px] opacity-100" leave-to-class="max-h-0 opacity-0">
          <div v-if="showDonate" class="overflow-hidden">
            <div class="px-4 pb-4 grid grid-cols-2 gap-2 border-t border-pink-100 dark:border-pink-900/30 pt-3">
              <a v-for="d in donateLinks" :key="d.label" :href="d.url" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-pink-300 dark:hover:border-pink-700 transition-colors">
                <Icon :name="d.icon" class="w-4 h-4 flex-shrink-0" :class="d.color" />
                <span class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ d.label }}</span>
              </a>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Author -->
      <div class="rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 px-4 py-3">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center ring-1 ring-primary-200/50 dark:ring-primary-700/30 flex-shrink-0">
            <Icon name="mdi:account" class="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">Erik Bjerke</p>
            <p class="text-[11px] text-gray-500 dark:text-gray-500">Creator & Maintainer</p>
          </div>
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <a href="https://erikbjerke.com" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 text-[11px] font-medium text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
              <Icon name="mdi:web" class="w-3 h-3" /> Website
            </a>
            <a href="mailto:contact@erikbjerke.com" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 text-[11px] font-medium text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
              <Icon name="mdi:email-outline" class="w-3 h-3" /> Email
            </a>
          </div>
        </div>
      </div>

      <!-- Contributors -->
      <div class="rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 space-y-3">
        <div class="flex items-center gap-2">
          <Icon name="mdi:account-group-outline" class="w-4 h-4 text-gray-400" />
          <p class="text-xs font-semibold text-gray-900 dark:text-gray-300 uppercase tracking-wider">Contributors</p>
        </div>
        <div class="space-y-2">
          <div v-for="contributor in contributors" :key="contributor.name" class="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
            <div class="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
              <Icon name="mdi:account" class="w-4 h-4 text-gray-400" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{{ contributor.name }}</p>
              <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                <a v-if="contributor.email" :href="`mailto:${contributor.email}`" class="inline-flex items-center gap-1 text-[11px] text-primary-600 dark:text-primary-400 hover:underline">
                  <Icon name="mdi:email-outline" class="w-3 h-3" /> {{ contributor.email }}
                </a>
                <a v-if="contributor.url" :href="contributor.url" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-[11px] text-primary-600 dark:text-primary-400 hover:underline">
                  <Icon name="mdi:web" class="w-3 h-3" /> {{ contributor.url.replace('https://', '') }}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- License -->
      <div class="rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 space-y-2">
        <div class="flex items-center gap-2">
          <Icon name="mdi:license" class="w-4 h-4 text-gray-400" />
          <p class="text-xs font-semibold text-gray-900 dark:text-gray-300 uppercase tracking-wider">License</p>
        </div>
        <p class="text-sm text-gray-700 dark:text-gray-400">GNU Affero General Public License v3.0 (AGPL-3.0)</p>
      </div>

      <!-- Third-party licenses -->
      <div class="rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 overflow-hidden">
        <button class="w-full flex items-center justify-between p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors" @click="showDeps = !showDeps">
          <div class="flex items-center gap-2">
            <Icon name="mdi:package-variant-closed" class="w-4 h-4 text-gray-400" />
            <div>
              <p class="text-xs font-semibold text-gray-900 dark:text-gray-300 uppercase tracking-wider">Open-Source Libraries</p>
              <p class="text-[11px] text-gray-500 dark:text-gray-500 mt-0.5">{{ dependencies.length }} packages used in this project</p>
            </div>
          </div>
          <Icon name="mdi:chevron-down" class="w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0" :class="{ 'rotate-180': showDeps }" />
        </button>
        <div v-if="showDeps" class="border-t border-gray-100 dark:border-gray-800">
          <div class="divide-y divide-gray-100 dark:divide-gray-800">
            <a v-for="dep in dependencies" :key="dep.name" :href="dep.url" target="_blank" rel="noopener noreferrer" class="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors group">
              <Icon name="mdi:package-variant" class="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 mt-0.5 flex-shrink-0 group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors" />
              <div class="flex-1 min-w-0">
                <div class="flex items-baseline gap-2">
                  <span class="text-xs font-medium text-gray-900 dark:text-gray-200 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">{{ dep.name }}</span>
                  <span class="text-[10px] text-gray-400 dark:text-gray-600 flex-shrink-0">{{ dep.license }}</span>
                </div>
                <p class="text-[11px] text-gray-500 dark:text-gray-500 leading-snug mt-0.5">{{ dep.description }}</p>
              </div>
              <Icon name="mdi:open-in-new" class="w-3 h-3 text-gray-300 dark:text-gray-600 mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          </div>
        </div>
      </div>
    </div>

    <ToastNotification :toasts="toast.toasts.value" />
  </div>
</template>

<script setup>
defineProps({
  checkForUpdate: { type: Function, default: null },
})

const { isElectron } = usePlatform()
const toast = useToast()

const handleClose = () => globalThis.window?.electronAPI?.close()
const handleMinimize = () => globalThis.window?.electronAPI?.minimize()
const appVersion = __APP_VERSION__
const checking = ref(false)
const showDeps = ref(false)
const showDonate = ref(false)

const donateLinks = [
  { label: 'Ko-fi', icon: 'mdi:coffee-outline', url: 'https://ko-fi.com/numori', color: 'text-sky-500' },
  { label: 'Patreon', icon: 'mdi:patreon', url: 'https://patreon.com/numori', color: 'text-orange-500' },
  { label: 'PayPal', icon: 'mdi:hand-coin-outline', url: 'https://paypal.me/numori', color: 'text-blue-600' },
  { label: 'GitHub Sponsors', icon: 'mdi:github', url: 'https://github.com/sponsors/numori', color: 'text-pink-500' },
  { label: 'Donorbox', icon: 'mdi:gift-outline', url: 'https://donorbox.org/numori', color: 'text-teal-500' },
  { label: 'Liberapay', icon: 'mdi:currency-eur', url: 'https://liberapay.com/numori', color: 'text-yellow-500' },
]

const contributors = [
  { name: 'Yaiza Wadhwani Valderas', email: 'yaizawv@proton.me' },
  { name: 'TheProcedural Software Ltd', email: 'contact@theprocedural.com', url: 'https://theprocedural.com' },
]

const dependencies = [
  { name: 'Nuxt', url: 'https://nuxt.com', license: 'MIT', description: 'Full-stack Vue framework with SSR, routing, and modules' },
  { name: 'Vue', url: 'https://vuejs.org', license: 'MIT', description: 'Progressive JavaScript framework for building user interfaces' },
  { name: 'Vue Router', url: 'https://router.vuejs.org', license: 'MIT', description: 'Official client-side router for Vue.js applications' },
  { name: '@nuxt/fonts', url: 'https://fonts.nuxt.com', license: 'MIT', description: 'Automatic font optimization and loading for Nuxt' },
  { name: '@nuxt/icon', url: 'https://nuxt.com/modules/icon', license: 'MIT', description: 'Icon component powered by Iconify with 200k+ icons' },
  { name: '@nuxtjs/color-mode', url: 'https://color-mode.nuxtjs.org', license: 'MIT', description: 'Dark and light mode with auto-detection' },
  { name: '@nuxtjs/tailwindcss', url: 'https://tailwindcss.nuxtjs.org', license: 'MIT', description: 'Tailwind CSS integration for Nuxt' },
  { name: '@tailwindcss/typography', url: 'https://tailwindcss.com/docs/typography-plugin', license: 'MIT', description: 'Beautiful typographic defaults for HTML content' },
  { name: '@vueuse/core', url: 'https://vueuse.org', license: 'MIT', description: 'Collection of essential Vue composition utilities' },
  { name: '@nuxtjs/i18n', url: 'https://i18n.nuxtjs.org', license: 'MIT', description: 'Internationalization and localization module for Nuxt' },
  { name: 'Capacitor', url: 'https://capacitorjs.com', license: 'MIT', description: 'Cross-platform native runtime for web apps on iOS, Android, and desktop' },
  { name: 'Electron', url: 'https://www.electronjs.org', license: 'MIT', description: 'Build cross-platform desktop apps with JavaScript, HTML, and CSS' },
  { name: 'electron-builder', url: 'https://www.electron.build', license: 'MIT', description: 'Complete solution to package and build Electron apps for distribution' },
  { name: 'Dexie.js', url: 'https://dexie.org', license: 'Apache-2.0', description: 'Minimalistic IndexedDB wrapper with a friendly API' },
  { name: 'bcryptjs', url: 'https://github.com/dcodeIO/bcrypt.js', license: 'MIT', description: 'Pure JavaScript bcrypt password hashing' },
  { name: 'pg (node-postgres)', url: 'https://node-postgres.com', license: 'MIT', description: 'Non-blocking PostgreSQL client for Node.js' },
  { name: 'Vitest', url: 'https://vitest.dev', license: 'MIT', description: 'Blazing fast unit test framework powered by Vite' },
  { name: 'tailwind-merge', url: 'https://github.com/dcastil/tailwind-merge', license: 'MIT', description: 'Merge Tailwind CSS classes without style conflicts' },
  { name: 'Nodemailer', url: 'https://nodemailer.com', license: 'MIT', description: 'Send emails from Node.js with SMTP and other transports' },
]

const handleCheckUpdate = async () => {
  checking.value = true
  // TODO: wire up actual update check
  setTimeout(() => {
    checking.value = false
    toast.show("You're up to date", { type: 'success', icon: 'mdi:check-circle-outline' })
  }, 1500)
}
</script>

<style scoped>
.electron-drag {
  -webkit-app-region: drag;
}
.electron-no-drag,
.electron-drag :deep(button),
.electron-drag :deep(a),
.electron-drag :deep(input) {
  -webkit-app-region: no-drag;
}
</style>
