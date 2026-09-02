import { notifications } from '@mantine/notifications'

/**
 * Helpers de notification basés sur @mantine/notifications.
 * Remplacent l'API enqueueSnackbar de notistack utilisée dans l'ancien front.
 */
export const notify = {
  success(message: string) {
    notifications.show({ message, color: 'teal', autoClose: 3500 })
  },
  error(message: string) {
    notifications.show({ message, color: 'red', autoClose: 5000 })
  },
  info(message: string) {
    notifications.show({ message, color: 'brand', autoClose: 3500 })
  },
  warning(message: string) {
    notifications.show({ message, color: 'orange', autoClose: 4000 })
  },
}

/** Extrait un message d'erreur lisible depuis une erreur Axios/Django Ninja. */
export function errorMessage(err: unknown, fallback = 'Une erreur est survenue.'): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const resp = (err as { response?: { data?: unknown } }).response
    const data = resp?.data
    if (typeof data === 'string') return data
    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>
      if (typeof obj.detail === 'string') return obj.detail
      if (typeof obj.message === 'string') return obj.message
      // Erreurs de validation Django Ninja : { detail: [{ msg, loc }] }
      if (Array.isArray(obj.detail) && obj.detail.length > 0) {
        const first = obj.detail[0] as { msg?: string }
        if (first?.msg) return first.msg
      }
    }
  }
  return fallback
}
