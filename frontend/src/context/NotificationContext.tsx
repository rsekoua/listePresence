import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

export interface NotifParticipant {
  id: string
  nom: string
  prenom: string
  structure: string
  fonction: string
}

export interface AppNotification {
  id: string
  activiteId: string
  activiteNom: string
  participants: NotifParticipant[]
  timestamp: Date
  read: boolean
}

interface NotificationContextType {
  notifications: AppNotification[]
  unreadCount: number
  addNotification: (payload: Pick<AppNotification, 'activiteId' | 'activiteNom' | 'participants'>) => void
  markAllRead: () => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextType | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  const addNotification = useCallback(
    (payload: Pick<AppNotification, 'activiteId' | 'activiteNom' | 'participants'>) => {
      setNotifications((prev) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          ...payload,
          timestamp: new Date(),
          read: false,
        },
        ...prev,
      ])
    },
    [],
  )

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const clearAll = useCallback(() => setNotifications([]), [])

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, addNotification, markAllRead, clearAll }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider')
  return ctx
}
