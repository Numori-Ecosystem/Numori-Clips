// Display formatter — applies locale preferences to calculator result strings.
// This is a pure presentation layer: it transforms the display string the user sees
// without affecting internal calculator logic or stored values.

/**
 * Format a numeric string according to number format preference.
 * @param {string} numStr - The numeric part (e.g. "1234.56")
 * @param {string} numberFormat - 'comma_dot' | 'dot_comma' | 'space_comma'
 * @returns {string}
 */
const formatNumberString = (numStr, numberFormat) => {
  if (!numStr || numberFormat === 'comma_dot') return numStr

  // Parse the number string into integer and decimal parts
  const dotIdx = numStr.indexOf('.')
  const intPart = dotIdx >= 0 ? numStr.slice(0, dotIdx) : numStr
  const decPart = dotIdx >= 0 ? numStr.slice(dotIdx + 1) : ''

  // Replace thousands separator and decimal separator
  if (numberFormat === 'dot_comma') {
    const withThousands = intPart.replace(/,/g, '.')
    return decPart ? `${withThousands},${decPart}` : withThousands
  }
  if (numberFormat === 'space_comma') {
    const withThousands = intPart.replace(/,/g, '\u00A0') // non-breaking space
    return decPart ? `${withThousands},${decPart}` : withThousands
  }
  return numStr
}

/**
 * Truncate a number to a given number of decimal places (toward zero).
 * @param {number} num
 * @param {number} places
 * @returns {number}
 */
const truncateToDecimals = (num, places) => {
  const factor = Math.pow(10, places)
  return Math.trunc(num * factor) / factor
}

/**
 * Truncate a number to a given number of significant figures (toward zero).
 * @param {number} num
 * @param {number} sigFigs
 * @returns {number}
 */
const truncateToSigFigs = (num, sigFigs) => {
  if (num === 0) return 0
  const d = Math.ceil(Math.log10(Math.abs(num)))
  const places = sigFigs - d
  const factor = Math.pow(10, places)
  return Math.trunc(num * factor) / factor
}

/**
 * Apply precision to a raw numeric value.
 * @param {string} numStr - The numeric string from formatResult
 * @param {object} prefs - { precisionMode, roundingMode, decimalPlaces, significantFigures }
 * @returns {string}
 */
const applyPrecision = (numStr, prefs) => {
  const { precisionMode, roundingMode = 'round', decimalPlaces, significantFigures } = prefs
  if (precisionMode === 'auto') return numStr

  const num = parseFloat(numStr)
  if (!isFinite(num)) return numStr

  if (precisionMode === 'decimals') {
    if (Number.isInteger(num)) return num.toString()
    if (roundingMode === 'truncate') {
      return truncateToDecimals(num, decimalPlaces).toString().replace(/\.?0+$/, '')
    }
    return num.toFixed(decimalPlaces).replace(/0+$/, '').replace(/\.$/, '')
  }

  if (precisionMode === 'significant') {
    if (roundingMode === 'truncate') {
      return truncateToSigFigs(num, significantFigures).toString()
    }
    return Number(num.toPrecision(significantFigures)).toString()
  }

  return numStr
}

/**
 * Format a Date object according to dateFormat preference.
 * @param {Date} date
 * @param {string} dateFormat - e.g. 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'
 * @param {boolean} includeTime - whether to include time portion
 * @param {string} timeFormat - '12h' or '24h'
 * @returns {string}
 */
const formatDate = (date, dateFormat, includeTime, timeFormat) => {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()

  let datePart
  switch (dateFormat) {
    case 'MM/DD/YYYY': datePart = `${mm}/${dd}/${yyyy}`; break
    case 'YYYY/MM/DD': datePart = `${yyyy}/${mm}/${dd}`; break
    case 'DD.MM.YYYY': datePart = `${dd}.${mm}.${yyyy}`; break
    case 'YYYY-MM-DD': datePart = `${yyyy}-${mm}-${dd}`; break
    default: datePart = `${dd}/${mm}/${yyyy}`; break // DD/MM/YYYY
  }

  if (!includeTime) return datePart

  let timePart
  if (timeFormat === '24h') {
    const hh = String(date.getHours()).padStart(2, '0')
    const mi = String(date.getMinutes()).padStart(2, '0')
    const ss = String(date.getSeconds()).padStart(2, '0')
    timePart = `${hh}:${mi}:${ss}`
  } else {
    let hours = date.getHours()
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12 || 12
    const mi = String(date.getMinutes()).padStart(2, '0')
    const ss = String(date.getSeconds()).padStart(2, '0')
    timePart = `${hours}:${mi}:${ss} ${ampm}`
  }

  return `${datePart}, ${timePart}`
}

