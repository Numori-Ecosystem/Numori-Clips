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
import { getActiveDisplay, IS_WAYLAND, IS_GNOME, IS_KDE, positionWindowViaExtension, getExtensionStatus, installGnomeExtension, enableGnomeExtension, setShortcutViaExtension, toGtkAccelerator, needsNativeShortcuts } from './display-detect.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const STATIC_DIR = join(__dirname, '..', '.output', 'public')
const DEV_BASE = process.env.VITE_DEV_SERVER_URL?.replace(/\/?$/, '/')

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

function getWindowBgColor() {
  return currentTheme === 'dark' ? '#0a0a0f' : '#ffffff'
}

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
  // On GNOME Wayland, clipboard is monitored by the shell extension via
  // Meta.Selection owner-changed (like Pano). The D-Bus listener handles it.
  if (IS_GNOME && IS_WAYLAND) return

  // On macOS, Windows, X11 Linux, KDE: poll the clipboard from the main process.
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

// ── System tray ──────────────────────────────────────────────────────────

function createTray() {
  const iconPath = join(__dirname, '..', 'icons', '16x16.png')
  let trayIcon
  try {
    trayIcon = nativeImage.createFromPath(iconPath)
    if (process.platform === 'darwin') trayIcon = trayIcon.resize({ width: 16, height: 16 })
  } catch { trayIcon = nativeImage.createEmpty() }
  tray = new Tray(trayIcon)
  tray.setToolTip('Numori Clips')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show Numori Clips', click: () => showMainWindow() },
    { type: 'separator' },
    { label: 'Settings', click: () => openSettingsWindow() },
    { label: 'About', click: () => openAboutWindow() },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit() } },
  ]))
  tray.on('click', () => showMainWindow())
}

// ── Display detection & window bounds ────────────────────────────────────

const WINDOW_HEIGHT = 400

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
let cachedTargetBounds = null
let cachedTargetBoundsTime = 0

function getTargetBounds() {
  // Cache for 5 seconds to avoid repeated slow D-Bus calls
  const now = Date.now()
  if (cachedTargetBounds && now - cachedTargetBoundsTime < 5000) return cachedTargetBounds

  const result = getActiveDisplay()
  if (result?.workArea) cachedTargetBounds = boundsForWorkArea(result.workArea)
  else if (result?.display) cachedTargetBounds = boundsForWorkArea(result.display.workArea)
  else cachedTargetBounds = boundsForWorkArea(screen.getPrimaryDisplay().workArea)

  cachedTargetBoundsTime = now
  return cachedTargetBounds
}

/**
 * Position the window via extension on GNOME Wayland, or setBounds elsewhere.
 */
function applyWindowBounds(bounds) {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.setBounds(bounds)
  if (IS_GNOME && IS_WAYLAND) {
    positionWindowViaExtension('numori-clips', bounds.x, bounds.y, bounds.width, bounds.height)
    || positionWindowViaExtension('electron', bounds.x, bounds.y, bounds.width, bounds.height)
    || positionWindowViaExtension('Electron', bounds.x, bounds.y, bounds.width, bounds.height)
  }
}

// ── Main window ──────────────────────────────────────────────────────────

let mainWindowVisible = false
let mainWindowBounds = null

function dismissMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed() || !mainWindowVisible) return
  mainWindowVisible = false
  mainWindow.hide()
}

async function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) return // prevent duplicates

  const extStatus = (IS_GNOME && IS_WAYLAND) ? getExtensionStatus() : 'not-needed'
  const needsSetup = extStatus === 'not-installed' || extStatus === 'installed-needs-restart'

  mainWindowBounds = needsSetup ? null : getTargetBounds()

  const windowOpts = needsSetup
    ? {
        width: 450, height: 400, show: false,
        resizable: false, movable: true, fullscreenable: false,
        maximizable: false, minimizable: true,
        title: 'Numori Clips', frame: false, skipTaskbar: true, center: true, alwaysOnTop: true,
        backgroundColor: getWindowBgColor(),
        webPreferences: { preload: join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false },
      }
    : {
        ...mainWindowBounds, show: false,
        resizable: false, movable: false, fullscreenable: false,
        maximizable: false, minimizable: true,
        title: 'Numori Clips', frame: false, skipTaskbar: true, alwaysOnTop: true,
        backgroundColor: getWindowBgColor(),
        webPreferences: { preload: join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false },
      }

  mainWindow = new BrowserWindow(windowOpts)
  mainWindow.setMenuBarVisibility(false)
  mainWindowVisible = false

  mainWindow.on('close', (e) => { if (!app.isQuitting) { e.preventDefault(); dismissMainWindow() } })
  mainWindow.on('blur', () => { if (!app.isQuitting && mainWindow && !mainWindow.isDestroyed() && mainWindowVisible) dismissMainWindow() })
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } })
  mainWindow.webContents.on('before-input-event', (e, input) => {
    if ((input.key === 'r' && (input.control || input.meta)) || input.key === 'F5') e.preventDefault()
    if (input.key === 'Escape' && input.type === 'keyDown') dismissMainWindow()
  })

  mainWindow.loadURL(DEV_BASE || 'app://.')

  await new Promise((resolve) => {
    mainWindow.webContents.on('did-finish-load', () => {
      startClipboardPolling()
      resolve()
    })
  })

  if (needsSetup) {
    mainWindow.show()
    mainWindowVisible = true
  }
}

