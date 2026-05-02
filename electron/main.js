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
import { readFile } from 'node:fs/promises'
import {
  getActiveDisplay,
  IS_WAYLAND,
  IS_GNOME,
  positionWindowViaExtension,
  showWindowViaExtension,
  hideWindowViaExtension,
  getExtensionStatus,
  installGnomeExtension,
  enableGnomeExtension,
  setShortcutViaExtension,
  toGtkAccelerator,
} from './display-detect.js'

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
let ignoredAppNames = []

function getWindowBgColor() {
  return currentTheme === 'dark' ? '#0a0a0f' : '#ffffff'
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
  },
])

// ── Clipboard polling ────────────────────────────────────────────────────

function simpleHash(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return hash.toString(36)
}

/**
 * Detect the name of the currently focused application.
 *
 * - macOS: uses AppleScript to query the frontmost app name
 * - Linux (X11): uses xdotool to get the active window's WM_CLASS
 * - Linux (Wayland/GNOME): uses gdbus to query the extension
 * - Windows: uses powershell to get the foreground window process name
 *
 * Returns the app name string, or null if detection fails.
 */
function getActiveWindowName() {
  try {
    if (process.platform === 'darwin') {
      const result = require('node:child_process').execSync(
        'osascript -e \'tell application "System Events" to get name of first application process whose frontmost is true\'',
        { encoding: 'utf8', timeout: 1000, stdio: 'pipe' },
      )
      return result.trim() || null
    }
    if (process.platform === 'win32') {
      const result = require('node:child_process').execSync(
        'powershell -NoProfile -Command "(Get-Process | Where-Object {$_.MainWindowHandle -eq (Add-Type -MemberDefinition \'[DllImport(\\"user32.dll\\")] public static extern IntPtr GetForegroundWindow();\' -Name Win32 -Namespace Temp -PassThru)::GetForegroundWindow()}).ProcessName"',
        { encoding: 'utf8', timeout: 2000, stdio: 'pipe' },
      )
      return result.trim() || null
    }
    // Linux
    if (!IS_WAYLAND) {
      // X11: use xdotool
      const result = require('node:child_process').execSync(
        'xdotool getactivewindow getwindowclassname 2>/dev/null || xdotool getactivewindow getwindowname 2>/dev/null',
        { encoding: 'utf8', timeout: 1000, stdio: 'pipe' },
      )
      return result.trim() || null
    }
    // Wayland — limited; try reading from GNOME extension if available
    if (IS_GNOME) {
      try {
        const result = require('node:child_process').execSync(
          'gdbus call --session --dest org.gnome.Shell --object-path /org/gnome/Shell --method org.gnome.Shell.Eval "global.display.focus_window ? global.display.focus_window.get_wm_class() : \'\'"',
          { encoding: 'utf8', timeout: 1000, stdio: 'pipe' },
        )
        const match = result.match(/'([^']+)'/)
        if (match && match[1]) return match[1]
      } catch {
        /* extension not available */
      }
    }
  } catch {
    /* detection not available on this platform */
  }
  return null
}

/**
 * Check if the given app name matches any entry in the ignored apps list.
 * Uses case-insensitive substring matching.
 */
function isAppInIgnoredList(appName) {
  if (!appName || ignoredAppNames.length === 0) return false
  const lower = appName.toLowerCase()
  return ignoredAppNames.some((name) => lower.includes(name.toLowerCase()))
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
      // Check if the foreground app is in the ignored list
      const activeApp = getActiveWindowName()
      if (isAppInIgnoredList(activeApp)) return

      const img = clipboard.readImage()
      if (img && !img.isEmpty()) {
        const dataUrl = img.toDataURL()
        const imgHash = simpleHash(dataUrl)
        if (imgHash !== lastClipboardImageHash) {
          lastClipboardImageHash = imgHash
          lastClipboardText = ''
          mainWindow.webContents.send('clipboard-new-content', {
            type: 'image',
            content: dataUrl,
            sourceApp: activeApp,
          })
          return
        }
      }
      const text = clipboard.readText()
      if (text && text !== lastClipboardText) {
        lastClipboardText = text
        const ci = clipboard.readImage()
        if (ci && !ci.isEmpty()) lastClipboardImageHash = simpleHash(ci.toDataURL())
        mainWindow.webContents.send('clipboard-new-content', {
          type: 'text',
          content: text,
          sourceApp: activeApp,
        })
      }
    } catch {
      /* transient clipboard error */
    }
  }, 500)
}