/**
 * Detect if a display string is a JS toLocaleString() date output and reformat it.
 * These look like "1/15/2025, 3:30:00 PM" or "3/11/2026, 12:00:00 AM".
 */
const LOCALE_DATETIME_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4}),\s+(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)$/i
const LOCALE_DATE_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/

/**
 * Detect if a display string is a toLocaleTimeString() output like "3:30 PM".
 */
const LOCALE_TIME_RE = /^(\d{1,2}):(\d{2})\s+(AM|PM)$/i

/**
 * Check if a string looks like a duration (e.g. "5 days", "3.5 days", "12 hours").
 */
const DURATION_RE = /^([\d.]+)\s+(second|seconds|minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years)$/

/**
 * Check if a string is a special format that should not be touched.
 */
const isSpecialFormat = (display) => {
  if (!display) return true
  if (display.startsWith('0x') || display.startsWith('0b') || display.startsWith('0o')) return true
  if (display.endsWith('%')) return true
  if (/^[\d.]+e[+-]?\d+$/i.test(display)) return true // scientific notation
  return false
}

/**
 * Main display formatter. Takes a raw result line from the calculator
 * and returns a locale-formatted display string.
 *
 * @param {string} display - The raw display string from the calculator
 * @param {number} value - The raw numeric value
 * @param {object} prefs - The locale preferences object
 * @returns {string} - The formatted display string
 */
export const formatDisplay = (display, value, prefs) => {
  if (!display) return display
  if (isSpecialFormat(display)) return display

  const { numberFormat, dateFormat, timeFormat } = prefs

  // 1. DateTime from toLocaleString: "M/D/YYYY, H:MM:SS AM/PM"
  const dtMatch = display.match(LOCALE_DATETIME_RE)
  if (dtMatch) {
    const month = parseInt(dtMatch[1])
    const day = parseInt(dtMatch[2])
    const year = parseInt(dtMatch[3])
    let hours = parseInt(dtMatch[4])
    const minutes = parseInt(dtMatch[5])
    const seconds = parseInt(dtMatch[6])
    const ampm = dtMatch[7].toUpperCase()
    if (ampm === 'PM' && hours !== 12) hours += 12
    if (ampm === 'AM' && hours === 12) hours = 0
    const date = new Date(year, month - 1, day, hours, minutes, seconds)
    return formatDate(date, dateFormat, true, timeFormat || '12h')
  }

  // 2. Date only from toLocaleDateString: "M/D/YYYY"
  const dateMatch = display.match(LOCALE_DATE_RE)
  if (dateMatch) {
    const month = parseInt(dateMatch[1])
    const day = parseInt(dateMatch[2])
    const year = parseInt(dateMatch[3])
    const date = new Date(year, month - 1, day)
    return formatDate(date, dateFormat, false, timeFormat || '12h')
  }

  // 3. Time only from toLocaleTimeString: "H:MM AM/PM"
  const timeMatch = display.match(LOCALE_TIME_RE)
  if (timeMatch) {
    let hours = parseInt(timeMatch[1])
    const minutes = timeMatch[2]
    const ampm = timeMatch[3].toUpperCase()
    if (timeFormat === '24h') {
      if (ampm === 'PM' && hours !== 12) hours += 12
      if (ampm === 'AM' && hours === 12) hours = 0
      return `${String(hours).padStart(2, '0')}:${minutes}`
    }
    return display // already 12h
  }

  // 4. Duration strings like "5 days" — don't apply precision, just number format
  const durMatch = display.match(DURATION_RE)
  if (durMatch) {
    const formatted = formatNumberString(durMatch[1], numberFormat)
    return `${formatted} ${durMatch[2]}`
  }

  // 5. Number with suffix (unit or currency): "1234.56 GBP", "25.4 cm"
  const numSuffixMatch = display.match(/^(-?[\d.]+(?:e[+-]?\d+)?)\s+(.+)$/)
  if (numSuffixMatch) {
    const numPart = applyPrecision(numSuffixMatch[1], prefs)
    const suffix = numSuffixMatch[2]
    const formatted = formatNumberString(numPart, numberFormat)
    return `${formatted} ${suffix}`
  }

  // 6. Plain number
  const plainNum = parseFloat(display)
  if (!isNaN(plainNum) && display.trim() === String(display.trim()) && /^-?[\d.]+(?:e[+-]?\d+)?$/.test(display.trim())) {
    const numPart = applyPrecision(display.trim(), prefs)
    return formatNumberString(numPart, numberFormat)
  }

  return display
}
