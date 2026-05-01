import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  protocol,
  net,
  Menu,
  Tray,
  clipboard,
  nativeImage,
  globalShortcut,
  screen,
} from 'electron'
import { join, normalize } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawn } from 'node:child_process'
import { getActiveDisplay, IS_WAYLAND, IS_GNOME, IS_KDE, positionWindowViaExtension, getExtensionStatus, installGnomeExtension, enableGnomeExtension, grabShortcutViaExtension, ungrabAllShortcutsViaExtension, toGtkAccelerator, needsNativeShortcuts, registerKdeShortcut } from './display-detect.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const STATIC_DIR = join(__dirname, '..', '.output', 'public')

// ── State ────────────────────────────────────────────────────────────────
let mainWindow = null
let settingsWindow = null
let aboutWindow = null
let authWindow = null
let wizardWindow = null
let tray = null
let clipboardPollInterval = null
let lastClipboardText = ''
let lastClipboardImageHash = ''
let incognitoMode = false
let currentTheme = 'light'

protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
}])

// ── Clipboard polling ────────────────────────────────────────────────────

function simpleHash(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return hash.toString(36)
}

function startClipboardPolling() {
  lastClipboardText = clipboard.readText() || ''
  const img = clipboard.readImage()
  if (img && !img.isEmpty()) lastClipboardImageHash = simpleHash(img.toDataURL())

  clipboardPollInterval = setInterval(() => {
    if (incognitoMode || !mainWindow || mainWindow.isDestroyed()) return
    try {
      const img = clipboard.readImage()
      if (img && !img.isEmpty()) {
        const dataUrl = img.toDataURL()
        const imgHash = simpleHash(dataUrl)
        if (imgHash !== lastClipboardImageHash) {
          lastClipboardImageHash = imgHash
          lastClipboardText = ''
          mainWindow.webContents.send('clipboard-new-content', { type: 'image', content: dataUrl })
          return
        }
      }
      const text = clipboard.readText()
      if (text && text !== lastClipboardText) {
        lastClipboardText = text
        const ci = clipboard.readImage()
        if (ci && !ci.isEmpty()) lastClipboardImageHash = simpleHash(ci.toDataURL())
        mainWindow.webContents.send('clipboard-new-content', { type: 'text', content: text })
      }
    } catch { /* transient clipboard error */ }
  }, 500)
}

function stopClipboardPolling() {
  if (clipboardPollInterval) { clearInterval(clipboardPollInterval); clipboardPollInterval = null }
}

// ── Theme ────────────────────────────────────────────────────────────────

function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark'
  for (const win of [mainWindow, settingsWindow]) {
    if (win && !win.isDestroyed()) win.webContents.send('tray-action', { action: 'theme-changed', value: currentTheme })
  }
  rebuildTrayMenu()
}

// ── System tray ──────────────────────────────────────────────────────────

function rebuildTrayMenu() {
  if (!tray) return
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show Numori Clips', click: () => showMainWindow() },
    { type: 'separator' },
    { label: 'Incognito Mode', type: 'checkbox', checked: incognitoMode, click: (m) => {
      incognitoMode = m.checked
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('tray-action', { action: 'incognito-toggled', value: incognitoMode })
    }},
    { type: 'separator' },
    { label: currentTheme === 'dark' ? 'Theme: Dark' : 'Theme: Light', click: () => toggleTheme() },
    { type: 'separator' },
    { label: 'Settings', click: () => openSettingsWindow() },
    { label: 'About', click: () => openAboutWindow() },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit() } },
  ]))
}

function createTray() {
  const iconPath = join(__dirname, '..', 'icons', '16x16.png')
  let trayIcon
  try {
    trayIcon = nativeImage.createFromPath(iconPath)
    if (process.platform === 'darwin') trayIcon = trayIcon.resize({ width: 16, height: 16 })
  } catch { trayIcon = nativeImage.createEmpty() }
  tray = new Tray(trayIcon)
  tray.setToolTip('Numori Clips')
  rebuildTrayMenu()
  tray.on('click', () => showMainWindow())
}

// ── Display detection & window bounds ────────────────────────────────────

