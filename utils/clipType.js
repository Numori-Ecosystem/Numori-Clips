/**
 * Content-aware clip type detection.
 *
 * Classifies clipboard content into one of the supported types:
 *   text, link, image, code, color, emoji, file
 *
 * Detection is intentionally conservative — if unsure, defaults to 'text'.
 * Order matters: more specific types are checked first.
 */

// ── Color detection ──────────────────────────────────────────────────────
// Matches hex (#fff, #ffffff, #ffffffff), rgb(), rgba(), hsl(), hsla()
const HEX_RE = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const RGB_RE = /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*[\d.]+\s*)?\)$/i
const HSL_RE = /^hsla?\(\s*\d{1,3}\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*(?:,\s*[\d.]+\s*)?\)$/i

function isColor(text) {
  const t = text.trim()
  return HEX_RE.test(t) || RGB_RE.test(t) || HSL_RE.test(t)
}

/**
 * Parse a color string into a normalized hex value for preview rendering.
 * Returns null if parsing fails.
 */
export function parseColorHex(text) {
  const t = text.trim()
  if (HEX_RE.test(t)) {
    // Normalize 3-char hex to 6-char
    if (t.length === 4) {
      return `#${t[1]}${t[1]}${t[2]}${t[2]}${t[3]}${t[3]}`
    }
    return t.slice(0, 7) // strip alpha if 8-char
  }
  if (RGB_RE.test(t)) {
    const m = t.match(/\d+/g)
    if (m && m.length >= 3) {
      const [r, g, b] = m.map(Number)
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
    }
  }
  return null
}

