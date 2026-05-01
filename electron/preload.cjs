const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform, // 'darwin' | 'win32' | 'linux'
  isElectron: true,

  // ── Window controls ──────────────────────────────────────────────────
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  dismissMainWindow: () => ipcRenderer.send('dismiss-main-window'),
  setFullScreen: (flag) => ipcRenderer.send('window-set-fullscreen', flag),
  onFullScreenChange: (callback) =>
    ipcRenderer.on('window-fullscreen-changed', (_event, isFullScreen) => callback(isFullScreen)),

  // ── Settings window ──────────────────────────────────────────────────
  openSettingsWindow: (section) => ipcRenderer.send('open-settings-window', section),

  // ── About window ─────────────────────────────────────────────────────
  openAboutWindow: () => ipcRenderer.send('open-about-window'),

  // ── Auth window ────────────────────────────────────────────────────
  openAuthWindow: () => ipcRenderer.send('open-auth-window'),

  // ── Verify Email window ────────────────────────────────────────────
  openVerifyEmailWindow: () => ipcRenderer.send('open-verify-email-window'),

  // ── Wizard window ──────────────────────────────────────────────────
  openWizardWindow: () => ipcRenderer.send('open-wizard-window'),
  wizardComplete: () => ipcRenderer.send('wizard-complete'),

  // ── Theme sync ───────────────────────────────────────────────────────
  notifyThemeChanged: (theme) => ipcRenderer.send('theme-changed', theme),

  // ── File handling ────────────────────────────────────────────────────
  signalReady: () => ipcRenderer.send('renderer-ready'),
  onOpenFile: (callback) => ipcRenderer.on('open-file', (_event, data) => callback(data)),

  // ── Clipboard ────────────────────────────────────────────────────────
  onClipboardContent: (callback) =>
    ipcRenderer.on('clipboard-new-content', (_event, data) => callback(data)),

  writeClipboard: (content, type) =>
    ipcRenderer.send('clipboard-write', { content, type }),

  readImageFile: (filePath) =>
    ipcRenderer.invoke('read-image-file', filePath),

  // ── Tray actions ─────────────────────────────────────────────────────
  onTrayAction: (callback) =>
    ipcRenderer.on('tray-action', (_event, action) => callback(action)),

  // ── Incognito mode ───────────────────────────────────────────────────
  setIncognito: (enabled) => ipcRenderer.send('set-incognito', enabled),

  // ── Ignored apps ───────────────────────────────────────────────────
  setIgnoredApps: (appNames) => ipcRenderer.send('set-ignored-apps', appNames),

  // ── Shortcuts ──────────────────────────────────────────────────────
  updateShortcuts: (shortcuts) => ipcRenderer.send('update-shortcuts', shortcuts),

  // ── GNOME extension ────────────────────────────────────────────────
  getExtensionStatus: () => ipcRenderer.invoke('get-extension-status'),
  installGnomeExtension: () => ipcRenderer.invoke('install-gnome-extension'),
  enableGnomeExtension: () => ipcRenderer.invoke('enable-gnome-extension'),
  repositionMainWindow: () => ipcRenderer.send('reposition-main-window'),
})
