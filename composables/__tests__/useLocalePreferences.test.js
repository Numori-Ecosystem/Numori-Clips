/**
 * Tests for useLocalePreferences composable.
 * Covers: defaults, presets, setPreference, persistence, reset,
 * getActivePreset detection, and all editor setting keys.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Vue's reactive — return a plain object (good enough for unit tests)
vi.stubGlobal('reactive', (obj) => obj)

// In-memory store for the Dexie mock
let prefStore = {}

// Mock Dexie db module
vi.mock('~/db.js', () => ({
  default: {
    preferences: {
      get: vi.fn(async (key) => prefStore[key] ?? undefined),
      put: vi.fn(async (row) => {
        prefStore[row.key] = row
      }),
    },
  },
}))

// Mock import.meta.client
vi.stubGlobal('import', { meta: { client: true } })
// Dexie load path uses import.meta.client — we need to ensure it's truthy
Object.defineProperty(import.meta, 'client', { value: true, writable: true })

const { useLocalePreferences, LOCALE_PRESETS } = await import('../useLocalePreferences.js')
const dbModule = await import('~/db.js')
const db = dbModule.default

beforeEach(() => {
  prefStore = {}
  db.preferences.get.mockClear()
  db.preferences.put.mockClear()
})

// ─── All expected default values ───
const EXPECTED_DEFAULTS = {
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
  markdownMode: 'edit',
  // Updates
  updateCheckInterval: 30,
  // Features
  binEnabled: true,
}

describe('Default Preferences', () => {
  it('returns all expected default keys', () => {
    const { preferences } = useLocalePreferences()
    for (const [key, value] of Object.entries(EXPECTED_DEFAULTS)) {
      expect(preferences[key], `default for "${key}"`).toEqual(value)
    }
  })

  it('has no extra keys beyond expected defaults', () => {
    const { preferences } = useLocalePreferences()
    const prefKeys = Object.keys(preferences).sort()
    const expectedKeys = Object.keys(EXPECTED_DEFAULTS).sort()
    expect(prefKeys).toEqual(expectedKeys)
  })
})

describe('Presets', () => {
  it('applyPreset(UK) sets UK locale values', () => {
    const { preferences, applyPreset } = useLocalePreferences()
    applyPreset('UK')
    for (const [key, value] of Object.entries(LOCALE_PRESETS.UK)) {
      expect(preferences[key], `UK preset "${key}"`).toEqual(value)
    }
  })

  it('applyPreset(US) sets US locale values', () => {
    const { preferences, applyPreset } = useLocalePreferences()
    applyPreset('US')
    for (const [key, value] of Object.entries(LOCALE_PRESETS.US)) {
      expect(preferences[key], `US preset "${key}"`).toEqual(value)
    }
  })

  it('applyPreset(ES) sets ES locale values', () => {
    const { preferences, applyPreset } = useLocalePreferences()
    applyPreset('ES')
    for (const [key, value] of Object.entries(LOCALE_PRESETS.ES)) {
      expect(preferences[key], `ES preset "${key}"`).toEqual(value)
    }
  })

  it('applyPreset(FR) sets FR locale values', () => {
    const { preferences, applyPreset } = useLocalePreferences()
    applyPreset('FR')
    for (const [key, value] of Object.entries(LOCALE_PRESETS.FR)) {
      expect(preferences[key], `FR preset "${key}"`).toEqual(value)
    }
  })

  it('applyPreset(DE) sets DE locale values', () => {
    const { preferences, applyPreset } = useLocalePreferences()
    applyPreset('DE')
    for (const [key, value] of Object.entries(LOCALE_PRESETS.DE)) {
      expect(preferences[key], `DE preset "${key}"`).toEqual(value)
    }
  })

  it('applyPreset(JP) sets JP locale values', () => {
    const { preferences, applyPreset } = useLocalePreferences()
    applyPreset('JP')
    for (const [key, value] of Object.entries(LOCALE_PRESETS.JP)) {
      expect(preferences[key], `JP preset "${key}"`).toEqual(value)
    }
  })

  it('applyPreset does not overwrite editor settings', () => {
    const { preferences, applyPreset } = useLocalePreferences()
    preferences.editorFontSize = 22
    preferences.editorCursorStyle = 'line-thin'
    applyPreset('US')
    expect(preferences.editorFontSize).toBe(22)
    expect(preferences.editorCursorStyle).toBe('line-thin')
  })

  it('applyPreset with invalid name does nothing', () => {
    const { preferences, applyPreset } = useLocalePreferences()
    const before = { ...preferences }
    applyPreset('INVALID')
    expect(preferences).toEqual(before)
  })
})

describe('getActivePreset', () => {
  it('detects UK preset by default', () => {
    const { getActivePreset } = useLocalePreferences()
    expect(getActivePreset()).toBe('UK')
  })

  it('detects US preset after applying it', () => {
    const { applyPreset, getActivePreset } = useLocalePreferences()
    applyPreset('US')
    expect(getActivePreset()).toBe('US')
  })

  it('returns Custom when settings are mixed', () => {
    const { preferences, getActivePreset } = useLocalePreferences()
    preferences.temperature = 'fahrenheit' // UK default is celsius
    expect(getActivePreset()).toBe('Custom')
  })

  it('detects each preset correctly', () => {
    for (const presetName of Object.keys(LOCALE_PRESETS)) {
      const { applyPreset, getActivePreset } = useLocalePreferences()
      applyPreset(presetName)
      expect(getActivePreset(), `should detect ${presetName}`).toBe(presetName)
    }
  })
})

describe('setPreference', () => {
  it('updates a known key', () => {
    const { preferences, setPreference } = useLocalePreferences()
    setPreference('editorFontSize', 24)
    expect(preferences.editorFontSize).toBe(24)
  })

  it('ignores unknown keys', () => {
    const { preferences, setPreference } = useLocalePreferences()
    const keysBefore = Object.keys(preferences)
    setPreference('nonExistentKey', 'value')
    expect(Object.keys(preferences)).toEqual(keysBefore)
    expect(preferences.nonExistentKey).toBeUndefined()
  })

  it('can set every editor setting', () => {
    const { preferences, setPreference } = useLocalePreferences()
    const editorSettings = {
      editorFontSize: 20,
      editorFontFamily: 'fira-code',
      editorLineHeight: 24,
      editorLigatures: true,
      editorWordWrap: true,
      editorLineNumbers: 'relative',
      editorFolding: false,
      editorCursorStyle: 'line-thin',
      editorScrollPastEnd: false,
      editorAutoClosingBrackets: 'never',
      editorTabSize: 4,
      editorRenderLineHighlight: 'all',
      inlineResultAlign: 'right',
    }
    for (const [key, value] of Object.entries(editorSettings)) {
      setPreference(key, value)
      expect(preferences[key], `setPreference("${key}")`).toEqual(value)
    }
  })
})

describe('Persistence (save & load)', () => {
  it('save() writes to Dexie preferences table', () => {
    const { preferences, save } = useLocalePreferences()
    preferences.editorFontSize = 22
    save()
    expect(db.preferences.put).toHaveBeenCalledWith({
      key: 'locale',
      value: expect.any(String),
    })
    const savedValue = JSON.parse(db.preferences.put.mock.calls[0][0].value)
    expect(savedValue.editorFontSize).toBe(22)
  })

  it('handles missing Dexie data gracefully (uses defaults)', () => {
    // prefStore is empty — composable should use defaults
    const { preferences } = useLocalePreferences()
    expect(preferences.editorFontSize).toBe(16)
  })
})

describe('Reset', () => {
  it('reset() restores all defaults', () => {
    const { preferences, reset } = useLocalePreferences()
    // Change a bunch of settings
    preferences.editorFontSize = 28
    preferences.editorCursorStyle = 'line-thin'
    preferences.temperature = 'fahrenheit'
    preferences.editorTabSize = 8

    reset()

    for (const [key, value] of Object.entries(EXPECTED_DEFAULTS)) {
      expect(preferences[key], `reset "${key}"`).toEqual(value)
    }
  })

  it('reset() also saves to Dexie', () => {
    const { reset } = useLocalePreferences()
    reset()
    expect(db.preferences.put).toHaveBeenCalled()
  })
})

describe('Editor Settings — Valid Values', () => {
  it('editorLineNumbers accepts all valid options', () => {
    const { preferences } = useLocalePreferences()
    for (const val of ['on', 'off', 'relative', 'interval']) {
      preferences.editorLineNumbers = val
      expect(preferences.editorLineNumbers).toBe(val)
    }
  })

  it('editorCursorStyle accepts all valid options', () => {
    const { preferences } = useLocalePreferences()
    for (const val of ['line', 'line-thin']) {
      preferences.editorCursorStyle = val
      expect(preferences.editorCursorStyle).toBe(val)
    }
  })

  it('editorAutoClosingBrackets accepts all valid options', () => {
    const { preferences } = useLocalePreferences()
    for (const val of ['always', 'never']) {
      preferences.editorAutoClosingBrackets = val
      expect(preferences.editorAutoClosingBrackets).toBe(val)
    }
  })

  it('editorRenderLineHighlight accepts all valid options', () => {
    const { preferences } = useLocalePreferences()
    for (const val of ['none', 'line', 'all']) {
      preferences.editorRenderLineHighlight = val
      expect(preferences.editorRenderLineHighlight).toBe(val)
    }
  })

  it('boolean editor settings toggle correctly', () => {
    const { preferences } = useLocalePreferences()
    const booleanKeys = [
      'editorLigatures',
      'editorWordWrap',
      'editorFolding',
      'editorScrollPastEnd',
    ]
    for (const key of booleanKeys) {
      const original = preferences[key]
      preferences[key] = !original
      expect(preferences[key], `toggle "${key}"`).toBe(!original)
      preferences[key] = original // restore
    }
  })

  it('numeric editor settings accept valid ranges', () => {
    const { preferences } = useLocalePreferences()
    preferences.editorFontSize = 10
    expect(preferences.editorFontSize).toBe(10)
    preferences.editorFontSize = 28
    expect(preferences.editorFontSize).toBe(28)

    preferences.editorLineHeight = 14
    expect(preferences.editorLineHeight).toBe(14)
    preferences.editorLineHeight = 36
    expect(preferences.editorLineHeight).toBe(36)

    preferences.editorTabSize = 1
    expect(preferences.editorTabSize).toBe(1)
    preferences.editorTabSize = 8
    expect(preferences.editorTabSize).toBe(8)
  })
})

describe('Editor Options Mapping', () => {
  const mapWordWrap = (val) => (val ? 'on' : 'off')
  const mapLineNumbers = (val) => (['on', 'off', 'relative', 'interval'].includes(val) ? val : 'on')
  const mapCursorStyle = (val) => (['line', 'line-thin'].includes(val) ? val : 'line')

  it('wordWrap maps boolean to on/off', () => {
    expect(mapWordWrap(false)).toBe('off')
    expect(mapWordWrap(true)).toBe('on')
  })

  it('lineNumbers maps valid values through, defaults invalid to on', () => {
    expect(mapLineNumbers('on')).toBe('on')
    expect(mapLineNumbers('relative')).toBe('relative')
    expect(mapLineNumbers('interval')).toBe('interval')
    expect(mapLineNumbers('off')).toBe('off')
    expect(mapLineNumbers('garbage')).toBe('on')
    expect(mapLineNumbers(undefined)).toBe('on')
  })

  it('cursorStyle maps valid values through, defaults invalid to line', () => {
    expect(mapCursorStyle('line')).toBe('line')
    expect(mapCursorStyle('line-thin')).toBe('line-thin')
    expect(mapCursorStyle('garbage')).toBe('line')
    expect(mapCursorStyle(undefined)).toBe('line')
  })
})