const WINDOW_HEIGHT = 480

function boundsForWorkArea(wa) {
  return { x: wa.x, y: wa.y + wa.height - WINDOW_HEIGHT, width: wa.width, height: WINDOW_HEIGHT }
}

/**
 * Get the target bounds for the main window.
 *
 * 1. GNOME extension → work area of cursor's monitor
 * 2. KDE Wayland → cursor position via KWin scripting
 * 3. Electron cursor API (macOS, Windows, X11)
 * 4. Fallback: primary display
 */
function getTargetBounds() {
  const result = getActiveDisplay()
  if (result?.workArea) return boundsForWorkArea(result.workArea)
  if (result?.display) return boundsForWorkArea(result.display.workArea)
  return boundsForWorkArea(screen.getPrimaryDisplay().workArea)
}

/**
 * Position the main window at the bottom of the target display.
 * On GNOME Wayland, Electron's setBounds is ignored by the compositor,
 * so we use the GNOME extension's PositionWindow D-Bus method which calls
 * Mutter's move_resize_frame internally.
 */
function applyWindowBounds(bounds) {
  if (!mainWindow || mainWindow.isDestroyed()) return

  // Try Electron's setBounds first (works on macOS, Windows, X11)
  mainWindow.setBounds(bounds)

  // On GNOME Wayland, setBounds is ignored — use the extension
  if (IS_WAYLAND) {
    setTimeout(() => {
      // Try app name first, then 'electron' (dev mode)
      const positioned = positionWindowViaExtension('numori-clips', bounds.x, bounds.y, bounds.width, bounds.height)
        || positionWindowViaExtension('electron', bounds.x, bounds.y, bounds.width, bounds.height)
        || positionWindowViaExtension('Electron', bounds.x, bounds.y, bounds.width, bounds.height)
      if (!positioned) {
        console.warn('[Numori Clips] Could not position window via GNOME extension')
      }
    }, 200)
  }
}

// ── Main window ──────────────────────────────────────────────────────────

async function createWindow() {
  const bounds = getTargetBounds()
  console.log('[Numori Clips] createWindow bounds:', JSON.stringify(bounds))

  mainWindow = new BrowserWindow({
    ...bounds,
    resizable: false, movable: false, fullscreenable: false,
    maximizable: false, minimizable: true,
    title: 'Numori Clips', frame: false, skipTaskbar: false,
    webPreferences: { preload: join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false },
  })
  applyWindowBounds(bounds)
  mainWindow.setMenuBarVisibility(false)

  mainWindow.on('close', (e) => { if (!app.isQuitting) { e.preventDefault(); mainWindow.hide() } })
  mainWindow.on('blur', () => { if (!app.isQuitting && mainWindow && !mainWindow.isDestroyed()) mainWindow.hide() })
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } })
  mainWindow.webContents.on('before-input-event', (e, input) => {
    if ((input.key === 'r' && (input.control || input.meta)) || input.key === 'F5') e.preventDefault()
  })

  mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL || 'app://.')
  mainWindow.webContents.on('did-finish-load', () => startClipboardPolling())
}

async function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) { await createWindow(); return }
  const bounds = getTargetBounds()
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
  applyWindowBounds(bounds)
}

// ── Settings window ──────────────────────────────────────────────────────

function openSettingsWindow(section) {
  if (settingsWindow && !settingsWindow.isDestroyed()) { settingsWindow.focus(); return }
  settingsWindow = new BrowserWindow({
    width: 800, height: 600, minWidth: 480, minHeight: 400,
    title: 'Numori Clips — Settings', frame: false, titleBarStyle: 'hidden',
    ...(process.platform === 'darwin' ? { trafficLightPosition: { x: -20, y: -20 } } : {}),
    webPreferences: { preload: join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false },
  })
  settingsWindow.setMenuBarVisibility(false)
  settingsWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } })
  const qs = section ? `&section=${section}` : ''
  settingsWindow.loadURL(process.env.VITE_DEV_SERVER_URL ? `${process.env.VITE_DEV_SERVER_URL}?window=settings${qs}` : `app://./?window=settings${qs}`)
  settingsWindow.on('closed', () => { settingsWindow = null })
}