function stopClipboardPolling() {
  if (clipboardPollInterval) {
    clearInterval(clipboardPollInterval)
    clipboardPollInterval = null
  }
}

// ── System tray ──────────────────────────────────────────────────────────

function createTray() {
  // In production builds, icons are in extraResources (resources/icons/) or
  // bundled alongside the app asar (icons/). Use process.resourcesPath for
  // packaged builds so the file is always reachable on disk — critical for
  // GNOME's AppIndicator/SNI which reads the icon via filesystem path.
  const iconPath = app.isPackaged
    ? join(process.resourcesPath, 'icons', '32x32.png')
    : join(__dirname, '..', 'icons', '32x32.png')
  let trayIcon
  try {
    trayIcon = nativeImage.createFromPath(iconPath)
    if (trayIcon.isEmpty()) throw new Error('Icon loaded but empty')
    if (process.platform === 'darwin') trayIcon = trayIcon.resize({ width: 16, height: 16 })
    else if (process.platform === 'linux') trayIcon = trayIcon.resize({ width: 24, height: 24 })
  } catch {
    trayIcon = nativeImage.createEmpty()
  }
  tray = new Tray(trayIcon)
  tray.setToolTip('Numori Clips')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Show Numori Clips', click: () => showMainWindow() },
      { type: 'separator' },
      { label: 'Settings', click: () => openSettingsWindow() },
      { label: 'About', click: () => openAboutWindow() },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.isQuitting = true
          app.quit()
        },
      },
    ]),
  )
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
    const title = mainWindow.getTitle() || 'Numori Clips'
    tryExtensionPosition(bounds, title)
  }
}

// ── Main window ──────────────────────────────────────────────────────────

let mainWindowVisible = false
let mainWindowBounds = null
let blurGraceUntil = 0

/** WM class candidates to try when talking to the GNOME extension. */
const WM_CLASS_CANDIDATES = ['numori-clips', 'electron', 'Electron']

function tryExtensionShow(bounds, title) {
  for (const wm of WM_CLASS_CANDIDATES) {
    if (showWindowViaExtension(wm, bounds.x, bounds.y, bounds.width, bounds.height, title))
      return true
  }
  return false
}

function tryExtensionHide(title) {
  for (const wm of WM_CLASS_CANDIDATES) {
    if (hideWindowViaExtension(wm, title)) return true
  }
  return false
}

function tryExtensionPosition(bounds, title) {
  for (const wm of WM_CLASS_CANDIDATES) {
    if (positionWindowViaExtension(wm, bounds.x, bounds.y, bounds.width, bounds.height, title))
      return true
  }
  return false
}

function dismissMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed() || !mainWindowVisible) return
  mainWindowVisible = false

  if (IS_GNOME && IS_WAYLAND) {
    const title = mainWindow.getTitle() || 'Numori Clips'
    if (tryExtensionHide(title)) {
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide()
      }, 200)
      return
    }
  }

  mainWindow.hide()
}

