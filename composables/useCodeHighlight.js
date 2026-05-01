/**
 * Code syntax highlighting composable.
 *
 * Uses highlight.js with selective language registration to keep the bundle
 * small. Adapted from Numori Notes' implementation for use in clip cards.
 *
 * Exports:
 *   highlightCode(code, lang) — returns highlighted HTML string
 *   detectLanguageName(lang)  — returns a display-friendly language name
 */
import hljs from 'highlight.js/lib/core'

// Register only the languages we need
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import php from 'highlight.js/lib/languages/php'
import ruby from 'highlight.js/lib/languages/ruby'
import perl from 'highlight.js/lib/languages/perl'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import yaml from 'highlight.js/lib/languages/yaml'
import ini from 'highlight.js/lib/languages/ini'
import diff from 'highlight.js/lib/languages/diff'
import sql from 'highlight.js/lib/languages/sql'
import markdown from 'highlight.js/lib/languages/markdown'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import java from 'highlight.js/lib/languages/java'
import kotlin from 'highlight.js/lib/languages/kotlin'
import swift from 'highlight.js/lib/languages/swift'
import lua from 'highlight.js/lib/languages/lua'
import dockerfile from 'highlight.js/lib/languages/dockerfile'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('c', c)
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('csharp', csharp)
hljs.registerLanguage('php', php)
hljs.registerLanguage('ruby', ruby)
hljs.registerLanguage('perl', perl)
hljs.registerLanguage('css', css)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('json', json)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('ini', ini)
hljs.registerLanguage('diff', diff)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('go', go)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('java', java)
hljs.registerLanguage('kotlin', kotlin)
hljs.registerLanguage('swift', swift)
hljs.registerLanguage('lua', lua)
hljs.registerLanguage('dockerfile', dockerfile)

// Aliases for common language identifiers
const LANG_ALIASES = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  rb: 'ruby',
  sh: 'bash',
  shell: 'bash',
  fish: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  toml: 'ini',
  dotenv: 'ini',
  env: 'ini',
  html: 'xml',
  htm: 'xml',
  svg: 'xml',
  'c++': 'cpp',
  'c#': 'csharp',
  cs: 'csharp',
  kt: 'kotlin',
  rs: 'rust',
  md: 'markdown',
  docker: 'dockerfile',
}

// Display-friendly language names
const LANG_DISPLAY_NAMES = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  c: 'C',
  cpp: 'C++',
  csharp: 'C#',
  php: 'PHP',
  ruby: 'Ruby',
  perl: 'Perl',
  css: 'CSS',
  xml: 'HTML/XML',
  html: 'HTML',
  bash: 'Shell',
  json: 'JSON',
  yaml: 'YAML',
  ini: 'INI/TOML',
  diff: 'Diff',
  sql: 'SQL',
  markdown: 'Markdown',
  go: 'Go',
  rust: 'Rust',
  java: 'Java',
  kotlin: 'Kotlin',
  swift: 'Swift',
  lua: 'Lua',
  dockerfile: 'Dockerfile',
  plaintext: 'Code',
}

/**
 * Highlight a code string and return the HTML output.
 *
 * @param {string} code — raw code content
 * @param {string} [lang] — language hint (from detectCodeLanguage)
 * @returns {string} — highlighted HTML string safe for v-html
 */
export function highlightCode(code, lang) {
  const resolved = LANG_ALIASES[lang?.toLowerCase()] || lang?.toLowerCase() || ''

  try {
    if (resolved && hljs.getLanguage(resolved)) {
      return hljs.highlight(code, { language: resolved, ignoreIllegals: true }).value
    }
    // Auto-detect if no language hint or unknown language
    return hljs.highlightAuto(code).value
  } catch {
    // Fallback: return escaped plain text
    return escapeHtml(code)
  }
}

/**
 * Get a display-friendly name for a language identifier.
 */
export function detectLanguageName(lang) {
  if (!lang) return 'Code'
  const resolved = LANG_ALIASES[lang.toLowerCase()] || lang.toLowerCase()
  return LANG_DISPLAY_NAMES[resolved] || lang.charAt(0).toUpperCase() + lang.slice(1)
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
