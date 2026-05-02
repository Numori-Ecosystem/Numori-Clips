<!-- eslint-disable vue/no-mutating-props -->
<template>
  <div class="p-5 md:p-8">
    <div class="max-w-2xl mx-auto">
      <SettingsSectionHeader icon="mdi:account-circle-outline" title="Profile" description="Your account information" />

      <!-- Profile card -->
      <div class="relative rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-800/30 border border-gray-200 dark:border-gray-700/50 px-4 py-5 mb-5">
        <div class="flex items-center gap-4">
          <button type="button" class="relative group flex-shrink-0 rounded-full" title="Change avatar" @click="subSection = 'avatar'">
            <UiAvatar :src="user?.avatarUrl" size="xl" ring />
            <div class="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Icon name="mdi:camera" class="w-4 h-4 text-white" />
            </div>
          </button>
          <div class="flex-1 min-w-0 cursor-pointer" role="button" tabindex="0" title="Edit profile" @click="enterEditProfile" @keydown.enter="enterEditProfile">
            <p class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate hover:text-primary-600 dark:hover:text-primary-400 transition-colors">{{ user?.name || 'No name set' }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 truncate hover:text-primary-600 dark:hover:text-primary-400 transition-colors">{{ user?.email }}</p>
            <p class="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5">Member since {{ user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—' }}</p>
          </div>
        </div>
      </div>

      <!-- Avatar sub-section -->
      <template v-if="subSection === 'avatar'">
        <UiListMenu label="Change Avatar" preset="settings" class="mb-5">
          <div v-if="!avatarImageSrc" class="text-center space-y-3 py-4 px-4">
            <div class="w-24 h-24 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Icon name="mdi:image-plus" class="w-10 h-10 text-gray-400" />
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Choose an image for your avatar</p>
            <UiFileInput accept="image/*" class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg" @select="onFileSelect">
              <Icon name="mdi:upload" class="w-4 h-4" /> Upload Image
            </UiFileInput>
            <UiButton v-if="user?.avatarUrl" variant="ghost" color="red" size="xs" class="block mx-auto mt-2" @click="removeAvatar">Remove current avatar</UiButton>
            <UiButton variant="ghost" color="gray" size="sm" class="block mx-auto mt-1" @click="cancelSubSection">Cancel</UiButton>
          </div>
          <div v-else class="space-y-3 p-4">
            <AvatarEditor :image-source="avatarImageSrc" :canvas-size="editorCanvasSize" @update="onAvatarCropped" />
            <div class="flex gap-2">
              <UiButton variant="solid" color="gray" class="flex-1" @click="avatarImageSrc = null">Choose Different</UiButton>
              <UiButton variant="solid" color="primary" :loading="saving" class="flex-1" @click="saveAvatar">Save Avatar</UiButton>
            </div>
            <UiButton variant="ghost" color="gray" size="sm" block @click="cancelSubSection">Cancel</UiButton>
          </div>
        </UiListMenu>
      </template>

      <!-- Edit profile sub-section -->
      <template v-if="subSection === 'edit'">
        <UiListMenu label="Edit Profile" preset="settings" class="mb-5">
          <div class="space-y-4 p-4">
            <UiFormField label="Name"><UiInput v-model="editName" type="text" placeholder="Your name" :validate="false" /></UiFormField>
            <UiFormField label="Email"><UiInput v-model="editEmail" type="email" placeholder="you@example.com" /></UiFormField>
            <div class="flex gap-2">
              <UiButton variant="outline" color="gray" class="flex-1" @click="cancelSubSection">Cancel</UiButton>
              <UiButton variant="solid" color="primary" class="flex-1" :loading="saving" @click="saveProfile">Save Changes</UiButton>
            </div>
          </div>
        </UiListMenu>
      </template>

      <!-- Password sub-section -->
      <template v-if="subSection === 'password'">
        <UiListMenu label="Change Password" preset="settings" class="mb-5">
          <div class="p-4">
            <div class="space-y-4">
              <UiFormField label="Current Password"><UiInput v-model="currentPassword" type="password" :validate="false" /></UiFormField>
              <UiFormField label="New Password" hint="At least 8 characters"><UiInput v-model="newPassword" type="password" :minlength="8" :validate="false" /></UiFormField>
              <div>
                <UiFormField label="Confirm New Password"><UiInput v-model="confirmNewPassword" type="password" :validate="false" /></UiFormField>
                <p v-if="confirmNewPassword && newPassword !== confirmNewPassword" class="text-xs text-red-600 dark:text-red-400 mt-1">Passwords do not match</p>
              </div>
              <div class="flex gap-2">
                <UiButton variant="outline" color="gray" class="flex-1" :disabled="saving" @click="cancelSubSection">Cancel</UiButton>
                <UiButton variant="solid" color="primary" class="flex-1" :loading="saving" :disabled="!currentPassword || !newPassword || newPassword !== confirmNewPassword || newPassword.length < 8" @click="savePassword">Update Password</UiButton>
              </div>
            </div>
          </div>
        </UiListMenu>
      </template>

      <!-- Actions (when no sub-section is active) -->
      <template v-if="!subSection">
        <UiListMenu label="Account" preset="settings" class="mb-5">
          <UiListMenuItem icon="mdi:account-edit-outline" clickable @click="enterEditProfile">Edit Profile</UiListMenuItem>
          <UiListMenuItem icon="mdi:lock-outline" clickable @click="subSection = 'password'">Change Password</UiListMenuItem>
        </UiListMenu>
        <UiListMenu preset="settings" class="mt-5">
          <UiListMenuItem icon="mdi:logout-variant" danger clickable :chevron="false" @click="emit('logout')">Sign out</UiListMenuItem>
        </UiListMenu>
      </template>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  user: { type: Object, default: null },
  authHeaders: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update-profile', 'change-password', 'logout', 'navigate-section'])

const toast = useToast()
const { apiFetch: _apiFetch } = useApi()

const saving = ref(false)
const subSection = ref(null) // 'edit' | 'password' | 'avatar' | null
const editName = ref('')
const editEmail = ref('')
const avatarImageSrc = ref(null)
const croppedAvatarDataUrl = ref(null)
const editorCanvasSize = computed(() => typeof window === 'undefined' ? 220 : Math.min(220, window.innerWidth - 80))
const currentPassword = ref('')
const newPassword = ref('')
const confirmNewPassword = ref('')

const showFeedback = (msg, type = 'success') => {
  toast.show(msg, { type: type === 'error' ? 'error' : 'success', icon: type === 'error' ? 'mdi:alert-circle-outline' : 'mdi:check-circle-outline' })
}

const cancelSubSection = () => {
  avatarImageSrc.value = null
  croppedAvatarDataUrl.value = null
  subSection.value = null
}

const enterEditProfile = () => {
  editName.value = props.user?.name || ''
  editEmail.value = props.user?.email || ''
  subSection.value = 'edit'
}

// Avatar
const onFileSelect = (file) => { if (!file) return; const reader = new FileReader(); reader.onload = () => { avatarImageSrc.value = reader.result }; reader.readAsDataURL(file) }
const onAvatarCropped = (dataUrl) => { croppedAvatarDataUrl.value = dataUrl }

const saveAvatar = async () => {
  if (!croppedAvatarDataUrl.value) return
  saving.value = true
  try { await emit('update-profile', { avatarUrl: croppedAvatarDataUrl.value }); showFeedback('Avatar updated'); avatarImageSrc.value = null; subSection.value = null }
  catch (err) { showFeedback(err?.data?.statusMessage || 'Failed to update avatar', 'error') }
  finally { saving.value = false }
}

const removeAvatar = async () => {
  saving.value = true
  try { await emit('update-profile', { avatarUrl: '' }); showFeedback('Avatar removed'); subSection.value = null }
  catch (err) { showFeedback(err?.data?.statusMessage || 'Failed to remove avatar', 'error') }
  finally { saving.value = false }
}

const saveProfile = async () => {
  saving.value = true
  try { await emit('update-profile', { name: editName.value, email: editEmail.value }); showFeedback('Profile updated'); subSection.value = null }
  catch (err) { showFeedback(err?.data?.statusMessage || 'Failed to update profile', 'error') }
  finally { saving.value = false }
}

const savePassword = async () => {
  saving.value = true
  try {
    await emit('change-password', { currentPassword: currentPassword.value, newPassword: newPassword.value })
    showFeedback('Password updated. Please log in again.')
    currentPassword.value = ''; newPassword.value = ''; confirmNewPassword.value = ''; subSection.value = null
  } catch (err) { showFeedback(err?.data?.statusMessage || 'Failed to change password', 'error') }
  finally { saving.value = false }
}

// Self-initialize from props on mount and when user changes
const initFromUser = () => {
  editName.value = props.user?.name || ''
  editEmail.value = props.user?.email || ''
  avatarImageSrc.value = null
  croppedAvatarDataUrl.value = null
  currentPassword.value = ''
  newPassword.value = ''
  confirmNewPassword.value = ''
  subSection.value = null
}

onMounted(initFromUser)
watch(() => props.user, initFromUser)

defineExpose({ subSection })
</script>
