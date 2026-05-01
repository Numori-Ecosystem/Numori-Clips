// Locale preferences for units, date formats, number formats, etc.
// Provides global presets (UK, US, ES, etc.) with granular per-setting overrides.
// Persisted to Dexie (preferences table).

import db from '~/db.js'

// Global presets — sensible defaults per country/region
export const LOCALE_PRESETS = {
  UK: {
    volume: 'uk_gallon',
    fuelEconomy: 'mpg_uk',
    distance: 'miles',
    temperature: 'celsius',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'comma_dot', // 1,000.00
    timeFormat: '24h',
  },
  US: {
    volume: 'us_gallon',
    fuelEconomy: 'mpg',
    distance: 'miles',
    temperature: 'fahrenheit',
    dateFormat: 'MM/DD/YYYY',
    numberFormat: 'comma_dot',
    timeFormat: '12h',
  },
  ES: {
    volume: 'litre',
    fuelEconomy: 'l/100km',
    distance: 'km',
    temperature: 'celsius',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'dot_comma', // 1.000,00
    timeFormat: '24h',
  },
  FR: {
    volume: 'litre',
    fuelEconomy: 'l/100km',
    distance: 'km',
    temperature: 'celsius',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'space_comma', // 1 000,00
    timeFormat: '24h',
  },
  DE: {
    volume: 'litre',
    fuelEconomy: 'l/100km',
    distance: 'km',
    temperature: 'celsius',
    dateFormat: 'DD.MM.YYYY',
    numberFormat: 'dot_comma',
    timeFormat: '24h',
  },
  JP: {
    volume: 'litre',
    fuelEconomy: 'kpl',
    distance: 'km',
    temperature: 'celsius',
    dateFormat: 'YYYY/MM/DD',
    numberFormat: 'comma_dot',
    timeFormat: '24h',
  },
}

// Default preferences (UK)
const DEFAULT_PREFERENCES = {
  // Locale
  volume: 'uk_gallon',
  fuelEconomy: 'mpg_uk',
  distance: 'miles',
  temperature: 'celsius',
  dateFormat: 'DD/MM/YYYY',
  numberFormat: 'comma_dot',
  timeFormat: '24h',
  // Editor — Typography
  editorFontSize: 16,
  editorFontFamily: 'system',
  editorLineHeight: 19,
  editorLigatures: false,
  // Editor — Layout
  editorWordWrap: false,
  editorLineNumbers: 'on',
  editorFolding: true,
  // Editor — Cursor
  editorCursorStyle: 'line',
  editorScrollPastEnd: true,
  // Editor — Behaviour
  editorAutoClosingBrackets: 'always',
  editorTabSize: 2,
  editorRenderLineHighlight: 'all',
  // Editor — Results
  inlineResultAlign: 'left',
  inlineMode: 'left',
  // Customisation
  precisionMode: 'auto',
  roundingMode: 'round',
  decimalPlaces: 6,
  significantFigures: 6,
  autoCopyResult: true,
  copyAnimationStyle: 'scale-pop',
  showResultsInCodeBlocks: false,
  // Markdown
  markdownMode: 'edit',
  // Updates
  updateCheckInterval: 30, // minutes
  // Bin (trash)
  binEnabled: true,
  // Window controls (Electron)
  windowControlClose: true,
  windowControlMinimize: true,
  windowControlMaximize: true,
  windowControlPosition: 'left',
}

export const useLocalePreferences = () => {
  // Start with defaults; async load from Dexie will merge on top
  const preferences = reactive({ ...DEFAULT_PREFERENCES })

  // Load saved preferences from Dexie — store promise so callers can await if needed
  let _ready
  if (import.meta.client) {
    _ready = db.preferences
      .get('locale')
      .then((row) => {
        if (row?.value) {
          try {
            const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : row.value
            Object.assign(preferences, parsed)
          } catch {
            /* use defaults */
          }
        }
      })
      .catch(() => {
        /* use defaults */
      })
  } else {
    _ready = Promise.resolve()
  }

  const applyPreset = (presetName) => {
    const preset = LOCALE_PRESETS[presetName]
    if (!preset) return
    Object.assign(preferences, preset)
  }

  const setPreference = (key, value) => {
    if (key in preferences) {
      preferences[key] = value
    }
  }

  const getActivePreset = () => {
    for (const [name, preset] of Object.entries(LOCALE_PRESETS)) {
      const matches = Object.keys(preset).every((key) => preferences[key] === preset[key])
      if (matches) return name
    }
    return 'Custom'
  }

  const save = () => {
    try {
      // Unwrap reactive proxy — IndexedDB structured clone can't handle Proxies
      const plain = JSON.parse(JSON.stringify(preferences))
      db.preferences.put({ key: 'locale', value: JSON.stringify(plain) })
    } catch {
      /* silent */
    }
  }

  const reset = () => {
    Object.assign(preferences, DEFAULT_PREFERENCES)
    save()
  }

  return {
    preferences,
    ready: _ready,
    applyPreset,
    setPreference,
    getActivePreset,
    save,
    reset,
  }
}
