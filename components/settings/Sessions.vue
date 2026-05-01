<template>
  <div class="p-5 md:p-8">
    <div class="max-w-2xl mx-auto">
      <SettingsSectionHeader icon="mdi:devices" title="Active Sessions" description="Manage your logged-in devices" />
      <div v-if="loading" class="flex items-center justify-center py-8">
        <Icon name="mdi:loading" class="w-6 h-6 text-gray-400 animate-spin" />
      </div>
      <template v-else>
        <UiButton v-if="sessions.length > 1" variant="ghost" color="red" block :loading="saving" class="mb-4" @click="closeOtherSessions">
          <Icon v-if="!saving" name="mdi:logout-variant" class="w-4 h-4" /> Close all other sessions
        </UiButton>
        <div class="space-y-2">
          <div v-for="s in sessions" :key="s.id" class="px-3 py-2.5 rounded-lg border"
            :class="s.isCurrent ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800'">
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5">
                  <Icon :name="getDeviceIcon(s.deviceName)" class="w-4 h-4 flex-shrink-0" :class="s.isCurrent ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'" />
                  <p class="text-sm font-medium truncate" :class="s.isCurrent ? 'text-primary-700 dark:text-primary-300' : 'text-gray-900 dark:text-gray-200'">{{ s.deviceName || 'Unknown device' }}</p>
                  <span v-if="s.isCurrent" class="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 flex-shrink-0">current</span>
                </div>
                <div class="mt-1 space-y-0.5">
                  <p v-if="s.location || s.ipAddress" class="text-xs text-gray-500 dark:text-gray-500 truncate">{{ s.location || s.ipAddress }}</p>
                  <p class="text-xs text-gray-400 dark:text-gray-600">Last active {{ formatDate(s.lastUsedAt) }} · Opened {{ formatDate(s.createdAt) }}</p>
                  <p v-if="s.expiresAt" class="text-xs text-gray-400 dark:text-gray-600">Expires {{ formatDate(s.expiresAt) }}</p>
                </div>
              </div>
              <UiButton v-if="!s.isCurrent" variant="ghost" color="red" size="xs" icon-only :disabled="saving" class="flex-shrink-0" title="Close session" @click="closeSession(s.id)">
                <Icon name="mdi:close" class="w-4 h-4" />
              </UiButton>
            </div>
          </div>
        </div>
        <div v-if="!sessions.length" class="text-center py-8">
          <Icon name="mdi:devices" class="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p class="text-sm text-gray-500 dark:text-gray-500">No active sessions</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  authHeaders: { type: Object, default: () => ({}) },
})

const toast = useToast()
const { apiFetch } = useApi()

const sessions = ref([])
const loading = ref(false)
const saving = ref(false)

const showFeedback = (msg, type = 'success') => {
  toast.show(msg, { type: type === 'error' ? 'error' : 'success', icon: type === 'error' ? 'mdi:alert-circle-outline' : 'mdi:check-circle-outline' })
}

const formatDate = (iso) => {
  if (!iso) return 'Unknown'; const d = new Date(iso); const now = new Date(); const diff = now - d
  if (diff < 0) { const ahead = -diff; if (ahead < 3600000) return `in ${Math.ceil(ahead / 60000)}m`; if (ahead < 86400000) return `in ${Math.floor(ahead / 3600000)}h`; if (ahead < 7 * 86400000) return `in ${Math.floor(ahead / 86400000)}d`; return d.toLocaleDateString() }
  if (diff < 60000) return 'just now'; if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`; if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`; if (diff < 7 * 86400000) return `${Math.floor(diff / 86400000)}d ago`; return d.toLocaleDateString()
}

const getDeviceIcon = (deviceName) => {
  if (!deviceName) return 'mdi:help-circle-outline'
  const d = deviceName.toLowerCase()
  if (d.includes('android')) return 'mdi:android'; if (d.includes('ios') || d.includes('iphone') || d.includes('ipad')) return 'mdi:apple'
  if (d.includes('mobile') || d.includes('app')) return 'mdi:cellphone'; if (d.includes('windows')) return 'mdi:microsoft-windows'
  if (d.includes('mac')) return 'mdi:apple'; if (d.includes('linux')) return 'mdi:linux'; return 'mdi:monitor'
}

const loadSessions = async () => {
  loading.value = true
  try { if (!props.authHeaders?.Authorization) return; sessions.value = await apiFetch('/api/auth/sessions', { headers: props.authHeaders }) }
  catch { sessions.value = [] }
  finally { loading.value = false }
}

const closeSession = async (sessionId) => {
  saving.value = true
  try { await apiFetch(`/api/auth/sessions/${sessionId}`, { method: 'DELETE', headers: props.authHeaders }); sessions.value = sessions.value.filter((s) => s.id !== sessionId); showFeedback('Session closed') }
  catch (err) { showFeedback(err?.data?.statusMessage || 'Failed to close session', 'error') }
  finally { saving.value = false }
}

const closeOtherSessions = async () => {
  saving.value = true
  try { await apiFetch('/api/auth/sessions', { method: 'DELETE', headers: props.authHeaders }); sessions.value = sessions.value.filter((s) => s.isCurrent); showFeedback('All other sessions closed') }
  catch (err) { showFeedback(err?.data?.statusMessage || 'Failed to close sessions', 'error') }
  finally { saving.value = false }
}

onMounted(() => loadSessions())
</script>
