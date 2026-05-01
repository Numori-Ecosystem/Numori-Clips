/**
 * Cross-platform active display detection.
 *
 * Strategy (in priority order):
 *
 * 1. macOS / Windows / X11 Linux:
 *    Electron's screen.getCursorScreenPoint() works → getDisplayNearestPoint()
 *
 * 2. KDE Wayland:
 *    Query cursor position via KWin scripting over D-Bus (qdbus)
 *
 * 3. GNOME Wayland (with Numori Clips Helper extension):
 *    Query current monitor via D-Bus (app.numori.ClipsHelper.GetCurrentMonitor)
 *
 * 4. Fallback:
 *    Let the Wayland compositor place the window (it uses the active monitor),
 *    then snap to that display after the window is shown.
 */

import { screen } from 'electron'
import { execSync } from 'node:child_process'
import { writeFileSync, unlinkSync, mkdtempSync, cpSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir, homedir } from 'node:os'
import { fileURLToPath } from 'node:url'

const IS_WAYLAND = process.env.XDG_SESSION_TYPE === 'wayland'
  || process.env.WAYLAND_DISPLAY != null

const IS_KDE = (process.env.XDG_CURRENT_DESKTOP || '').toLowerCase().includes('kde')
const IS_GNOME = (process.env.XDG_CURRENT_DESKTOP || '').toLowerCase().includes('gnome')

/**
 * Try Electron's native cursor API (works on macOS, Windows, X11).
 * Returns a Display or null.
 */
function tryElectronCursor() {
  if (IS_WAYLAND) return null
  try {
    const cursor = screen.getCursorScreenPoint()
    return screen.getDisplayNearestPoint(cursor)
  } catch {
    return null
  }
}

/**
 * KDE Wayland: get cursor position via KWin scripting + qdbus.
 * Returns { x, y } or null.
 */
function tryKdeCursorPosition() {
  if (!IS_KDE || !IS_WAYLAND) return null
  try {
    // Create a temp KWin script that prints cursor position to stdout via qdbus
    const tmpDir = mkdtempSync(join(tmpdir(), 'numori-'))
    const scriptPath = join(tmpDir, 'cursor.js')
    writeFileSync(scriptPath, 'console.error("NUMORI_CURSOR:" + workspace.cursorPos.x + "," + workspace.cursorPos.y);')

    // Load and run the script
    const scriptId = execSync(
      `qdbus org.kde.KWin /Scripting org.kde.kwin.Scripting.loadScript "${scriptPath}"`,
      { encoding: 'utf8', timeout: 2000 },
    ).trim()

    execSync(
      `qdbus org.kde.KWin /Scripting/Script${scriptId} org.kde.kwin.Script.run`,
      { encoding: 'utf8', timeout: 2000 },
    )

    // Read from journal (last 2 seconds)
    const journal = execSync(
      'journalctl --user -t kwin_wayland_wrapper -t kwin_wayland --since "2 seconds ago" --no-pager -o cat 2>/dev/null || true',
      { encoding: 'utf8', timeout: 2000 },
    )

    // Stop and clean up
    try {
      execSync(
        `qdbus org.kde.KWin /Scripting/Script${scriptId} org.kde.kwin.Script.stop`,
        { encoding: 'utf8', timeout: 1000 },
      )
    } catch { /* ignore */ }
    try { unlinkSync(scriptPath) } catch { /* ignore */ }

    // Parse cursor position from journal output
    const match = journal.match(/NUMORI_CURSOR:(\d+),(\d+)/)
    if (match) {
      return { x: parseInt(match[1], 10), y: parseInt(match[2], 10) }
    }
  } catch {
    // qdbus not available or KWin scripting failed
  }
  return null
}

/**
 * GNOME Wayland: query the Numori Clips Helper extension via D-Bus.
 * Returns { monitorIndex, x, y, width, height } or null.
 */
