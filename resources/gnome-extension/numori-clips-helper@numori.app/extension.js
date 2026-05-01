/**
 * Numori Clips Helper — GNOME Shell Extension
 *
 * D-Bus methods:
 *   GetCurrentMonitor() → (i index, i x, i y, i width, i height)
 *   PositionWindow(s wm_class, i x, i y, i width, i height) → (b success)
 *   GrabShortcut(s accelerator, s name) → (b success)
 *   UngrabShortcut(s name) → (b success)
 *   UngrabAllShortcuts() → (b success)
 *
 * D-Bus signals:
 *   ShortcutActivated(s name)
 */

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

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
      <arg type="b" direction="out" name="success"/>
    </method>
    <method name="GrabShortcut">
      <arg type="s" direction="in" name="accelerator"/>
      <arg type="s" direction="in" name="name"/>
      <arg type="b" direction="out" name="success"/>
    </method>
    <method name="UngrabShortcut">
      <arg type="s" direction="in" name="name"/>
      <arg type="b" direction="out" name="success"/>
    </method>
    <method name="UngrabAllShortcuts">
      <arg type="b" direction="out" name="success"/>
    </method>
    <signal name="ShortcutActivated">
      <arg type="s" name="name"/>
    </signal>
  </interface>
</node>`;

export default class NumoriClipsHelper {
  _dbusId = null;
  _nameId = null;
  _acceleratorSignal = null;
  // Map: name → { action: number, accelerator: string }
  _shortcuts = new Map();
  // Map: action → name (reverse lookup)
  _actionToName = new Map();
  _connection = null;

  enable() {
    const ifaceInfo = Gio.DBusNodeInfo.new_for_xml(DBUS_IFACE).interfaces[0];

    this._dbusId = Gio.DBus.session.register_object(
      '/app/numori/ClipsHelper',
      ifaceInfo,
      (connection, sender, path, iface, method, params, invocation) => {
        this._connection = connection;

        if (method === 'GetCurrentMonitor') {
          const monitorIndex = global.display.get_current_monitor();
          const workArea = Main.layoutManager.getWorkAreaForMonitor(monitorIndex);
          invocation.return_value(new GLib.Variant('(iiiii)', [monitorIndex, workArea.x, workArea.y, workArea.width, workArea.height]));
        }
        else if (method === 'PositionWindow') {
          const [wmClass, x, y, width, height] = params.deepUnpack();
          const success = this._positionWindow(wmClass, x, y, width, height);
          invocation.return_value(new GLib.Variant('(b)', [success]));
        }
        else if (method === 'GrabShortcut') {
          const [accelerator, name] = params.deepUnpack();
          const success = this._grabShortcut(accelerator, name);
          invocation.return_value(new GLib.Variant('(b)', [success]));
        }
        else if (method === 'UngrabShortcut') {
          const [name] = params.deepUnpack();
          const success = this._ungrabShortcut(name);
          invocation.return_value(new GLib.Variant('(b)', [success]));
        }
        else if (method === 'UngrabAllShortcuts') {
          this._ungrabAll();
          invocation.return_value(new GLib.Variant('(b)', [true]));
        }
      },
      null,
      null,
    );

    this._nameId = Gio.DBus.session.own_name(
      'app.numori.ClipsHelper',
      Gio.BusNameOwnerFlags.NONE,
      null,
      null,
    );

    // Listen for accelerator activations
    this._acceleratorSignal = global.display.connect('accelerator-activated',
      (display, action, deviceId, timestamp) => {
        const name = this._actionToName.get(action);
        if (name && this._connection) {
          this._connection.emit_signal(
            null,
            '/app/numori/ClipsHelper',
            'app.numori.ClipsHelper',
            'ShortcutActivated',
            new GLib.Variant('(s)', [name]),
          );
        }
      }
    );
  }

  _positionWindow(wmClass, x, y, width, height) {
    const actors = global.get_window_actors();
    for (const actor of actors) {
      const win = actor.get_meta_window();
      if (!win) continue;
      const wc = win.get_wm_class();
      const wcInstance = win.get_wm_class_instance();
      if (wc === wmClass || wcInstance === wmClass) {
        win.move_resize_frame(false, x, y, width, height);
        return true;
      }
    }
    return false;
  }

  _grabShortcut(accelerator, name) {
    try {
      // Ungrab existing shortcut with this name first
      this._ungrabShortcut(name);

      const action = global.display.grab_accelerator(accelerator, Meta.KeyBindingFlags.NONE);
      if (action === Meta.KeyBindingAction.NONE) {
        log(`[Numori Clips Helper] Failed to grab accelerator: ${accelerator}`);
        return false;
      }

      // Bind the action to the GNOME Shell action group
      const actionName = `numori-clips-${name}`;
      Main.wm.allowKeybinding(actionName, Shell.ActionMode.ALL);

      this._shortcuts.set(name, { action, accelerator });
      this._actionToName.set(action, name);
      log(`[Numori Clips Helper] Grabbed shortcut: ${accelerator} as ${name} (action=${action})`);
      return true;
    } catch (e) {
      log(`[Numori Clips Helper] Error grabbing shortcut: ${e}`);
      return false;
    }
  }

  _ungrabShortcut(name) {
    const entry = this._shortcuts.get(name);
    if (!entry) return false;
    try {
      global.display.ungrab_accelerator(entry.action);
      this._actionToName.delete(entry.action);
      this._shortcuts.delete(name);
      return true;
    } catch (e) {
      log(`[Numori Clips Helper] Error ungrabbing shortcut: ${e}`);
      return false;
    }
  }

  _ungrabAll() {
    for (const [name] of this._shortcuts) {
      this._ungrabShortcut(name);
    }
  }

  disable() {
    this._ungrabAll();

    if (this._acceleratorSignal) {
      global.display.disconnect(this._acceleratorSignal);
      this._acceleratorSignal = null;
    }
    if (this._dbusId) {
      Gio.DBus.session.unregister_object(this._dbusId);
      this._dbusId = null;
    }
    if (this._nameId) {
      Gio.DBus.session.unown_name(this._nameId);
      this._nameId = null;
    }
  }
}
