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

const STORAGE_KEY = 'presence_notifications'
const MAX_NOTIFS = 50

function load(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return (JSON.parse(raw) as AppNotification[]).map((n) => ({
      ...n,
      timestamp: new Date(n.timestamp),
    }))
  } catch {
    return []
  }
}

function save(notifications: AppNotification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, MAX_NOTIFS)))
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
  const [notifications, setNotifications] = useState<AppNotification[]>(load)

  const addNotification = useCallback(
    (payload: Pick<AppNotification, 'activiteId' | 'activiteNom' | 'participants'>) => {
      setNotifications((prev) => {
        const next = [
          {
            id: `${Date.now()}-${Math.random()}`,
            ...payload,
            timestamp: new Date(),
            read: false,
          },
          ...prev,
        ]
        save(next)
        return next
      })
    },
    [],
  )

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }))
      save(next)
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setNotifications([])
  }, [])

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