async function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) return // prevent duplicates

  const extStatus = IS_GNOME && IS_WAYLAND ? getExtensionStatus() : 'not-needed'
  const needsSetup = extStatus === 'not-installed' || extStatus === 'installed-needs-restart'

  mainWindowBounds = needsSetup ? null : getTargetBounds()

  const windowOpts = needsSetup
    ? {
        width: 450,
        height: 400,
        show: false,
        resizable: false,
        movable: true,
        fullscreenable: false,
        maximizable: false,
        minimizable: true,
        title: 'Numori Clips',
        frame: false,
        skipTaskbar: true,
        center: true,
        alwaysOnTop: true,
        backgroundColor: getWindowBgColor(),
        webPreferences: {
          preload: join(__dirname, 'preload.cjs'),
          contextIsolation: true,
          nodeIntegration: false,
        },
      }
    : {
        ...mainWindowBounds,
        show: false,
        resizable: false,
        movable: false,
        fullscreenable: false,
        maximizable: false,
        minimizable: true,
        title: 'Numori Clips',
        frame: false,
        skipTaskbar: true,
        alwaysOnTop: true,
        backgroundColor: getWindowBgColor(),
        webPreferences: {
          preload: join(__dirname, 'preload.cjs'),
          contextIsolation: true,
          nodeIntegration: false,
        },
      }

  mainWindow = new BrowserWindow(windowOpts)
  mainWindow.setMenuBarVisibility(false)
  mainWindowVisible = false

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault()
      dismissMainWindow()
    }
  })

  mainWindow.on('blur', () => {
    if (!app.isQuitting && mainWindow && !mainWindow.isDestroyed() && mainWindowVisible) {
      // Grace period after show — the extension animation can briefly lose focus
      if (Date.now() < blurGraceUntil) return
      dismissMainWindow()
    }
  })
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('before-input-event', (e, input) => {
    if ((input.key === 'r' && (input.control || input.meta)) || input.key === 'F5')
      e.preventDefault()
    if (input.key === 'Escape' && input.type === 'keyDown') dismissMainWindow()
  })

  mainWindow.loadURL(DEV_BASE ? `${DEV_BASE}clips` : 'app://localhost/clips')

  // Prevent Nuxt from overriding the window title — we need distinct titles for the GNOME extension
  mainWindow.on('page-title-updated', (e) => e.preventDefault())

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

  const title = mainWindow.getTitle() || 'Numori Clips'

  if (IS_GNOME && IS_WAYLAND) {
    // Pre-position the window off-screen before showing so GNOME doesn't flash it centered
    mainWindow.setBounds({
      ...mainWindowBounds,
      y: mainWindowBounds.y + mainWindowBounds.height + 100,
    })
    blurGraceUntil = Date.now() + 500
    mainWindow.show()
    mainWindow.focus()
    mainWindowVisible = true

    // Use the extension's ShowWindow to position + animate from within the compositor
    if (!tryExtensionShow(mainWindowBounds, title)) {
      // Extension failed — fall back to setBounds repositioning
      mainWindow.setBounds(mainWindowBounds)
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setBounds(mainWindowBounds)
          tryExtensionPosition(mainWindowBounds, title)
        }
      }, 50)
    }
  } else {
    // macOS, Windows, X11: setBounds works reliably
    mainWindow.setBounds(mainWindowBounds)
    mainWindow.show()
    mainWindow.focus()
    mainWindowVisible = true
  }
}

// ── Settings window ──────────────────────────────────────────────────────

function openSettingsWindow(section) {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    return
  }
  settingsWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 480,
    minHeight: 400,
    title: 'Numori Clips — Settings',
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: getWindowBgColor(),
    ...(process.platform === 'darwin' ? { trafficLightPosition: { x: -20, y: -20 } } : {}),
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  settingsWindow.setMenuBarVisibility(false)
  settingsWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
  settingsWindow.on('page-title-updated', (e) => e.preventDefault())
  const qs = section ? `?section=${section}` : ''
  settingsWindow.loadURL(DEV_BASE ? `${DEV_BASE}settings${qs}` : `app://localhost/settings${qs}`)
  settingsWindow.on('closed', () => {
    settingsWindow = null
  })
}

// ── About window ─────────────────────────────────────────────────────────