// ── About window ─────────────────────────────────────────────────────────

function openAboutWindow() {
  if (aboutWindow && !aboutWindow.isDestroyed()) { aboutWindow.focus(); return }
  aboutWindow = new BrowserWindow({
    width: 500, height: 650, minWidth: 400, minHeight: 500,
    title: 'About Numori Clips', frame: false, titleBarStyle: 'hidden',
    ...(process.platform === 'darwin' ? { trafficLightPosition: { x: -20, y: -20 } } : {}),
    webPreferences: { preload: join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false },
  })
  aboutWindow.setMenuBarVisibility(false)
  aboutWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } })
  aboutWindow.loadURL(process.env.VITE_DEV_SERVER_URL ? `${process.env.VITE_DEV_SERVER_URL}?window=about` : 'app://./?window=about')
  aboutWindow.on('closed', () => { aboutWindow = null })
}

// ── Auth window ──────────────────────────────────────────────────────────

function openAuthWindow() {
  if (authWindow && !authWindow.isDestroyed()) { authWindow.focus(); return }
  authWindow = new BrowserWindow({
    width: 450, height: 580, minWidth: 380, minHeight: 500, resizable: true,
    title: 'Sign In — Numori Clips', frame: false, titleBarStyle: 'hidden',
    ...(process.platform === 'darwin' ? { trafficLightPosition: { x: -20, y: -20 } } : {}),
    webPreferences: { preload: join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false },
  })
  authWindow.setMenuBarVisibility(false)
  authWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } })
  authWindow.loadURL(process.env.VITE_DEV_SERVER_URL ? `${process.env.VITE_DEV_SERVER_URL}?window=auth` : 'app://./?window=auth')
  authWindow.on('closed', () => { authWindow = null })
}

// ── Wizard window ────────────────────────────────────────────────────────

function openWizardWindow() {
  if (wizardWindow && !wizardWindow.isDestroyed()) { wizardWindow.focus(); return }
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide()
  wizardWindow = new BrowserWindow({
    width: 550, height: 520, minWidth: 450, minHeight: 450, resizable: false,
    title: 'Welcome — Numori Clips', frame: false, titleBarStyle: 'hidden',
    ...(process.platform === 'darwin' ? { trafficLightPosition: { x: -20, y: -20 } } : {}),
    webPreferences: { preload: join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false },
  })
  wizardWindow.setMenuBarVisibility(false)
  wizardWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } })
  wizardWindow.loadURL(process.env.VITE_DEV_SERVER_URL ? `${process.env.VITE_DEV_SERVER_URL}?window=wizard` : 'app://./?window=wizard')
  wizardWindow.on('closed', () => { wizardWindow = null; showMainWindow() })
}

// ── Global shortcuts ─────────────────────────────────────────────────────

const registeredShortcuts = new Map()
let dbusShortcutMonitor = null

function togglePanelAction() {
  if (!mainWindow || mainWindow.isDestroyed()) { createWindow(); return }
  if (mainWindow.isVisible() && mainWindow.isFocused()) mainWindow.hide()
  else { showMainWindow(); mainWindow.webContents.send('tray-action', { action: 'toggle-panel' }) }
}

function toggleIncognitoAction() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send('tray-action', { action: 'toggle-incognito' })
}

function unregisterAllCustomShortcuts() {
  for (const accel of registeredShortcuts.keys()) {
    try { globalShortcut.unregister(accel) } catch { /* ignore */ }
  }
  registeredShortcuts.clear()
  // Also ungrab from GNOME extension
  ungrabAllShortcutsViaExtension()
}

function registerShortcutElectron(accelerator, callback) {
  if (!accelerator) return false
  try {
    const electronAccel = accelerator.replace(/Super/g, 'Super')
    globalShortcut.register(electronAccel, callback)
    registeredShortcuts.set(electronAccel, callback)
    return true
  } catch {
    return false
  }
}

function registerShortcutGnome(accelerator, name) {
  if (!accelerator) return false
  const gtkAccel = toGtkAccelerator(accelerator)
  if (!gtkAccel) return false
  return grabShortcutViaExtension(gtkAccel, name)
}