function tryGnomeExtension() {
  if (!IS_GNOME || !IS_WAYLAND) return null
  try {
    const result = execSync(
      'gdbus call --session --dest app.numori.ClipsHelper --object-path /app/numori/ClipsHelper --method app.numori.ClipsHelper.GetCurrentMonitor',
      { encoding: 'utf8', timeout: 2000, stdio: 'pipe' },
    ).trim()

    // Parse GVariant output: (monitorIndex, x, y, width, height)
    const match = result.match(/\((\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)/)
    if (match) {
      return {
        monitorIndex: parseInt(match[1], 10),
        x: parseInt(match[2], 10),
        y: parseInt(match[3], 10),
        width: parseInt(match[4], 10),
        height: parseInt(match[5], 10),
      }
    }
  } catch {
    // Extension not installed or D-Bus call failed
  }
  return null
}

/**
 * Check if the GNOME helper extension is available.
 */
export function isGnomeExtensionAvailable() {
  if (!IS_GNOME || !IS_WAYLAND) return false
  try {
    execSync(
      'gdbus call --session --dest app.numori.ClipsHelper --object-path /app/numori/ClipsHelper --method app.numori.ClipsHelper.GetCurrentMonitor',
      { encoding: 'utf8', timeout: 1000, stdio: 'pipe' },
    )
    return true
  } catch {
    return false
  }
}

/**
 * Returns true if we're on GNOME Wayland and the extension is NOT installed.
 * Used to prompt the user to install it.
 */
export function needsGnomeExtension() {
  return IS_GNOME && IS_WAYLAND && !isGnomeExtensionAvailable()
}

/**
 * Get the active display — the one the cursor/pointer is on.
 *
 * Returns:
 *   { display: Electron.Display } — matched an Electron display
 *   { workArea: { x, y, width, height } } — got geometry directly (GNOME ext)
 *   null — couldn't determine, use fallback (compositor placement)
 */
export function getActiveDisplay() {
  // 1. Electron native (macOS, Windows, X11)
  const electronDisplay = tryElectronCursor()
  if (electronDisplay) return { display: electronDisplay }

  // 2. GNOME extension (returns work area directly)
  const gnome = tryGnomeExtension()
  if (gnome) {
    return { workArea: { x: gnome.x, y: gnome.y, width: gnome.width, height: gnome.height } }
  }

  // 3. KDE Wayland (returns cursor coords, match to Electron display)
  const kdeCursor = tryKdeCursorPosition()
  if (kdeCursor) {
    const display = screen.getDisplayNearestPoint(kdeCursor)
    return { display }
  }

  // 4. Can't determine — caller should use fallback
  return null
}

export { IS_WAYLAND, IS_GNOME, IS_KDE }

/**
 * Check if the GNOME helper extension files are installed on disk
 * (may not be active yet — requires session restart).
 */
export function isGnomeExtensionInstalled() {
  if (!IS_GNOME) return false
  const extDir = join(homedir(), '.local', 'share', 'gnome-shell', 'extensions', 'numori-clips-helper@numori.app')
  return existsSync(join(extDir, 'metadata.json')) && existsSync(join(extDir, 'extension.js'))
}

/**
 * Install the GNOME helper extension to ~/.local/share/gnome-shell/extensions/.
 * Returns true if installed successfully.
 */
export function installGnomeExtension() {
  if (!IS_GNOME) return false
  try {
    const __dirname = fileURLToPath(new URL('.', import.meta.url))
    const srcDir = join(__dirname, '..', 'resources', 'gnome-extension', 'numori-clips-helper@numori.app')
    const destDir = join(homedir(), '.local', 'share', 'gnome-shell', 'extensions', 'numori-clips-helper@numori.app')

    cpSync(srcDir, destDir, { recursive: true })

    // Try to enable it (won't work until session restart, but doesn't hurt)
    try {
      execSync('gnome-extensions enable numori-clips-helper@numori.app', { stdio: 'pipe', timeout: 3000 })
    } catch { /* expected to fail before restart */ }

    return true
  } catch (err) {
    console.error('[Numori Clips] Failed to install GNOME extension:', err)
    return false
  }
}

/**
 * Try to enable the GNOME extension via gnome-extensions CLI or DBus.
 * Returns true if the enable command succeeded (extension may still need restart).
 */
export function enableGnomeExtension() {
  if (!IS_GNOME) return false
  try {
    execSync('gnome-extensions enable numori-clips-helper@numori.app', { stdio: 'pipe', timeout: 3000 })
    return true
  } catch {
    // Also try via DBus
    try {
      execSync(
        "gdbus call --session --dest org.gnome.Shell.Extensions --object-path /org/gnome/Shell/Extensions --method org.gnome.Shell.Extensions.EnableExtension 'numori-clips-helper@numori.app'",
        { stdio: 'pipe', timeout: 3000 },
      )
      return true
    } catch {
      return false
    }
  }
}

/**
 * Full status check for the extension system.
 * Returns: 'not-needed' | 'working' | 'installed-needs-restart' | 'not-installed'
 */
export function getExtensionStatus() {
  if (!IS_GNOME || !IS_WAYLAND) return 'not-needed'
  if (isGnomeExtensionAvailable()) return 'working'

  if (isGnomeExtensionInstalled()) {
    // Files on disk but D-Bus not responding.
    // Try to enable — maybe user disabled it or it wasn't enabled after install.
    enableGnomeExtension()

    // Wait briefly and re-check D-Bus
    try { execSync('sleep 1', { timeout: 3000 }) } catch { /* ignore */ }

    if (isGnomeExtensionAvailable()) return 'working'

    // Still not responding — needs session restart
    return 'installed-needs-restart'
  }

  return 'not-installed'
}

/**
 * Position a window via the GNOME Shell extension's PositionWindow D-Bus method.
 * This uses Mutter's move_resize_frame which is the only way to position
 * windows on GNOME Wayland.
 *
 * @param {string} wmClass - The WM_CLASS of the window to position
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @returns {boolean} true if the window was found and positioned
 */
export function positionWindowViaExtension(wmClass, x, y, width, height) {
  if (!IS_GNOME || !IS_WAYLAND) return false
  try {
    const result = execSync(
      `gdbus call --session --dest app.numori.ClipsHelper --object-path /app/numori/ClipsHelper --method app.numori.ClipsHelper.PositionWindow "${wmClass}" ${x} ${y} ${width} ${height}`,
      { encoding: 'utf8', timeout: 2000, stdio: 'pipe' },
    ).trim()
    return result.includes('true')
  } catch {
    return false
  }
}


/**
 * Register a global shortcut via the GNOME Shell extension.
 * The extension uses global.display.grab_accelerator which works on Wayland.
 *
 * @param {string} accelerator - GTK accelerator format, e.g. '<Super><Shift>v'
 * @param {string} name - Unique name for this shortcut
 * @returns {boolean}
 */
export function grabShortcutViaExtension(accelerator, name) {
  if (!IS_GNOME || !IS_WAYLAND) return false
  try {
    const result = execSync(
      `gdbus call --session --dest app.numori.ClipsHelper --object-path /app/numori/ClipsHelper --method app.numori.ClipsHelper.GrabShortcut "${accelerator}" "${name}"`,
      { encoding: 'utf8', timeout: 2000, stdio: 'pipe' },
    ).trim()
    return result.includes('true')
  } catch {
    return false
  }
}

/**
 * Unregister all shortcuts via the GNOME Shell extension.
 */
export function ungrabAllShortcutsViaExtension() {
  if (!IS_GNOME || !IS_WAYLAND) return false
  try {
    execSync(
      'gdbus call --session --dest app.numori.ClipsHelper --object-path /app/numori/ClipsHelper --method app.numori.ClipsHelper.UngrabAllShortcuts',
      { encoding: 'utf8', timeout: 2000, stdio: 'pipe' },
    )
    return true
  } catch {
    return false
  }
}

/**
 * Convert an Electron-style shortcut (Super+Shift+V) to GTK accelerator format (<Super><Shift>v).
 */
export function toGtkAccelerator(shortcut) {
  if (!shortcut) return null
  const parts = shortcut.split('+')
  const key = parts.pop()
  const mods = parts.map(m => {
    switch (m) {
      case 'Super': return '<Super>'
      case 'Ctrl': return '<Control>'
      case 'Alt': return '<Alt>'
      case 'Shift': return '<Shift>'
      default: return `<${m}>`
    }
  }).join('')
  return mods + key.toLowerCase()
}


/**
 * Register a global shortcut on KDE Wayland via org.kde.KGlobalAccel D-Bus.
 * KDE uses a different mechanism than GNOME — shortcuts are registered through
 * KGlobalAccel which works on both X11 and Wayland.
 *
 * @param {string} accelerator - Electron format, e.g. 'Super+Shift+V'
 * @param {string} name - Unique name for this shortcut
 * @param {Function} callback - Called when shortcut is triggered
 * @returns {boolean}
 */
export function registerKdeShortcut(accelerator, name) {
  if (!IS_KDE) return false
  try {
    // KDE uses a custom-command approach via .desktop files or kglobalaccel
    // For runtime registration, we use qdbus to set a custom shortcut
    // that triggers a D-Bus call back to our app
    const kdeAccel = accelerator
      .replace('Super', 'Meta')
      .replace('Ctrl', 'Ctrl')
      .replace('Alt', 'Alt')
      .replace('Shift', 'Shift')
      .split('+').join('+')

    // Register via custom command shortcut in KDE settings
    execSync(
      `kwriteconfig6 --file kglobalshortcutsrc --group "numori-clips" --key "${name}" "${kdeAccel},none,Numori Clips ${name}"`,
      { stdio: 'pipe', timeout: 2000 },
    )
    // Reload KGlobalAccel
    execSync('qdbus org.kde.KGlobalAccel /kglobalaccel org.kde.KGlobalAccel.blockGlobalShortcuts false 2>/dev/null || true',
      { stdio: 'pipe', timeout: 2000 })
    return true
  } catch {
    return false
  }
}

/**
 * Check if we're on a Wayland session where Electron's globalShortcut won't work.
 */
export function needsNativeShortcuts() {
  return IS_WAYLAND
}