async function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    await createWindow()
  }
  if (mainWindowVisible) return

  // Always refresh bounds (different monitor, etc)
  cachedTargetBounds = null
  cachedTargetBoundsTime = 0
  mainWindowBounds = getTargetBounds()

  mainWindow.setBounds(mainWindowBounds)
  mainWindow.show()
  mainWindow.focus()
  mainWindowVisible = true

  // Reposition after show — compositor needs a moment on Wayland
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      applyWindowBounds(mainWindowBounds)
    }
  }, 50)
}

// ── Settings window ──────────────────────────────────────────────────────

function openSettingsWindow(section) {
  if (settingsWindow && !settingsWindow.isDestroyed()) { settingsWindow.focus(); return }
  settingsWindow = new BrowserWindow({
    width: 800, height: 600, minWidth: 480, minHeight: 400,
    title: 'Numori Clips — Settings', frame: false, titleBarStyle: 'hidden', backgroundColor: getWindowBgColor(),
    ...(process.platform === 'darwin' ? { trafficLightPosition: { x: -20, y: -20 } } : {}),
    webPreferences: { preload: join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false },
  })
  settingsWindow.setMenuBarVisibility(false)
  settingsWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } })
  const qs = section ? `?section=${section}` : ''
  settingsWindow.loadURL(DEV_BASE ? `${DEV_BASE}settings${qs}` : `app://./settings${qs}`)
  settingsWindow.on('closed', () => { settingsWindow = null })
}

// ── About window ─────────────────────────────────────────────────────────

function openAboutWindow() {
  if (aboutWindow && !aboutWindow.isDestroyed()) { aboutWindow.focus(); return }
  aboutWindow = new BrowserWindow({
    width: 500, height: 650, minWidth: 400, minHeight: 500,
    title: 'About Numori Clips', frame: false, titleBarStyle: 'hidden', backgroundColor: getWindowBgColor(),
    ...(process.platform === 'darwin' ? { trafficLightPosition: { x: -20, y: -20 } } : {}),
    webPreferences: { preload: join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false },
  })
  aboutWindow.setMenuBarVisibility(false)
  aboutWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } })
  aboutWindow.loadURL(DEV_BASE ? `${DEV_BASE}about` : 'app://./about')
  aboutWindow.on('closed', () => { aboutWindow = null })
}

// ── Auth window ──────────────────────────────────────────────────────────

function openAuthWindow() {
  if (authWindow && !authWindow.isDestroyed()) { authWindow.focus(); return }
  authWindow = new BrowserWindow({
    width: 450, height: 580, minWidth: 380, minHeight: 500, resizable: true,
    title: 'Sign In — Numori Clips', frame: false, titleBarStyle: 'hidden', backgroundColor: getWindowBgColor(),
    ...(process.platform === 'darwin' ? { trafficLightPosition: { x: -20, y: -20 } } : {}),
    webPreferences: { preload: join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false },
  })
  authWindow.setMenuBarVisibility(false)
  authWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } })
  authWindow.loadURL(DEV_BASE ? `${DEV_BASE}auth` : 'app://./auth')
  authWindow.on('closed', () => { authWindow = null })
}

// ── Wizard window ────────────────────────────────────────────────────────

function openWizardWindow() {
  if (wizardWindow && !wizardWindow.isDestroyed()) { wizardWindow.focus(); return }
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide()
  wizardWindow = new BrowserWindow({
    width: 550, height: 520, minWidth: 450, minHeight: 450, resizable: false,
    title: 'Welcome — Numori Clips', frame: false, titleBarStyle: 'hidden', backgroundColor: getWindowBgColor(),
    ...(process.platform === 'darwin' ? { trafficLightPosition: { x: -20, y: -20 } } : {}),
    webPreferences: { preload: join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false },
  })
  wizardWindow.setMenuBarVisibility(false)
  wizardWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } })
  wizardWindow.loadURL(DEV_BASE ? `${DEV_BASE}wizard` : 'app://./wizard')
  wizardWindow.on('closed', () => { wizardWindow = null; showMainWindow() })
}

// ── Global shortcuts ─────────────────────────────────────────────────────

let dbusShortcutMonitor = null

function togglePanelAction() {
  if (!mainWindow || mainWindow.isDestroyed()) { createWindow().then(() => showMainWindow()); return }
  if (mainWindowVisible) dismissMainWindow()
  else showMainWindow()
}