function startDbusShortcutListener() {
  if (dbusShortcutMonitor) return
  try {
    // Use gdbus monitor to listen for ShortcutActivated signals
    const proc = spawn('gdbus', [
      'monitor', '--session',
      '--dest', 'app.numori.ClipsHelper',
      '--object-path', '/app/numori/ClipsHelper',
    ], { stdio: ['ignore', 'pipe', 'ignore'] })

    proc.stdout.on('data', (data) => {
      const line = data.toString()
      // Signal format: /app/numori/ClipsHelper: app.numori.ClipsHelper.ShortcutActivated ('toggle-panel',)
      if (line.includes('ShortcutActivated')) {
        if (line.includes('toggle-panel')) togglePanelAction()
        else if (line.includes('toggle-incognito')) toggleIncognitoAction()
      }
    })

    proc.on('close', () => { dbusShortcutMonitor = null })
    dbusShortcutMonitor = proc
  } catch {
    console.warn('[Numori Clips] Failed to start D-Bus shortcut listener')
  }
}

function stopDbusShortcutListener() {
  if (dbusShortcutMonitor) {
    dbusShortcutMonitor.kill()
    dbusShortcutMonitor = null
  }
}

function registerGlobalShortcuts(togglePanel, toggleIncognito) {
  unregisterAllCustomShortcuts()

  const panelAccel = togglePanel || 'Super+Shift+V'

  if (IS_GNOME && IS_WAYLAND) {
    // GNOME Wayland: use our shell extension's grab_accelerator
    registerShortcutGnome(panelAccel, 'toggle-panel')
    if (toggleIncognito) registerShortcutGnome(toggleIncognito, 'toggle-incognito')
    startDbusShortcutListener()
  } else if (IS_KDE && IS_WAYLAND) {
    // KDE Wayland: register via KGlobalAccel, listen via D-Bus
    // KDE shortcuts trigger D-Bus activation of the app, so we also
    // try Electron's globalShortcut as it partially works on some KDE versions
    registerKdeShortcut(panelAccel, 'toggle-panel')
    if (toggleIncognito) registerKdeShortcut(toggleIncognito, 'toggle-incognito')
    // Also try Electron native as a fallback (works on some KDE Wayland setups)
    registerShortcutElectron(panelAccel, togglePanelAction)
    if (toggleIncognito) registerShortcutElectron(toggleIncognito, toggleIncognitoAction)
  } else {
    // macOS, Windows, X11 Linux: Electron's globalShortcut works
    registerShortcutElectron(panelAccel, togglePanelAction)
    if (toggleIncognito) registerShortcutElectron(toggleIncognito, toggleIncognitoAction)
  }
}

// ── App lifecycle ────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  protocol.handle('app', (request) => {
    const url = new URL(request.url)
    let filePath = decodeURIComponent(url.pathname)
    if (process.platform === 'win32' && filePath.startsWith('/')) filePath = filePath.slice(1)
    if (filePath === '/' || filePath === '') filePath = '/index.html'
    const resolvedPath = normalize(join(STATIC_DIR, filePath))
    if (!resolvedPath.startsWith(STATIC_DIR)) return new Response('Forbidden', { status: 403 })
    const fileUrl = pathToFileURL(resolvedPath).href
    return net.fetch(fileUrl)
      .then((r) => r.ok ? r : net.fetch(pathToFileURL(join(STATIC_DIR, 'index.html')).href))
      .catch(() => net.fetch(pathToFileURL(join(STATIC_DIR, 'index.html')).href))
  })

  if (process.platform === 'darwin') {
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { role: 'appMenu' }, { role: 'editMenu' }, { role: 'windowMenu' }, { role: 'help', submenu: [] },
    ]))
  }

  createWindow()
  createTray()
  registerGlobalShortcuts() // defaults: Super+Shift+V for toggle panel
})

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) { app.quit() }
else { app.on('second-instance', () => showMainWindow()) }

// ── IPC handlers ─────────────────────────────────────────────────────────