function openAboutWindow() {
  if (aboutWindow && !aboutWindow.isDestroyed()) {
    aboutWindow.focus()
    return
  }
  aboutWindow = new BrowserWindow({
    width: 500,
    height: 650,
    minWidth: 400,
    minHeight: 500,
    title: 'About Numori Clips',
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: getWindowBgColor(),
    ...(process.platform === 'darwin' ? { trafficLightPosition: { x: -20, y: -20 } } : {}),
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  aboutWindow.setMenuBarVisibility(false)
  aboutWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
  aboutWindow.on('page-title-updated', (e) => e.preventDefault())
  aboutWindow.loadURL(DEV_BASE ? `${DEV_BASE}about` : 'app://localhost/about')
  aboutWindow.on('closed', () => {
    aboutWindow = null
  })
}

// ── Auth window ──────────────────────────────────────────────────────────

function openAuthWindow() {
  if (authWindow && !authWindow.isDestroyed()) {
    authWindow.focus()
    return
  }
  authWindow = new BrowserWindow({
    width: 450,
    height: 580,
    minWidth: 380,
    minHeight: 500,
    resizable: true,
    title: 'Sign In — Numori Clips',
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: getWindowBgColor(),
    ...(process.platform === 'darwin' ? { trafficLightPosition: { x: -20, y: -20 } } : {}),
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  authWindow.setMenuBarVisibility(false)
  authWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
  authWindow.on('page-title-updated', (e) => e.preventDefault())
  authWindow.loadURL(DEV_BASE ? `${DEV_BASE}auth` : 'app://localhost/auth')
  authWindow.on('closed', () => {
    authWindow = null
  })
}

// ── Verify Email window ──────────────────────────────────────────────────

let verifyEmailWindow = null

function openVerifyEmailWindow() {
  if (verifyEmailWindow && !verifyEmailWindow.isDestroyed()) {
    verifyEmailWindow.focus()
    return
  }
  verifyEmailWindow = new BrowserWindow({
    width: 450,
    height: 480,
    minWidth: 380,
    minHeight: 400,
    resizable: true,
    title: 'Verify Email — Numori Clips',
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: getWindowBgColor(),
    ...(process.platform === 'darwin' ? { trafficLightPosition: { x: -20, y: -20 } } : {}),
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  verifyEmailWindow.setMenuBarVisibility(false)
  verifyEmailWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
  verifyEmailWindow.on('page-title-updated', (e) => e.preventDefault())
  verifyEmailWindow.loadURL(DEV_BASE ? `${DEV_BASE}verify-email` : 'app://localhost/verify-email')
  verifyEmailWindow.on('closed', () => {
    verifyEmailWindow = null
  })
}

// ── Wizard window ────────────────────────────────────────────────────────

function openWizardWindow() {
  if (wizardWindow && !wizardWindow.isDestroyed()) {
    wizardWindow.focus()
    return
  }
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide()
  wizardWindow = new BrowserWindow({
    width: 550,
    height: 520,
    minWidth: 450,
    minHeight: 450,
    resizable: false,
    title: 'Welcome — Numori Clips',
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: getWindowBgColor(),
    ...(process.platform === 'darwin' ? { trafficLightPosition: { x: -20, y: -20 } } : {}),
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  wizardWindow.setMenuBarVisibility(false)
  wizardWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
  wizardWindow.on('page-title-updated', (e) => e.preventDefault())
  wizardWindow.loadURL(DEV_BASE ? `${DEV_BASE}wizard` : 'app://localhost/wizard')
  wizardWindow.on('closed', () => {
    wizardWindow = null
    showMainWindow()
  })
}

// ── Global shortcuts ─────────────────────────────────────────────────────

let dbusShortcutMonitor = null

function togglePanelAction() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow().then(() => showMainWindow())
    return
  }
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
    const proc = spawn(
      'gdbus',
      [
        'monitor',
        '--session',
        '--dest',
        'app.numori.ClipsHelper',
        '--object-path',
        '/app/numori/ClipsHelper',
      ],
      { stdio: ['ignore', 'pipe', 'ignore'] },
    )

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
          const typeMatch = line.match(/ClipboardChanged\s*\(\s*'(\w+)'/)
          if (typeMatch) {
            const type = typeMatch[1]
            const afterTypeIdx = line.indexOf(typeMatch[0]) + typeMatch[0].length
            const rest = line.substring(afterTypeIdx)

            let content = null

            const quoteStart = rest.match(/,\s*(['"])/)
            if (quoteStart) {
              const q = quoteStart[1]
              const contentStart = rest.indexOf(quoteStart[0]) + quoteStart[0].length
              const tail = rest.substring(contentStart)
              const closingPattern = q === "'" ? /'\s*\)\s*$/ : /"\s*\)\s*$/
              const closingMatch = tail.match(closingPattern)
              if (closingMatch) {
                const raw = tail.substring(0, closingMatch.index)
                content = raw
                  .replace(/\\n/g, '\n')
                  .replace(q === "'" ? /\\'/g : /\\"/g, q)
                  .replace(/\\\\/g, '\\')
              }
            }

            if (content && content.trim()) {
              mainWindow.webContents.send('clipboard-new-content', {
                type,
                content: content.trim(),
              })
            }
          }
        }
      }
    })
    proc.on('close', () => {
      dbusShortcutMonitor = null
    })
    dbusShortcutMonitor = proc
  } catch {
    /* ignore */
  }
}

function stopDbusShortcutListener() {
  if (dbusShortcutMonitor) {
    dbusShortcutMonitor.kill()
    dbusShortcutMonitor = null
  }
}

function registerGlobalShortcuts(togglePanel, toggleIncognito) {
  // Unregister old Electron shortcuts
  globalShortcut.unregisterAll()

  const panelAccel = togglePanel || 'Super+Shift+V'

  if (IS_GNOME && IS_WAYLAND) {
    // GNOME Wayland: use extension's GSettings + wm.addKeybinding (like ddterm)
    setShortcutViaExtension('toggle-panel', toGtkAccelerator(panelAccel))
    setShortcutViaExtension(
      'toggle-incognito',
      toggleIncognito ? toGtkAccelerator(toggleIncognito) : '',
    )
    startDbusShortcutListener()
  } else {
    // macOS, Windows, X11, KDE: use Electron's globalShortcut
    try {
      globalShortcut.register(panelAccel, togglePanelAction)
    } catch (e) {
      console.warn('[Numori Clips] Failed to register shortcut:', panelAccel, e)
    }
    if (toggleIncognito) {
      try {
        globalShortcut.register(toggleIncognito, toggleIncognitoAction)
      } catch (e) {
        console.warn('[Numori Clips] Failed to register shortcut:', toggleIncognito, e)
      }
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

    // If the path has no file extension, try serving the directory's index.html
    // (nuxt generate creates e.g. clips/index.html for the /clips route)
    const hasExtension = /\.[^/]+$/.test(filePath)
    const resolvedPath = normalize(join(STATIC_DIR, filePath))
    if (!resolvedPath.startsWith(STATIC_DIR)) return new Response('Forbidden', { status: 403 })

    const indexPath = hasExtension ? null : normalize(join(STATIC_DIR, filePath, 'index.html'))
    const fallbackUrl = pathToFileURL(join(STATIC_DIR, 'index.html')).href

    if (indexPath) {
      // For extensionless paths (SPA routes), try the directory's index.html first
      return net
        .fetch(pathToFileURL(indexPath).href)
        .then((r) => (r.ok ? r : net.fetch(fallbackUrl)))
        .catch(() => net.fetch(fallbackUrl))
    }

    const fileUrl = pathToFileURL(resolvedPath).href
    return net
      .fetch(fileUrl)
      .then((r) => (r.ok ? r : net.fetch(fallbackUrl)))
      .catch(() => net.fetch(fallbackUrl))
  })

  if (process.platform === 'darwin') {
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        { role: 'appMenu' },
        { role: 'editMenu' },
        { role: 'windowMenu' },
        { role: 'help', submenu: [] },
      ]),
    )
  }

  createWindow()
  createTray()
  registerGlobalShortcuts() // defaults: Super+Shift+V for toggle panel
  // On GNOME Wayland, start D-Bus listener for clipboard + shortcuts
  if (IS_GNOME && IS_WAYLAND) startDbusShortcutListener()
})

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => showMainWindow())
}

