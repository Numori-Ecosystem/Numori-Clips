/**
 * Auth-related action handlers for the index page.
 */
export function useAuthHandlers({ auth, appLock }) {
  const showAuthModal = ref(false)
  const showEmailVerificationModal = ref(false)
  const showProfileModal = ref(false)

  /** Clear local auth data from IndexedDB — called on logout, password change, account deletion. */
  const clearLocalData = async () => {
    auth.logout()
  }

  const handleLogin = async ({ email, password }) => {
    try {
      await auth.login(email, password)
      showAuthModal.value = false
    } catch {
      /* error shown in modal */
    }
  }

  const handleRegister = async ({ email, password, name }) => {
    try {
      await auth.register(email, password, name)
      showAuthModal.value = false
    } catch {
      /* error shown in modal */
    }
  }

  const handleForgotPassword = async ({ email, onSuccess }) => {
    try {
      await auth.forgotPassword(email)
      onSuccess()
    } catch {
      /* error shown in modal */
    }
  }

  const handleVerifyRecovery = async ({ email, code, onSuccess }) => {
    try {
      const token = await auth.verifyRecovery(email, code)
      onSuccess(token)
    } catch {
      /* error shown in modal */
    }
  }

  const handleResetPassword = async ({ recoveryToken, newPassword }) => {
    try {
      await auth.resetPassword(recoveryToken, newPassword)
      showAuthModal.value = false
    } catch {
      /* error shown in modal */
    }
  }

  const handleVerifyEmail = async (code) => {
    try {
      await auth.verifyEmail(code)
      showEmailVerificationModal.value = false
    } catch {
      /* error shown in modal */
    }
  }

  const handleResendVerification = async () => {
    try {
      await auth.sendVerification()
    } catch {
      /* ignore */
    }
  }

  const handleLogout = async () => {
    await appLock.resetForLogout()
    await clearLocalData()
  }

  const handleShowProfile = () => {
    auth.refreshUser()
    showProfileModal.value = true
  }

  const handleUpdateProfile = async (data) => {
    await auth.updateProfile(data)
  }

  const handleChangePassword = async ({ currentPassword, newPassword, onProgress }) => {
    await auth.changePassword(currentPassword, newPassword, [], onProgress)
    await clearLocalData()
    showProfileModal.value = false
    showAuthModal.value = true
  }

  const handleDeleteData = async (password) => {
    await auth.requestDeletion('data', password)
    await auth.refreshUser()
  }

  const handleDeleteAccount = async (password) => {
    await auth.requestDeletion('account', password)
    await clearLocalData()
    showProfileModal.value = false
  }

  return {
    showAuthModal,
    showEmailVerificationModal,
    showProfileModal,
    handleLogin,
    handleRegister,
    handleForgotPassword,
    handleVerifyRecovery,
    handleResetPassword,
    handleVerifyEmail,
    handleResendVerification,
    handleLogout,
    handleShowProfile,
    handleUpdateProfile,
    handleChangePassword,
    handleDeleteData,
    handleDeleteAccount,
  }
}
