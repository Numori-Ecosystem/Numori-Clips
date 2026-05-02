/**
 * Numori Clips Helper — GNOME Shell Extension
 *
 * D-Bus methods:
 *   GetCurrentMonitor() → (i index, i x, i y, i width, i height)
 *   PositionWindow(s wm_class, i x, i y, i width, i height) → (b success)
 *   SetShortcut(s name, s accelerator) → (b success)
 *
 * D-Bus signals:
 *   ShortcutActivated(s name)
 *   ClipboardChanged(s type, s content)
 *     type: 'text' | 'image'
 *     content: the text, or base64-encoded PNG for images
 *
 * Clipboard monitoring uses Meta.Selection 'owner-changed' signal,
 * the same approach Pano uses. This works even when the Electron
 * window is hidden because it runs inside the compositor.
 */

import Gio from 'gi://Gio'
import GLib from 'gi://GLib'
import Meta from 'gi://Meta'
import Shell from 'gi://Shell'
import St from 'gi://St'
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js'
import * as Main from 'resource:///org/gnome/shell/ui/main.js'

const DBUS_IFACE = `
<node>
  <interface name="app.numori.ClipsHelper">
    <method name="GetCurrentMonitor">
      <arg type="i" direction="out" name="monitorIndex"/>
      <arg type="i" direction="out" name="x"/>
      <arg type="i" direction="out" name="y"/>
      <arg type="i" direction="out" name="width"/>
      <arg type="i" direction="out" name="height"/>
    </method>
    <method name="PositionWindow">
      <arg type="s" direction="in" name="wmClass"/>
      <arg type="i" direction="in" name="x"/>
      <arg type="i" direction="in" name="y"/>
      <arg type="i" direction="in" name="width"/>
      <arg type="i" direction="in" name="height"/>
      <arg type="s" direction="in" name="titleHint"/>
      <arg type="b" direction="out" name="success"/>
    </method>
    <method name="SetShortcut">
      <arg type="s" direction="in" name="name"/>
      <arg type="s" direction="in" name="accelerator"/>
      <arg type="b" direction="out" name="success"/>
    </method>
    <method name="ShowWindow">
      <arg type="s" direction="in" name="wmClass"/>
      <arg type="i" direction="in" name="x"/>
      <arg type="i" direction="in" name="y"/>
      <arg type="i" direction="in" name="width"/>
      <arg type="i" direction="in" name="height"/>
      <arg type="s" direction="in" name="titleHint"/>
      <arg type="b" direction="out" name="success"/>
    </method>
    <method name="HideWindow">
      <arg type="s" direction="in" name="wmClass"/>
      <arg type="s" direction="in" name="titleHint"/>
      <arg type="b" direction="out" name="success"/>
    </method>
    <method name="DebugListWindows">
      <arg type="s" direction="out" name="windowList"/>
    </method>
    <signal name="ShortcutActivated">
      <arg type="s" name="name"/>
    </signal>
    <signal name="ClipboardChanged">
      <arg type="s" name="contentType"/>
      <arg type="s" name="content"/>
    </signal>
  </interface>
</node>`

export default class NumoriClipsHelper extends Extension {
  _dbusId = null
  _nameId = null
  _settings = null
  _connection = null
  _boundKeys = []
  _selectionChangedId = null
  _lastText = null
  _lastImageHash = null