// ── Emoji detection ──────────────────────────────────────────────────────
// A string is "emoji" if it's 1-5 emoji characters with optional ZWJ/variation selectors
const EMOJI_RE = /^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\u200D(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*$/u

function isEmoji(text) {
  const t = text.trim()
  // Must be short (emoji sequences are typically < 30 chars including ZWJ)
  return t.length <= 30 && EMOJI_RE.test(t)
}

// ── Link detection ───────────────────────────────────────────────────────
const URL_RE = /^https?:\/\/[^\s]+$/i

function isLink(text) {
  const t = text.trim()
  return URL_RE.test(t)
}

// ── File path detection ──────────────────────────────────────────────────
// Unix absolute paths, Windows drive paths, or file:// URIs
// Allows spaces, special characters, and unicode in path segments
const FILE_PATH_RE = /^(?:\/[^\n]+|[A-Z]:\\[^\n]+|file:\/\/\/[^\n]+)$/i

function isFilePath(text) {
  const t = text.trim()
  // Must be a single line and look like an absolute path
  if (t.includes('\n')) return false
  return FILE_PATH_RE.test(t)
}

// ── Code detection ───────────────────────────────────────────────────────
// Heuristic: contains multiple lines with code-like patterns
const CODE_INDICATORS = [
  /^\s*(import|export|from|require)\s/m,
  /^\s*(function|const|let|var|class|interface|type|enum)\s/m,
  /^\s*(if|else|for|while|switch|return|throw|try|catch)\s*[({]/m,
  /^\s*(def|async def|class)\s/m,           // Python
  /^\s*(pub fn|fn|impl|struct|enum|use)\s/m, // Rust
  /[{};]\s*$/m,                              // C-like line endings
  /^\s*<\/?[a-z][\w-]*[\s>]/im,             // HTML/XML tags
  /^\s*@\w+/m,                               // Decorators/annotations
  /=>\s*{/,                                  // Arrow functions
  /^\s*#\s*(include|define|ifdef|pragma)/m,  // C preprocessor
]

function isCode(text) {
  const t = text.trim()
  // Must be multi-line or have strong code signals
  const lines = t.split('\n')
  if (lines.length < 2) return false

  let score = 0
  for (const pattern of CODE_INDICATORS) {
    if (pattern.test(t)) score++
  }
  // Need at least 2 code indicators to classify as code
  return score >= 2
}

/**
 * Attempt to detect the programming language from code content.
 * Returns a language hint string or 'plaintext'.
 */
export function detectCodeLanguage(text) {
  const t = text.trim()
  if (/^\s*<(!DOCTYPE|html|head|body|div|span|p|a|img|script|style|link|meta)\b/im.test(t)) return 'html'
  if (/^\s*(import|export|from)\s.*\bfrom\b/m.test(t) || /=>\s*{/.test(t)) return 'javascript'
  if (/^\s*(def|class|import|from|print|if __name__)/m.test(t)) return 'python'
  if (/^\s*(pub fn|fn |impl |struct |use |mod )/m.test(t)) return 'rust'
  if (/^\s*(package|func |import ")/m.test(t)) return 'go'
  if (/^\s*#\s*(include|define|ifdef)/m.test(t)) return 'c'
  if (/^\s*(public|private|protected)\s+(static\s+)?(void|int|String|class)/m.test(t)) return 'java'
  if (/^\s*\{[\s\S]*"[\w]+":/m.test(t)) return 'json'
  if (/^\s*[\w-]+\s*:\s*.+/m.test(t) && !/{/.test(t)) return 'yaml'
  if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s/im.test(t)) return 'sql'
  if (/^\s*\$[\w_]+\s*=/m.test(t)) return 'php'
  return 'plaintext'
}

// ── Image detection (data URL) ───────────────────────────────────────────
const DATA_IMAGE_RE = /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml|bmp);base64,/i

function isImageDataUrl(text) {
  return DATA_IMAGE_RE.test(text.trim())
}

// ── SVG detection ────────────────────────────────────────────────────────
const SVG_RE = /^\s*<svg[\s>]/i

function isSvgContent(text) {
  const t = text.trim()
  return SVG_RE.test(t) && /<\/svg>\s*$/i.test(t)
}

// ── Image file path detection ────────────────────────────────────────────
const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif|tiff?)$/i

function isImageFilePath(text) {
  const t = text.trim()
  // Single line, ends with an image extension, and looks like a path (starts with /, ~, drive letter, or file://)
  if (t.includes('\n')) return false
  if (!IMAGE_EXT_RE.test(t)) return false
  return /^(?:\/|~\/|[A-Z]:\\|file:\/\/\/)/i.test(t)
}

// ── Main classifier ──────────────────────────────────────────────────────

/**
 * Classify clipboard content into a type.
 *
 * @param {string} content — the raw clipboard text
 * @param {object} [options] — optional hints
 * @param {boolean} [options.hasImage] — true if clipboard contained an image (from Electron)
 * @returns {{ type: string, meta: object }}
 */
export function classifyClip(content, options = {}) {
  // Image from Electron clipboard (binary → data URL)
  if (options.hasImage || isImageDataUrl(content)) {
    return { type: 'image', meta: {} }
  }

  const text = typeof content === 'string' ? content : ''
  if (!text.trim()) return { type: 'text', meta: {} }

  // Raw SVG markup → render as image
  if (isSvgContent(text)) {
    return { type: 'image', meta: { svg: true } }
  }

  // Order: most specific → least specific
  if (isColor(text)) {
    return { type: 'color', meta: { hex: parseColorHex(text) } }
  }
  if (isEmoji(text)) {
    return { type: 'emoji', meta: {} }
  }
  if (isLink(text)) {
    try {
      const url = new URL(text.trim())
      return { type: 'link', meta: { domain: url.hostname } }
    } catch {
      return { type: 'link', meta: {} }
    }
  }
  if (isFilePath(text)) {
    if (isImageFilePath(text)) {
      return { type: 'image', meta: { filePath: text.trim() } }
    }
    return { type: 'file', meta: { path: text.trim() } }
  }
  // Image file path — checked independently since FILE_PATH_RE may not match all valid paths
  if (isImageFilePath(text)) {
    return { type: 'image', meta: { filePath: text.trim() } }
  }
  if (isCode(text)) {
    return { type: 'code', meta: { language: detectCodeLanguage(text) } }
  }

  return { type: 'text', meta: {} }
}

/**
 * Generate a content hash for deduplication.
 * Uses a simple FNV-1a 32-bit hash — fast and sufficient for local dedup.
 */
export function hashContent(content) {
  let hash = 0x811c9dc5
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i)
    hash = (hash * 0x01000193) >>> 0
  }
  return hash.toString(36)
}

/**
 * Generate a short preview string for display in clip cards.
 */
export function generatePreview(content, type, maxLength = 200) {
  if (type === 'image') return '[Image]'
  if (type === 'color') return content.trim()
  if (type === 'emoji') return content.trim()
  if (type === 'link') return content.trim()
  if (type === 'file') return content.trim()

  const text = content.trim()
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '…'
}

/**
 * Generate a title for the clip based on its type.
 */
export function generateTitle(content, type, meta = {}) {
  if (type === 'link' && meta.domain) return meta.domain
  if (type === 'color') return content.trim().toUpperCase()
  if (type === 'emoji') return 'Emoji'
  if (type === 'image') {
    if (meta.filePath) {
      const parts = meta.filePath.replace(/\\/g, '/').split('/')
      return parts[parts.length - 1] || 'Image'
    }
    return 'Image'
  }
  if (type === 'file') {
    const parts = content.trim().replace(/\\/g, '/').split('/')
    return parts[parts.length - 1] || 'File'
  }
  if (type === 'code' && meta.language) {
    return meta.language.charAt(0).toUpperCase() + meta.language.slice(1)
  }
  // Text: first line, truncated
  const firstLine = content.trim().split('\n')[0]
  if (firstLine.length <= 60) return firstLine
  return firstLine.slice(0, 57) + '…'
}
