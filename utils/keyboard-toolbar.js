import { registerPlugin } from '@capacitor/core'

/**
 * @typedef {object} KeyboardToolbarButton
 * @property {string} id
 * @property {string} title
 * @property {string} [icon] - SF Symbol name
 * @property {boolean} [separator] - renders a divider instead of a button
 */

/**
 * @typedef {object} KeyboardToolbarPlugin
 * @property {(options: { buttons: KeyboardToolbarButton[] }) => Promise<void>} setButtons
 * @property {() => Promise<void>} show
 * @property {() => Promise<void>} hide
 * @property {(options: { disabledIds: string[] }) => Promise<void>} updateButtonStates
 * @property {(eventName: 'buttonTapped', handler: (data: { id: string }) => void) => Promise<import('@capacitor/core').PluginListenerHandle>} addListener
 */

/** @type {KeyboardToolbarPlugin} */
export const KeyboardToolbar = registerPlugin('KeyboardToolbar')