function toggleIncognitoAction() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send('tray-action', { action: 'toggle-incognito' })
}

function startDbusShortcutListener() {
  if (dbusShortcutMonitor || !IS_GNOME || !IS_WAYLAND) return
  try {
    const proc = spawn('gdbus', [
      'monitor', '--session', '--dest', 'app.numori.ClipsHelper', '--object-path', '/app/numori/ClipsHelper',
    ], { stdio: ['ignore', 'pipe', 'ignore'] })

    let buffer = ''
    proc.stdout.on('data', (data) => {
      buffer += data.toString()
      // Process complete lines
      const lines = buffer.split('\n')
      buffer = lines.pop() // keep incomplete line in buffer

      for (const line of lines) {
        if (line.includes('ShortcutActivated')) {
          if (line.includes('toggle-panel')) togglePanelAction()
          else if (line.includes('toggle-incognito')) toggleIncognitoAction()
        }

        if (line.includes('ClipboardChanged') && mainWindow && !mainWindow.isDestroyed()) {
          // gdbus uses single or double quotes depending on content:
          //   ('text', 'simple content')
          //   ('text', "content with 'quotes'")
          const typeMatch = line.match(/ClipboardChanged\s*\('(\w+)'/)
          if (typeMatch) {
            const type = typeMatch[1]
            // Extract content: everything between the second quote pair after the type
            const afterType = line.substring(line.indexOf(typeMatch[0]) + typeMatch[0].length)
            let content = null

            // Try single-quoted: , 'content')
            const sq = afterType.match(/,\s*'((?:[^'\\]|\\.)*)'\s*\)/)
            if (sq) {
              content = sq[1].replace(/\\n/g, '\n').replace(/\\'/g, "'")
            } else {
              // Try double-quoted: , "content")
              const dq = afterType.match(/,\s*"((?:[^"\\]|\\.)*)"\s*\)/)
              if (dq) {
                content = dq[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')
              }
            }

            if (content && content.trim()) {
              mainWindow.webContents.send('clipboard-new-content', { type, content: content.trim() })
            }
          }
        }
      }
    })
    proc.on('close', () => { dbusShortcutMonitor = null })
    dbusShortcutMonitor = proc
  } catch { /* ignore */ }
}

function stopDbusShortcutListener() {
  if (dbusShortcutMonitor) { dbusShortcutMonitor.kill(); dbusShortcutMonitor = null }
}

function registerGlobalShortcuts(togglePanel, toggleIncognito) {
  // Unregister old Electron shortcuts
  globalShortcut.unregisterAll()

  const panelAccel = togglePanel || 'Super+Shift+V'

  if (IS_GNOME && IS_WAYLAND) {
    // GNOME Wayland: use extension's GSettings + wm.addKeybinding (like ddterm)
    setShortcutViaExtension('toggle-panel', toGtkAccelerator(panelAccel))
    setShortcutViaExtension('toggle-incognito', toggleIncognito ? toGtkAccelerator(toggleIncognito) : '')
    startDbusShortcutListener()
  } else {
    // macOS, Windows, X11, KDE: use Electron's globalShortcut
    try { globalShortcut.register(panelAccel, togglePanelAction) } catch (e) { console.warn('[Numori Clips] Failed to register shortcut:', panelAccel, e) }
    if (toggleIncognito) {
      try { globalShortcut.register(toggleIncognito, toggleIncognitoAction) } catch (e) { console.warn('[Numori Clips] Failed to register shortcut:', toggleIncognito, e) }
    }
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
  // On GNOME Wayland, start D-Bus listener for clipboard + shortcuts
  if (IS_GNOME && IS_WAYLAND) startDbusShortcutListener()
})

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) { app.quit() }
else { app.on('second-instance', () => showMainWindow()) }

// ── IPC handlers ─────────────────────────────────────────────────────────

ipcMain.on('window-minimize', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize())
ipcMain.on('window-maximize', (e) => { const w = BrowserWindow.fromWebContents(e.sender); w?.isMaximized() ? w.unmaximize() : w?.maximize() })
ipcMain.on('window-close', (e) => BrowserWindow.fromWebContents(e.sender)?.close())
ipcMain.on('dismiss-main-window', () => dismissMainWindow())
ipcMain.on('window-set-fullscreen', (e, flag) => { const w = BrowserWindow.fromWebContents(e.sender); if (w) w.setFullScreen(!!flag) })
ipcMain.on('theme-changed', (_e, theme) => { currentTheme = theme })
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

app.on('will-quit', () => { stopClipboardPolling(); stopDbusShortcutListener(); globalShortcut.unregisterAll(); if (tray) { tray.destroy(); tray = null } })
app.on('window-all-closed', () => { if (process.platform !== 'darwin' && !tray) app.quit() })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); else showMainWindow() })
