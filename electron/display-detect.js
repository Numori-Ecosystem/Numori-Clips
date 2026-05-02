/**
 * Cross-platform display detection, window positioning, and shortcut registration.
 */

import { screen } from 'electron'
import { execSync } from 'node:child_process'
import { writeFileSync, unlinkSync, mkdtempSync, cpSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir, homedir } from 'node:os'
import { fileURLToPath } from 'node:url'

export const IS_WAYLAND =
  process.env.XDG_SESSION_TYPE === 'wayland' || process.env.WAYLAND_DISPLAY != null
export const IS_KDE = (process.env.XDG_CURRENT_DESKTOP || '').toLowerCase().includes('kde')
export const IS_GNOME = (process.env.XDG_CURRENT_DESKTOP || '').toLowerCase().includes('gnome')

function gdbus(method, ...args) {
  const argStr = args.map((a) => (typeof a === 'string' ? `"${a}"` : String(a))).join(' ')
  return execSync(
    `gdbus call --session --dest app.numori.ClipsHelper --object-path /app/numori/ClipsHelper --method app.numori.ClipsHelper.${method} ${argStr}`,
    { encoding: 'utf8', timeout: 2000, stdio: 'pipe' },
  ).trim()
}

// ── Display detection ────────────────────────────────────────────────────

function tryElectronCursor() {
  if (IS_WAYLAND) return null
  try {
    return screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  } catch {
    /* no cursor info */ return null
  }
}

