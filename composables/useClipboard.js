/**
 * Clipboard management composable.
 *
 * Handles:
 *   - Storing and retrieving clips from Dexie (IndexedDB)
 *   - Receiving new clips from Electron's clipboard polling (via IPC)
 *   - Content-aware type classification
 *   - Favorites, deletion, search, and type filtering
 *   - Writing clips back to the system clipboard
 *
 * On Electron, clipboard monitoring happens in the main process and new
 * content is pushed to the renderer via 'clipboard-new-content' IPC.
 * On web/mobile, we fall back to polling navigator.clipboard (limited).
 *
 * State is shared as a singleton via a lazy-initialized closure so that
 * module-level ref() calls don't run during Nuxt's server analysis pass.
 */
import db from '~/db.js'
import {
  classifyClip,
  hashContent,
  generatePreview,
  generateTitle,
} from '~/utils/clipType.js'

// Lazy singleton — created on first call, shared across all consumers
let _instance = null
let _lastHash = null
let _electronListenerAttached = false
let _webPollTimer = null

function createInstance() {
  const clips = ref([])
  const searchQuery = ref('')
  const activeTypeFilter = ref(null)
  const showFavoritesOnly = ref(false)
  const isLoading = ref(false)
  const clipCount = ref(0)
  const incognitoMode = ref(false)

  // ── Load clips from Dexie ──────────────────────────────────────────
  const loadClips = async () => {
    isLoading.value = true
    try {
      const allClips = await db.clips.orderBy('createdAt').reverse().toArray()
      clips.value = allClips
      clipCount.value = allClips.length
    } catch (err) {
      console.error('[useClipboard] Failed to load clips:', err)
    } finally {
      isLoading.value = false
    }
  }

  // ── Filtered clips ─────────────────────────────────────────────────
  const filteredClips = computed(() => {
    let result = clips.value

    if (activeTypeFilter.value) {
      result = result.filter((c) => c.type === activeTypeFilter.value)
    }
    if (showFavoritesOnly.value) {
      result = result.filter((c) => c.favorite)
    }
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      result = result.filter(
        (c) =>
          (c.content && c.content.toLowerCase().includes(q)) ||
          (c.title && c.title.toLowerCase().includes(q)) ||
          (c.preview && c.preview.toLowerCase().includes(q)),
      )
    }

    return result
  })

  // ── Type counts ────────────────────────────────────────────────────
  const typeCounts = computed(() => {
    const counts = { text: 0, link: 0, image: 0, code: 0, color: 0, emoji: 0, file: 0 }
    for (const clip of clips.value) {
      if (counts[clip.type] !== undefined) counts[clip.type]++
    }
    return counts
  })

  // ── Add a new clip ─────────────────────────────────────────────────
  const addClip = async (content, options = {}) => {
    if (incognitoMode.value) return null
    if (!content || (typeof content === 'string' && !content.trim())) return null

    const hash = hashContent(content)
    if (hash === _lastHash) return null
    _lastHash = hash

    const existing = await db.clips.where('hash').equals(hash).first()
    if (existing) {
      const now = Date.now()
      await db.clips.update(existing.id, { createdAt: now, updatedAt: now })
      await loadClips()
      return existing
    }

    const { type, meta } = classifyClip(content, options)
    const now = Date.now()

    // If it's an image from a file path, read the file and convert to data URL
    let finalContent = content
    if (type === 'image' && meta.filePath && window.electronAPI?.readImageFile) {
      try {
        const dataUrl = await window.electronAPI.readImageFile(meta.filePath)
        if (dataUrl) finalContent = dataUrl
      } catch (err) {
        console.error('[useClipboard] Failed to read image file:', err)
      }
    }

    const clip = {
      hash,
      content: finalContent,
      type,
      meta,
      preview: generatePreview(finalContent, type),
      title: generateTitle(content, type, meta),
      favorite: false,
      syncStatus: 'local',
      createdAt: now,
      updatedAt: now,
    }

    try {
      clip.id = await db.clips.add(clip)
      clips.value = [clip, ...clips.value]
      clipCount.value++
      return clip
    } catch (err) {
      if (err.name === 'ConstraintError') return null
      console.error('[useClipboard] Failed to add clip:', err)
      return null
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────
  const deleteClip = async (id) => {
    try {
      await db.clips.delete(id)
      clips.value = clips.value.filter((c) => c.id !== id)
      clipCount.value = Math.max(0, clipCount.value - 1)
    } catch (err) {
      console.error('[useClipboard] Failed to delete clip:', err)
    }
  }

  // ── Toggle favorite ────────────────────────────────────────────────
  const toggleFavorite = async (id) => {
    const clip = clips.value.find((c) => c.id === id)
    if (!clip) return
    const newFav = !clip.favorite
    try {
      await db.clips.update(id, { favorite: newFav, updatedAt: Date.now() })
      clip.favorite = newFav
    } catch (err) {
      console.error('[useClipboard] Failed to toggle favorite:', err)
    }
  }

  // ── Clear all ──────────────────────────────────────────────────────
  const clearAll = async () => {
    try {
      await db.clips.clear()
      clips.value = []
      clipCount.value = 0
      _lastHash = null
    } catch (err) {
      console.error('[useClipboard] Failed to clear clips:', err)
    }
  }

  // ── Copy to system clipboard ───────────────────────────────────────
  const copyToClipboard = async (clip) => {
    try {
      if (window.electronAPI?.writeClipboard) {
        window.electronAPI.writeClipboard(clip.content, clip.type)
      } else {
        await navigator.clipboard.writeText(clip.content)
      }
      _lastHash = clip.hash
      return true
    } catch (err) {
      console.error('[useClipboard] Failed to copy to clipboard:', err)
      return false
    }
  }

  // ── Electron IPC listener ──────────────────────────────────────────
  const initElectronListener = () => {
    if (_electronListenerAttached) return
    if (!window.electronAPI?.onClipboardContent) return
    _electronListenerAttached = true

    window.electronAPI.onClipboardContent((data) => {
      if (data.type === 'image') {
        addClip(data.content, { hasImage: true })
      } else {
        addClip(data.content)
      }
    })
  }

  // ── Web fallback polling ───────────────────────────────────────────
  const startWebPolling = () => {
    if (window.electronAPI?.isElectron || _webPollTimer) return
    _webPollTimer = setInterval(async () => {
      try {
        if (!document.hasFocus()) return
        const text = await navigator.clipboard.readText()
        if (text) addClip(text)
      } catch { /* permission denied */ }
    }, 1000)
  }

  const stopWebPolling = () => {
    if (_webPollTimer) {
      clearInterval(_webPollTimer)
      _webPollTimer = null
    }
  }

  // ── Init / Destroy ─────────────────────────────────────────────────
  const init = async () => {
    await loadClips()
    if (clips.value.length > 0) {
      _lastHash = clips.value[0].hash
    }
    if (window.electronAPI?.isElectron) {
      initElectronListener()
    } else {
      startWebPolling()
    }
  }

  const destroy = () => {
    stopWebPolling()
  }

  return {
    clips,
    filteredClips,
    searchQuery,
    activeTypeFilter,
    showFavoritesOnly,
    incognitoMode,
    isLoading,
    clipCount,
    typeCounts,
    init,
    destroy,
    addClip,
    deleteClip,
    toggleFavorite,
    clearAll,
    copyToClipboard,
    loadClips,
  }
}

export const useClipboard = () => {
  if (!_instance) _instance = createInstance()
  return _instance
}