// ── IPC handlers ─────────────────────────────────────────────────────────

ipcMain.on('window-minimize', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize())
ipcMain.on('window-maximize', (e) => {
  const w = BrowserWindow.fromWebContents(e.sender)
  w?.isMaximized() ? w.unmaximize() : w?.maximize()
})
ipcMain.on('window-close', (e) => BrowserWindow.fromWebContents(e.sender)?.close())
ipcMain.on('dismiss-main-window', () => dismissMainWindow())
ipcMain.on('window-set-fullscreen', (e, flag) => {
  const w = BrowserWindow.fromWebContents(e.sender)
  if (w) w.setFullScreen(!!flag)
})
ipcMain.on('theme-changed', (e, theme) => {
  currentTheme = theme
  // Broadcast the theme change to all open windows except the sender
  const senderContents = e.sender
  const allWindows = [
    mainWindow,
    settingsWindow,
    aboutWindow,
    authWindow,
    verifyEmailWindow,
    wizardWindow,
  ]
  for (const win of allWindows) {
    if (win && !win.isDestroyed() && win.webContents !== senderContents) {
      win.webContents.send('tray-action', { action: 'theme-changed', value: theme })
    }
  }
})
ipcMain.on('open-settings-window', (_e, section) => openSettingsWindow(section || undefined))
ipcMain.on('open-about-window', () => openAboutWindow())
ipcMain.on('open-auth-window', () => openAuthWindow())
ipcMain.on('open-verify-email-window', () => openVerifyEmailWindow())
ipcMain.on('open-wizard-window', () => openWizardWindow())
ipcMain.on('wizard-complete', () => {
  if (wizardWindow && !wizardWindow.isDestroyed()) {
    wizardWindow.removeAllListeners('closed')
    wizardWindow.close()
    wizardWindow = null
  }
  showMainWindow()
  if (mainWindow && !mainWindow.isDestroyed())
    mainWindow.webContents.send('tray-action', { action: 'wizard-completed' })
})
ipcMain.on('clipboard-write', (_e, { content, type }) => {
  try {
    if (type === 'image' && content.startsWith('data:image'))
      clipboard.writeImage(nativeImage.createFromDataURL(content))
    else clipboard.writeText(content)
    lastClipboardText = typeof content === 'string' && type !== 'image' ? content : ''
    if (type === 'image') lastClipboardImageHash = simpleHash(content)
  } catch (err) {
    console.error('[Numori Clips] Failed to write to clipboard:', err)
  }
})
ipcMain.on('set-incognito', (_e, enabled) => {
  incognitoMode = !!enabled
})
ipcMain.on('set-ignored-apps', (_e, appNames) => {
  ignoredAppNames = Array.isArray(appNames) ? appNames : []
})
ipcMain.on('update-shortcuts', (_e, { togglePanel, toggleIncognito }) => {
  registerGlobalShortcuts(togglePanel, toggleIncognito)
})
ipcMain.handle('get-extension-status', () => {
  const status = getExtensionStatus()
  // If the extension just became working (e.g. we re-enabled it), reposition the main window
  if (status === 'working' && mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
    const bounds = getTargetBounds()
    console.warn('[Numori Clips] extension now working, repositioning:', JSON.stringify(bounds))
    applyWindowBounds(bounds)
  }
  return status
})
ipcMain.handle('install-gnome-extension', () => installGnomeExtension())
ipcMain.handle('enable-gnome-extension', () => enableGnomeExtension())
ipcMain.handle('read-image-file', async (_e, filePath) => {
  try {
    const normalized = normalize(filePath)
    const ext = normalized.split('.').pop().toLowerCase()
    const mimeMap = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp',
      ico: 'image/x-icon',
      avif: 'image/avif',
      tif: 'image/tiff',
      tiff: 'image/tiff',
      svg: 'image/svg+xml',
    }
    const mime = mimeMap[ext] || 'image/png'
    const buffer = await readFile(normalized)
    return `data:${mime};base64,${buffer.toString('base64')}`
  } catch (err) {
    console.error('[Numori Clips] Failed to read image file:', err)
    return null
  }
})
ipcMain.on('reposition-main-window', async () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const bounds = getTargetBounds()
    console.warn('[Numori Clips] reposition-main-window bounds:', JSON.stringify(bounds))
    mainWindow.setBounds(bounds)
    // Also use the extension to force position on Wayland
    if (IS_WAYLAND) {
      const title = mainWindow.getTitle() || 'Numori Clips'
      setTimeout(() => {
        const positioned =
          positionWindowViaExtension(
            'numori-clips',
            bounds.x,
            bounds.y,
            bounds.width,
            bounds.height,
            title,
          ) ||
          positionWindowViaExtension(
            'electron',
            bounds.x,
            bounds.y,
            bounds.width,
            bounds.height,
            title,
          ) ||
          positionWindowViaExtension(
            'Electron',
            bounds.x,
            bounds.y,
            bounds.width,
            bounds.height,
            title,
          )
        console.warn('[Numori Clips] reposition via extension:', positioned)
        if (!positioned) {
          // Retry after a bit more time
          setTimeout(() => {
            const retry =
              positionWindowViaExtension(
                'numori-clips',
                bounds.x,
                bounds.y,
                bounds.width,
                bounds.height,
                title,
              ) ||
              positionWindowViaExtension(
                'electron',
                bounds.x,
                bounds.y,
                bounds.width,
                bounds.height,
                title,
              ) ||
              positionWindowViaExtension(
                'Electron',
                bounds.x,
                bounds.y,
                bounds.width,
                bounds.height,
                title,
              )
            console.warn('[Numori Clips] reposition retry:', retry)
          }, 500)
        }
      }, 300)
    }
  }
})

// ── Cleanup ──────────────────────────────────────────────────────────────

app.on('will-quit', () => {
  stopClipboardPolling()
  stopDbusShortcutListener()
  globalShortcut.unregisterAll()
  if (tray) {
    tray.destroy()
    tray = null
  }
})
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !tray) app.quit()
})
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
  else showMainWindow()
})