  enable() {
    this._settings = this.getSettings()
    const ifaceInfo = Gio.DBusNodeInfo.new_for_xml(DBUS_IFACE).interfaces[0]

    this._dbusId = Gio.DBus.session.register_object(
      '/app/numori/ClipsHelper',
      ifaceInfo,
      (connection, sender, path, iface, method, params, invocation) => {
        this._connection = connection

        if (method === 'GetCurrentMonitor') {
          const monitorIndex = global.display.get_current_monitor()
          const workArea = Main.layoutManager.getWorkAreaForMonitor(monitorIndex)
          invocation.return_value(
            new GLib.Variant('(iiiii)', [
              monitorIndex,
              workArea.x,
              workArea.y,
              workArea.width,
              workArea.height,
            ]),
          )
        } else if (method === 'PositionWindow') {
          const [wmClass, x, y, width, height, titleHint] = params.deepUnpack()
          invocation.return_value(
            new GLib.Variant('(b)', [
              this._positionWindow(wmClass, x, y, width, height, titleHint),
            ]),
          )
        } else if (method === 'SetShortcut') {
          const [name, accelerator] = params.deepUnpack()
          invocation.return_value(new GLib.Variant('(b)', [this._setShortcut(name, accelerator)]))
        } else if (method === 'ShowWindow') {
          const [wmClass, x, y, width, height, titleHint] = params.deepUnpack()
          invocation.return_value(
            new GLib.Variant('(b)', [this._showWindow(wmClass, x, y, width, height, titleHint)]),
          )
        } else if (method === 'HideWindow') {
          const [wmClass, titleHint] = params.deepUnpack()
          invocation.return_value(new GLib.Variant('(b)', [this._hideWindow(wmClass, titleHint)]))
        } else if (method === 'DebugListWindows') {
          const actors = global.get_window_actors()
          const list = actors
            .map((a) => {
              const w = a.get_meta_window()
              if (!w) return 'null'
              return `${w.get_wm_class() || '(none)'}|${w.get_wm_class_instance() || '(none)'}|${w.get_title() || '(none)'}`
            })
            .join(';;')
          invocation.return_value(new GLib.Variant('(s)', [list]))
        }
      },
      null,
      null,
    )

    this._nameId = Gio.DBus.session.own_name(
      'app.numori.ClipsHelper',
      Gio.BusNameOwnerFlags.NONE,
      null,
      null,
    )

    // Register keybindings
    this._bindKey('toggle-panel')
    this._bindKey('toggle-incognito')

    // Start clipboard monitoring (like Pano's ClipboardManager)
    this._startClipboardMonitoring()
  }

  // ── Clipboard monitoring ───────────────────────────────────────────────

