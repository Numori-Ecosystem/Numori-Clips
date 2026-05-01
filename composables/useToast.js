const toasts = ref([])
let _id = 0

export const useToast = () => {
  const show = (message, { type = 'info', duration = 2500, icon = null } = {}) => {
    const id = ++_id
    toasts.value.push({ id, message, type, icon })
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id)
    }, duration)
  }

  return { toasts, show }
}
