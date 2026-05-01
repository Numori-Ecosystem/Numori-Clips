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
// Heuristic: contains code-like patterns. Uses a scoring system where
// stronger signals (like import statements) carry more weight.
//
// The approach is layered:
//   1. Strong signals — a single match is decisive (e.g. `import … from`)
//   2. General indicators — need 2+ matches for multi-line content
//   3. Structural analysis — bracket/brace density as a fallback

const CODE_INDICATORS = [
  /^\s*(import|export|from|require)\s/m,
  /^\s*(function|const|let|var|class|interface|type|enum)\s/m,
  /^\s*(if|else|for|while|switch|return|throw|try|catch)\s*[({]/m,
  /^\s*(def|async def|class)\s/m,           // Python
  /^\s*(pub fn|fn|impl|struct|enum|use)\s/m, // Rust
  /[{};]\s*$/m,                              // C-like line endings
  /^\s*<\/?[a-z][\w-]*[\s>]/im,             // HTML/XML tags
  /^\s*@\w+/m,                               // Decorators/annotations
  /=>\s*[{(]/,                               // Arrow functions
  /^\s*#\s*(include|define|ifdef|pragma)/m,  // C preprocessor
  /^\s*(public|private|protected)\s/m,       // Access modifiers (Java/C#/TS)
  /^\s*(package|func |import ")/m,           // Go
  /^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s/im, // SQL
  /^\s*\$[\w_]+\s*=/m,                       // PHP variables
  /^\s*module\.exports\s*=/m,                // CommonJS
  /^\s*console\.(log|error|warn|info)\(/m,   // JS console
  /^\s*print\s*\(/m,                         // Python print
  /^\s*(?:async\s+)?function\s*\w*\s*\(/m,  // Function declarations
  /^\s*(echo|export|alias|source)\s/m,       // Shell builtins
  /^\s*(local|readonly)\s+\w+=/m,            // Shell/Lua locals
  /^\s*\[\[.*\]\]/m,                         // Bash conditionals
]

// Strong signals — a single match is enough to classify as code
const STRONG_CODE_SIGNALS = [
  /^\s*import\s+.*\s+from\s+['"].*['"]/m,   // ES module import
  /^\s*const\s+\w+\s*=\s*require\s*\(/m,    // CommonJS require
  /^\s*#!\s*\/.*\b(bash|sh|node|python|ruby|perl)\b/m, // Shebang
  /^\s*<\?php/m,                              // PHP opening tag
  /^\s*package\s+\w+/m,                       // Java/Go package
  /^\s*#\s*include\s*[<"]/m,                  // C/C++ include
  /^\s*using\s+System/m,                      // C# using
  /^\s*import\s+\w+\.\w+/m,                  // Java import
  /^\s*from\s+\w+\s+import\s+/m,             // Python from-import
  /^\s*def\s+\w+\s*\(.*\)\s*(->\s*\w+\s*)?:/m, // Python function def
  /^\s*fn\s+\w+\s*\(/m,                      // Rust function
  /^\s*func\s+\w+\s*\(/m,                    // Go function
  /^\s*<!DOCTYPE\s/im,                        // HTML doctype
  /^\s*<html[\s>]/im,                         // HTML root
  /^\s*@(media|keyframes|font-face|import|charset|supports|layer)\b/m, // CSS at-rules
  /^\s*(SELECT|INSERT INTO|CREATE TABLE|ALTER TABLE|DROP TABLE)\s/im,  // SQL DDL/DML
  /^\s*FROM\s+\S+.*\n\s*(RUN|CMD|COPY|ADD|EXPOSE|WORKDIR|ENV)\s/m,    // Dockerfile
  /^[-+]{3}\s.*\n.*\n@@\s/m,                 // Unified diff
]

/**
 * Detect CSS/SCSS/LESS content.
 * CSS is tricky because `property: value;` looks like plain text.
 * We look for selector + block patterns with known CSS properties.
 */
const CSS_PROPERTY_RE = /\b(display|position|margin|padding|border|background|color|font|width|height|top|left|right|bottom|flex|grid|align|justify|overflow|opacity|z-index|transform|transition|animation|box-shadow|box-sizing|text-align|text-decoration|line-height|letter-spacing|cursor|visibility|content|gap|max-width|min-width|max-height|min-height|float|clear|outline|white-space|vertical-align|list-style|pointer-events|user-select|appearance)\s*:/m

function isCssLike(text) {
  const t = text.trim()
  // Must have at least one selector-like pattern followed by a block
  // Selectors can start with *, ., #, @, :, or a word character
  const hasBlock = /[*.#@:\w][\w\s*.#:,>+~[\]()=-]*\{[^}]*\}/s.test(t)
  if (!hasBlock) return false
  // Must contain recognizable CSS properties
  return CSS_PROPERTY_RE.test(t)
}

/**
 * Detect JSON content.
 * Looks for object/array structure with quoted keys.
 */
function isJsonLike(text) {
  const t = text.trim()
  // Must start with { or [ and end with } or ]
  if (!/^\s*[{[]/.test(t) || !/[}\]]\s*$/.test(t)) return false
  // Must have quoted keys (for objects) or be a non-trivial array
  if (/^\s*\{/.test(t)) return /"[\w$]+":\s/.test(t)
  // Array: must have multiple elements
  return t.split('\n').length >= 2
}

/**
 * Detect YAML content.
 * key: value pairs without braces, often with indentation-based nesting.
 */
function isYamlLike(text) {
  const t = text.trim()
  const lines = t.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'))
  if (lines.length < 2) return false
  // Must have at least two key: value pairs to avoid matching prose like "TODO:\n- item"
  const kvLines = lines.filter((l) => /^\s*[\w][\w.-]*\s*:\s+\S/.test(l))
  if (kvLines.length < 2) return false
  // Most lines should match key: value or be list items (- item)
  let yamlLines = 0
  for (const line of lines) {
    if (/^\s*[\w][\w.-]*\s*:(\s|$)/.test(line) || /^\s*-\s/.test(line)) {
      yamlLines++
    }
  }
  return yamlLines / lines.length >= 0.6
}

/**
 * Detect shell script content.
 */
function isShellLike(text) {
  const t = text.trim()
  const lines = t.split('\n')
  if (lines.length < 2) return false

  const shellPatterns = [
    /^\s*(if|then|else|elif|fi|for|do|done|while|case|esac)\b/,
    /^\s*(echo|export|alias|source|chmod|mkdir|rm|cp|mv|grep|awk|sed|cat|cd|ls|pwd|curl|wget|apt|yum|brew|npm|pip|git|docker|sudo)\s/,
    /^\s*(local|readonly)\s+\w+=/,
    /\$\{?\w+\}?/,                           // Variable expansion
    /\|\s*\w+/,                               // Pipe
    /^\s*#\s*\w/,                             // Comments (not shebangs)
    /&&\s*\w/,                                // Command chaining
    /^\s*\w+=\S+/,                            // Variable assignment (VAR=value)
  ]

  let score = 0
  for (const pattern of shellPatterns) {
    if (pattern.test(t)) score++
  }
  // Also count how many lines start with common commands
  let cmdLines = 0
  for (const line of lines) {
    if (/^\s*(echo|export|mkdir|rm|cp|mv|grep|cat|cd|ls|curl|wget|sudo|apt|npm|pip|git|docker|chmod|chown|tar|unzip|ssh|scp)\s/.test(line.trim())) {
      cmdLines++
    }
  }
  // If most lines are commands, that's a strong signal
  if (cmdLines >= 2 && cmdLines / lines.length >= 0.4) return true
  return score >= 2
}

function isCode(text) {
  const t = text.trim()
  const lines = t.split('\n')

  // Check strong signals first — a single match is decisive
  for (const pattern of STRONG_CODE_SIGNALS) {
    if (pattern.test(t)) return true
  }

  // Language-specific structural checks
  if (isCssLike(t)) return true
  if (isJsonLike(t)) return true
  if (isYamlLike(t)) return true
  if (isShellLike(t)) return true

  // For multi-line content, use the scoring system
  if (lines.length < 2) return false

  let score = 0
  for (const pattern of CODE_INDICATORS) {
    if (pattern.test(t)) score++
  }

  // Structural heuristic: high density of braces/semicolons across lines
  // suggests code even if no specific keyword matched
  if (score === 1 && lines.length >= 3) {
    const braceLines = lines.filter((l) => /[{};]/.test(l)).length
    if (braceLines / lines.length >= 0.3) score++
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

  // Shebang line — strongest signal
  const shebang = t.match(/^#!\s*\/.*\b(bash|sh|node|python[23]?|ruby|perl)\b/m)
  if (shebang) {
    const interp = shebang[1]
    if (interp === 'node') return 'javascript'
    if (interp.startsWith('python')) return 'python'
    if (interp === 'sh' || interp === 'bash') return 'bash'
    return interp
  }

  // PHP opening tag
  if (/^\s*<\?php/m.test(t)) return 'php'

  // Dockerfile
  if (/^\s*FROM\s+\S+/m.test(t) && /^\s*(RUN|CMD|COPY|ADD|EXPOSE|WORKDIR|ENV)\s/m.test(t)) return 'dockerfile'

  // Diff (check early — very distinctive)
  if (/^[-+]{3}\s/m.test(t) && /^@@\s/m.test(t)) return 'diff'

  // HTML/XML (check before JS since JSX can confuse things)
  if (/^\s*<!DOCTYPE\s+html/im.test(t)) return 'html'
  if (/^\s*<(html|head|body|div|span|p|a|img|script|style|link|meta)\b/im.test(t)) return 'html'

  // CSS / SCSS / LESS — check before general languages
  if (isCssLike(t)) return 'css'
  if (/^\s*@(media|keyframes|font-face|import|charset|supports|layer)\b/m.test(t) && CSS_PROPERTY_RE.test(t)) return 'css'

  // TypeScript (check before JS — look for type annotations)
  if (/:\s*(string|number|boolean|void|any|never|unknown)\b/.test(t) ||
      /\binterface\s+\w+/.test(t) ||
      /\btype\s+\w+\s*=/.test(t)) return 'typescript'

  // JavaScript / ES modules
  if (/^\s*(import|export)\s.*\bfrom\b/m.test(t) || /=>\s*[{(]/.test(t) ||
      /\bconst\s+\w+\s*=\s*require\s*\(/.test(t) || /\bconsole\.\w+\(/.test(t)) return 'javascript'

  // Python
  if (/^\s*(def|class|import|from|print|if __name__)/m.test(t) ||
      /^\s*async\s+def\s/m.test(t)) return 'python'

  // Rust
  if (/^\s*(pub fn|fn |impl |struct |use |mod )/m.test(t) ||
      /\blet\s+mut\s/.test(t)) return 'rust'

  // Go
  if (/^\s*(package|func |import ")/m.test(t) ||
      /\b:=\s/.test(t) && /\bfunc\b/.test(t)) return 'go'

  // C/C++
  if (/^\s*#\s*(include|define|ifdef)/m.test(t)) {
    // Distinguish C++ from C
    if (/\b(class|namespace|template|std::)\b/.test(t)) return 'cpp'
    return 'c'
  }

  // Java
  if (/^\s*(public|private|protected)\s+(static\s+)?(void|int|String|class)/m.test(t) ||
      /^\s*import\s+\w+\.\w+/m.test(t)) return 'java'

  // C#
  if (/^\s*using\s+System/m.test(t) || /\bnamespace\s+\w+/m.test(t) && /\bclass\s+\w+/m.test(t)) return 'csharp'

  // Kotlin
  if (/^\s*(fun |val |var |data class |sealed class |object )/m.test(t)) return 'kotlin'

  // Swift
  if (/^\s*(func |let |var |struct |protocol |guard )/m.test(t) && /\b(->|@objc|import\s+\w+)\b/.test(t)) return 'swift'

  // SQL
  if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s/im.test(t)) return 'sql'

  // JSON
  if (isJsonLike(t)) return 'json'

  // YAML
  if (isYamlLike(t)) return 'yaml'

  // Bash/Shell
  if (isShellLike(t)) return 'bash'
  if (/^\s*(echo|export|alias|source|chmod|mkdir|rm|cp|mv|grep|awk|sed)\s/m.test(t)) return 'bash'

  // Lua
  if (/^\s*(local\s+\w+|function\s+\w+)/m.test(t) && /\bend\b/m.test(t)) return 'lua'

  // Ruby
  if (/^\s*(require|puts|def\s+\w+|class\s+\w+)/m.test(t) && /\bend\b/m.test(t)) return 'ruby'

  // PHP (without opening tag)
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
