<template>
  <div class="p-5 md:p-8">
    <div class="max-w-2xl mx-auto">
      <SettingsSectionHeader icon="mdi:alert-outline" title="Danger Zone" description="Irreversible account actions" />
      <UiListMenu preset="settings">
        <div class="p-4">
          <p class="text-xs text-gray-500 dark:text-gray-500 mb-3">These actions are irreversible. Your password is required to confirm.</p>
          <UiFormField label="Confirm Password"><UiInput v-model="dangerPassword" type="password" :validate="false" /></UiFormField>
          <div class="space-y-3 mt-3">
            <UiButton variant="solid" color="amber" block :loading="saving" :disabled="!dangerPassword" @click="confirmingAction = 'data'">
              <Icon v-if="!saving" name="mdi:database-remove-outline" class="w-4 h-4" /> Delete All Data
            </UiButton>
            <p class="text-xs text-gray-500 dark:text-gray-500">Resets your account. All data permanently deleted.</p>
            <UiButton variant="solid" color="red" block :loading="saving" :disabled="!dangerPassword" @click="confirmingAction = 'account'">
              <Icon v-if="!saving" name="mdi:account-remove-outline" class="w-4 h-4" /> Delete Account
            </UiButton>
            <p class="text-xs text-gray-500 dark:text-gray-500">Permanently deletes your account and all data. Cannot be undone.</p>
          </div>
        </div>
      </UiListMenu>
    </div>

    <SettingsConfirmModal
      :is-open="confirmingAction === 'data'"
      title="Reset account data?"
      icon="mdi:database-remove-outline"
      confirm-label="Delete All Data"
      confirm-color="amber"
      :loading="saving"
      @close="confirmingAction = null"
      @confirm="handleDeleteData"
    >
      This will permanently delete all your data. This cannot be undone.
    </SettingsConfirmModal>

    <SettingsConfirmModal
      :is-open="confirmingAction === 'account'"
      title="Delete your account?"
      icon="mdi:account-remove-outline"
      confirm-label="Delete Account"
      confirm-color="red"
      :loading="saving"
      @close="confirmingAction = null"
      @confirm="handleDeleteAccount"
    >
      This will permanently delete your account and all associated data.
    </SettingsConfirmModal>
  </div>
</template>

<script setup>
const props = defineProps({
  onDeleteData: { type: Function, default: null },
  onDeleteAccount: { type: Function, default: null },
})

const toast = useToast()

const dangerPassword = ref('')
const confirmingAction = ref(null)
const saving = ref(false)

const showFeedback = (msg, type = 'success') => {
  toast.show(msg, { type: type === 'error' ? 'error' : 'success', icon: type === 'error' ? 'mdi:alert-circle-outline' : 'mdi:check-circle-outline' })
}

const handleDeleteData = async () => {
  saving.value = true
  try { await props.onDeleteData(dangerPassword.value); showFeedback('All data deleted — account reset'); dangerPassword.value = '' }
  catch (err) { showFeedback(err?.data?.statusMessage || 'Failed to delete data', 'error') }
  finally { saving.value = false; confirmingAction.value = null }
}

const handleDeleteAccount = async () => {
  saving.value = true
  try { await props.onDeleteAccount(dangerPassword.value) }
  catch (err) { showFeedback(err?.data?.statusMessage || 'Failed to delete account', 'error') }
  finally { saving.value = false; confirmingAction.value = null }
}

// Self-reset on mount (fresh state each time section is displayed)
onMounted(() => {
  dangerPassword.value = ''
  confirmingAction.value = null
})
</script>