function tryGnomeExtension() {
  if (!IS_GNOME || !IS_WAYLAND) return null
  try {
    const result = gdbus('GetCurrentMonitor')
    const match = result.match(/\((\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)/)
    if (match) return { x: +match[2], y: +match[3], width: +match[4], height: +match[5] }
  } catch {
    /* extension not available */
  }
  return null
}

function tryKdeCursorPosition() {
  if (!IS_KDE || !IS_WAYLAND) return null
  try {
    const tmpDir = mkdtempSync(join(tmpdir(), 'numori-'))
    const scriptPath = join(tmpDir, 'cursor.js')
    writeFileSync(
      scriptPath,
      'console.error("NUMORI_CURSOR:" + workspace.cursorPos.x + "," + workspace.cursorPos.y);',
    )
    const scriptId = execSync(
      `qdbus org.kde.KWin /Scripting org.kde.kwin.Scripting.loadScript "${scriptPath}"`,
      { encoding: 'utf8', timeout: 2000 },
    ).trim()
    execSync(`qdbus org.kde.KWin /Scripting/Script${scriptId} org.kde.kwin.Script.run`, {
      encoding: 'utf8',
      timeout: 2000,
    })
    const journal = execSync(
      'journalctl --user -t kwin_wayland_wrapper -t kwin_wayland --since "2 seconds ago" --no-pager -o cat 2>/dev/null || true',
      { encoding: 'utf8', timeout: 2000 },
    )
    try {
      execSync(`qdbus org.kde.KWin /Scripting/Script${scriptId} org.kde.kwin.Script.stop`, {
        encoding: 'utf8',
        timeout: 1000,
      })
    } catch {
      /* script already stopped */
    }
    try {
      unlinkSync(scriptPath)
    } catch {
      /* file already removed */
    }
    const match = journal.match(/NUMORI_CURSOR:(\d+),(\d+)/)
    if (match) return { x: +match[1], y: +match[2] }
  } catch {
    /* KDE cursor detection unavailable */
  }
  return null
}

export function getActiveDisplay() {
  const electron = tryElectronCursor()
  if (electron) return { display: electron }
  const gnome = tryGnomeExtension()
  if (gnome) return { workArea: gnome }
  const kde = tryKdeCursorPosition()
  if (kde) return { display: screen.getDisplayNearestPoint(kde) }
  return null
}

// ── GNOME extension management ───────────────────────────────────────────

export function isGnomeExtensionAvailable() {
  if (!IS_GNOME || !IS_WAYLAND) return false
  try {
    gdbus('GetCurrentMonitor')
    return true
  } catch {
    return false
  }
}

export function isGnomeExtensionInstalled() {
  if (!IS_GNOME) return false
  const dir = join(
    homedir(),
    '.local',
    'share',
    'gnome-shell',
    'extensions',
    'numori-clips-helper@numori.app',
  )
  return existsSync(join(dir, 'metadata.json')) && existsSync(join(dir, 'extension.js'))
}

export function installGnomeExtension() {
  if (!IS_GNOME) return false
  try {
    const __dirname = fileURLToPath(new URL('.', import.meta.url))
    const src = join(
      __dirname,
      '..',
      'resources',
      'gnome-extension',
      'numori-clips-helper@numori.app',
    )
    const dest = join(
      homedir(),
      '.local',
      'share',
      'gnome-shell',
      'extensions',
      'numori-clips-helper@numori.app',
    )
    cpSync(src, dest, { recursive: true })
    try {
      execSync('gnome-extensions enable numori-clips-helper@numori.app', {
        stdio: 'pipe',
        timeout: 3000,
      })
    } catch {
      /* best-effort enable */
    }
    return true
  } catch (e) {
    console.error('[Numori Clips] Failed to install extension:', e)
    return false
  }
}

export function enableGnomeExtension() {
  if (!IS_GNOME) return false
  try {
    execSync('gnome-extensions enable numori-clips-helper@numori.app', {
      stdio: 'pipe',
      timeout: 3000,
    })
    return true
  } catch {
    try {
      execSync(
        "gdbus call --session --dest org.gnome.Shell.Extensions --object-path /org/gnome/Shell/Extensions --method org.gnome.Shell.Extensions.EnableExtension 'numori-clips-helper@numori.app'",
        { stdio: 'pipe', timeout: 3000 },
      )
      return true
    } catch {
      /* enable failed */ return false
    }
  }
}

export function getExtensionStatus() {
  if (!IS_GNOME || !IS_WAYLAND) return 'not-needed'
  if (isGnomeExtensionAvailable()) return 'working'
  if (isGnomeExtensionInstalled()) {
    enableGnomeExtension()
    try {
      execSync('sleep 1', { timeout: 3000 })
    } catch {
      /* timeout ok */
    }
    if (isGnomeExtensionAvailable()) return 'working'
    return 'installed-needs-restart'
  }
  return 'not-installed'
}

// ── Window positioning ───────────────────────────────────────────────────

export function positionWindowViaExtension(wmClass, x, y, width, height, titleHint) {
  if (!IS_GNOME || !IS_WAYLAND) return false
  try {
    return gdbus('PositionWindow', wmClass, x, y, width, height, titleHint || '').includes('true')
  } catch {
    return false
  }
}

// ── Shortcuts (GNOME Wayland) ────────────────────────────────────────────

export function toGtkAccelerator(shortcut) {
  if (!shortcut) return ''
  const parts = shortcut.split('+')
  const key = parts.pop()
  const mods = parts
    .map(
      (m) =>
        ({ Super: '<Super>', Ctrl: '<Control>', Alt: '<Alt>', Shift: '<Shift>' })[m] || `<${m}>`,
    )
    .join('')
  return mods + key.toLowerCase()
}

/**
 * Set a shortcut via the extension. Uses GSettings + Main.wm.addKeybinding (like ddterm).
 */
export function setShortcutViaExtension(name, gtkAccelerator) {
  if (!IS_GNOME || !IS_WAYLAND) return false
  try {
    return gdbus('SetShortcut', name, gtkAccelerator || '').includes('true')
  } catch {
    return false
  }
}

export function showWindowViaExtension(wmClass, x, y, width, height, titleHint) {
  if (!IS_GNOME || !IS_WAYLAND) return false
  try {
    return gdbus('ShowWindow', wmClass, x, y, width, height, titleHint || '').includes('true')
  } catch {
    return false
  }
}

export function hideWindowViaExtension(wmClass, titleHint) {
  if (!IS_GNOME || !IS_WAYLAND) return false
  try {
    return gdbus('HideWindow', wmClass, titleHint || '').includes('true')
  } catch {
    return false
  }
}

export function needsNativeShortcuts() {
  return IS_WAYLAND
}