  _startClipboardMonitoring() {
    const selection = global.get_display().get_selection()
    const clipboard = St.Clipboard.get_default()

    this._selectionChangedId = selection.connect(
      'owner-changed',
      (_sel, selectionType, _source) => {
        if (selectionType !== Meta.SelectionType.SELECTION_CLIPBOARD) return

        // Small delay to let the clipboard content settle
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
          this._readClipboard(clipboard)
          return GLib.SOURCE_REMOVE
        })
      },
    )
  }

  _readClipboard(clipboard) {
    const mimeTypes = clipboard.get_mimetypes(St.ClipboardType.CLIPBOARD)
    const hasText = mimeTypes.some((m) =>
      ['text/plain;charset=utf-8', 'text/plain', 'UTF8_STRING'].includes(m),
    )

    // Check for image first — but only if there's no text alongside it.
    // File managers put both image/png (thumbnail) and text (path) in the
    // clipboard when copying files. In that case we prefer the text path.
    if (mimeTypes.includes('image/png') && !hasText) {
      clipboard.get_content(St.ClipboardType.CLIPBOARD, 'image/png', (_cb, bytes) => {
        const data = bytes instanceof GLib.Bytes ? bytes.get_data() : bytes
        if (data && data.length > 0) {
          const hash = data.length.toString()
          if (hash !== this._lastImageHash) {
            this._lastImageHash = hash
            this._lastText = null
            const b64 = GLib.base64_encode(data)
            this._emitClipboardChanged('image', `data:image/png;base64,${b64}`)
          }
        }
      })
      return
    }

    // Check for text
    if (hasText) {
      clipboard.get_text(St.ClipboardType.CLIPBOARD, (_cb, text) => {
        if (text && text.trim() && text !== this._lastText) {
          this._lastText = text
          this._lastImageHash = null
          this._emitClipboardChanged('text', text)
        }
      })
    }
  }

  _emitClipboardChanged(contentType, content) {
    if (this._connection) {
      this._connection.emit_signal(
        null,
        '/app/numori/ClipsHelper',
        'app.numori.ClipsHelper',
        'ClipboardChanged',
        new GLib.Variant('(ss)', [contentType, content]),
      )
    }
  }

  // ── Keybindings ────────────────────────────────────────────────────────

  _bindKey(name) {
    try {
      Main.wm.addKeybinding(
        name,
        this._settings,
        Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
        Shell.ActionMode.ALL,
        () => this._emitShortcut(name),
      )
      this._boundKeys.push(name)
    } catch (e) {
      console.warn(`[Numori Clips Helper] Failed to bind key ${name}: ${e}`)
    }
  }

  _unbindKey(name) {
    try {
      Main.wm.removeKeybinding(name)
      this._boundKeys = this._boundKeys.filter((k) => k !== name)
    } catch {
      /* ignore */
    }
  }

  _emitShortcut(name) {
    if (this._connection) {
      this._connection.emit_signal(
        null,
        '/app/numori/ClipsHelper',
        'app.numori.ClipsHelper',
        'ShortcutActivated',
        new GLib.Variant('(s)', [name]),
      )
    }
  }

  _setShortcut(name, accelerator) {
    try {
      this._settings.set_strv(name, accelerator ? [accelerator] : [])
      this._unbindKey(name)
      if (accelerator) this._bindKey(name)
      return true
    } catch (e) {
      console.warn(`[Numori Clips Helper] Failed to set shortcut ${name}: ${e}`)
      return false
    }
  }

  // ── Window positioning ─────────────────────────────────────────────────

  _findWindow(wmClass, titleHint) {
    const actors = global.get_window_actors()
    for (const actor of actors) {
      const win = actor.get_meta_window()
      if (!win) continue
      const wc = win.get_wm_class()
      const wcInstance = win.get_wm_class_instance()
      if (wc === wmClass || wcInstance === wmClass) {
        if (titleHint) {
          const title = win.get_title() || ''
          if (title === titleHint) return { win, actor }
        } else {
          return { win, actor }
        }
      }
    }
    return null
  }

  _positionWindow(wmClass, x, y, width, height, titleHint) {
    const found = this._findWindow(wmClass, titleHint)
    if (!found) return false
    const { win } = found
    win.move_resize_frame(false, x, y, width, height)
    if (!win.is_above()) win.make_above()
    if (!win.is_on_all_workspaces()) win.stick()
    Main.activateWindow(win)
    return true
  }

  _showWindow(wmClass, x, y, width, height, titleHint) {
    const found = this._findWindow(wmClass, titleHint)
    if (!found) return false
    const { win, actor } = found

    if (!win.is_above()) win.make_above()
    if (!win.is_on_all_workspaces()) win.stick()

    // Start from below: full width, zero height at the bottom edge
    const startY = y + height
    win.move_resize_frame(false, x, startY, width, 1)
    actor.show()
    Main.activateWindow(win)

    // Animate slide up over ~200ms using 10 steps
    const steps = 10
    const duration = 200
    let step = 0

    const _timerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, duration / steps, () => {
      step++
      const t = step / steps
      // Ease out cubic
      const ease = 1 - Math.pow(1 - t, 3)
      const currentH = Math.round(height * ease)
      const currentY = y + height - currentH
      win.move_resize_frame(false, x, currentY, width, Math.max(currentH, 1))

      if (step >= steps) {
        win.move_resize_frame(false, x, y, width, height)
        return GLib.SOURCE_REMOVE
      }
      return GLib.SOURCE_CONTINUE
    })

    return true
  }

  _hideWindow(wmClass, titleHint) {
    const found = this._findWindow(wmClass, titleHint)
    if (!found) return false
    const { win } = found

    const rect = win.get_frame_rect()
    const _startY = rect.y
    const startH = rect.height
    const targetY = rect.y + rect.height

    // Animate slide down
    const steps = 8
    const duration = 150
    let step = 0

    GLib.timeout_add(GLib.PRIORITY_DEFAULT, duration / steps, () => {
      step++
      const t = step / steps
      const ease = t * t // ease in quad
      const currentH = Math.round(startH * (1 - ease))
      const currentY = targetY - currentH
      win.move_resize_frame(false, rect.x, currentY, rect.width, Math.max(currentH, 1))

      if (step >= steps) {
        // Move fully off-screen
        win.move_resize_frame(false, rect.x, targetY + 100, rect.width, 1)
        return GLib.SOURCE_REMOVE
      }
      return GLib.SOURCE_CONTINUE
    })

    return true
  }

  // ── Cleanup ────────────────────────────────────────────────────────────

  disable() {
    // Stop clipboard monitoring
    if (this._selectionChangedId) {
      const selection = global.get_display().get_selection()
      selection.disconnect(this._selectionChangedId)
      this._selectionChangedId = null
    }

    // Unbind keys
    for (const name of [...this._boundKeys]) {
      this._unbindKey(name)
    }

    if (this._dbusId) {
      Gio.DBus.session.unregister_object(this._dbusId)
      this._dbusId = null
    }
    if (this._nameId) {
      Gio.DBus.session.unown_name(this._nameId)
      this._nameId = null
    }
    this._settings = null
    this._connection = null
    this._lastText = null
    this._lastImageHash = null
  }
}