ipcMain.on('window-minimize', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize())
ipcMain.on('window-maximize', (e) => { const w = BrowserWindow.fromWebContents(e.sender); w?.isMaximized() ? w.unmaximize() : w?.maximize() })
ipcMain.on('window-close', (e) => BrowserWindow.fromWebContents(e.sender)?.close())
ipcMain.on('window-set-fullscreen', (e, flag) => { const w = BrowserWindow.fromWebContents(e.sender); if (w) w.setFullScreen(!!flag) })
ipcMain.on('theme-changed', (_e, theme) => { currentTheme = theme; rebuildTrayMenu() })
ipcMain.on('open-settings-window', (_e, section) => openSettingsWindow(section || undefined))
ipcMain.on('open-about-window', () => openAboutWindow())
ipcMain.on('open-auth-window', () => openAuthWindow())
ipcMain.on('open-wizard-window', () => openWizardWindow())
ipcMain.on('wizard-complete', () => {
  if (wizardWindow && !wizardWindow.isDestroyed()) { wizardWindow.removeAllListeners('closed'); wizardWindow.close(); wizardWindow = null }
  showMainWindow()
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('tray-action', { action: 'wizard-completed' })
})
ipcMain.on('clipboard-write', (_e, { content, type }) => {
  try {
    if (type === 'image' && content.startsWith('data:image')) clipboard.writeImage(nativeImage.createFromDataURL(content))
    else clipboard.writeText(content)
    lastClipboardText = typeof content === 'string' && type !== 'image' ? content : ''
    if (type === 'image') lastClipboardImageHash = simpleHash(content)
  } catch (err) { console.error('[Numori Clips] Failed to write to clipboard:', err) }
})
ipcMain.on('set-incognito', (_e, enabled) => { incognitoMode = !!enabled })
ipcMain.on('update-shortcuts', (_e, { togglePanel, toggleIncognito }) => {
  registerGlobalShortcuts(togglePanel, toggleIncognito)
})
ipcMain.handle('get-extension-status', () => {
  const status = getExtensionStatus()
  // If the extension just became working (e.g. we re-enabled it), reposition the main window
  if (status === 'working' && mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
    const bounds = getTargetBounds()
    console.log('[Numori Clips] extension now working, repositioning:', JSON.stringify(bounds))
    applyWindowBounds(bounds)
  }
  return status
})
ipcMain.handle('install-gnome-extension', () => installGnomeExtension())
ipcMain.handle('enable-gnome-extension', () => enableGnomeExtension())
ipcMain.on('reposition-main-window', async () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const bounds = getTargetBounds()
    console.log('[Numori Clips] reposition-main-window bounds:', JSON.stringify(bounds))
    mainWindow.setBounds(bounds)
    // Also use the extension to force position on Wayland
    if (IS_WAYLAND) {
      setTimeout(() => {
        const positioned = positionWindowViaExtension('numori-clips', bounds.x, bounds.y, bounds.width, bounds.height)
          || positionWindowViaExtension('electron', bounds.x, bounds.y, bounds.width, bounds.height)
          || positionWindowViaExtension('Electron', bounds.x, bounds.y, bounds.width, bounds.height)
        console.log('[Numori Clips] reposition via extension:', positioned)
        if (!positioned) {
          // Retry after a bit more time
          setTimeout(() => {
            const retry = positionWindowViaExtension('numori-clips', bounds.x, bounds.y, bounds.width, bounds.height)
              || positionWindowViaExtension('electron', bounds.x, bounds.y, bounds.width, bounds.height)
              || positionWindowViaExtension('Electron', bounds.x, bounds.y, bounds.width, bounds.height)
            console.log('[Numori Clips] reposition retry:', retry)
          }, 500)
        }
      }, 300)
    }
  }
})

// ── Cleanup ──────────────────────────────────────────────────────────────

app.on('will-quit', () => { stopClipboardPolling(); stopDbusShortcutListener(); unregisterAllCustomShortcuts(); globalShortcut.unregisterAll(); if (tray) { tray.destroy(); tray = null } })
app.on('window-all-closed', () => { if (process.platform !== 'darwin' && !tray) app.quit() })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); else showMainWindow() })
