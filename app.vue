<template>
  <div class="transition-colors duration-200">
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<style>
/* Disable elastic overscroll bounce on iOS / macOS Safari */
html,
body {
  overscroll-behavior: none;
}

/* Safe area insets for notched / rounded-corner devices */
:root {
  --sat: env(safe-area-inset-top, 0px);
  --sar: env(safe-area-inset-right, 0px);
  --sab: env(safe-area-inset-bottom, 0px);
  --sal: env(safe-area-inset-left, 0px);
}

/* Smooth theme transitions */
* {
  transition-property: background-color, border-color, color, fill, stroke;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

/* CodeMirror manages its own transitions — don't interfere */
.cm-editor *,
.cm-editor {
  transition: none !important;
}

/* Prevent transition on page load */
.no-transition * {
  transition: none !important;
}

/* Disable text selection everywhere except inputs, textareas, and CodeMirror */
*,
*::before,
*::after {
  -webkit-user-select: none;
  user-select: none;
}

input,
textarea,
[contenteditable="true"],
.cm-editor,
.cm-editor * {
  -webkit-user-select: text;
  user-select: text;
}

/* Full-screen modals: respect safe areas on mobile */
@media (max-width: 767px) {
  .safe-area-modal {
    padding-top: var(--sat);
    padding-bottom: var(--sab);
    padding-left: var(--sal);
    padding-right: var(--sar);
  }
}

/* ─── Custom scrollbars (Electron / Webkit) ─── */

/* Firefox */
* {
  scrollbar-width: thin;
  scrollbar-color: #C1C0C0 transparent;
}
.dark * {
  scrollbar-color: #5B595C transparent;
}

/* Webkit / Blink (Electron, Chrome, Safari) */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: #C1C0C0;
  border-radius: 9999px;
  border: 2px solid transparent;
  background-clip: content-box;
}

::-webkit-scrollbar-thumb:hover {
  background-color: #939293;
}

::-webkit-scrollbar-corner {
  background: transparent;
}

.dark ::-webkit-scrollbar-thumb {
  background-color: #5B595C;
}

.dark ::-webkit-scrollbar-thumb:hover {
  background-color: #727072;
}
</style>
