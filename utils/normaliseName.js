/**
 * Convert a human-friendly name into a normalised internal name.
 * Rules: lowercase, spaces → underscores, strip non-alphanumeric (except _),
 * collapse consecutive underscores, trim leading/trailing underscores.
 * Allows starting with a number.
 */
export const normaliseName = (name) => {
  return (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

/**
 * Generate a unique internal name given a base name and a set of existing
 * internal names. If the base already exists, appends _1, _2, etc.
 *
 * @param {string} base       - The raw normalised name (may be empty)
 * @param {string[]} existing - Array of internal names already in use
 * @param {string} [fallback] - Fallback if base normalises to empty (e.g. 'untitled_note')
 * @param {string|null} [selfId] - ID of the item being edited (excluded from collision check)
 * @param {Array} [items]     - Full items array with { id, internalName } for selfId filtering
 * @returns {string}
 */
export const uniqueInternalName = (
  base,
  existing,
  fallback = 'untitled',
  selfId = null,
  items = [],
) => {
  let name = normaliseName(base)
  if (!name) name = fallback

  // Build the set of names to check against, excluding self
  const taken = new Set()
  if (selfId && items.length) {
    for (const item of items) {
      if (item.id !== selfId && item.internalName) taken.add(item.internalName)
    }
  } else {
    for (const n of existing) {
      if (n) taken.add(n)
    }
  }

  if (!taken.has(name)) return name

  let i = 1
  while (taken.has(`${name}_${i}`)) i++
  return `${name}_${i}`
}
