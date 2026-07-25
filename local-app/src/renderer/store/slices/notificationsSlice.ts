import { StateCreator } from 'zustand'
import type { Notification } from '@shared/types'
import type { StoreState } from '../index'

export interface NotificationsSlice {
  notifications: Notification[]
  unreadCount: number
  isOpen: boolean

  setNotifications: (notifications: Notification[]) => void
  addNotification: (notification: Notification) => void
  markRead: (id: string) => void
  dismiss: (id: string) => void
  clearAll: () => void
  setOpen: (open: boolean) => void
  toggleOpen: () => void
}

export const createNotificationsSlice: StateCreator<StoreState, [], [], NotificationsSlice> = (
  set
) => ({
  notifications: [],
  unreadCount: 0,
  isOpen: false,

  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.is_read).length,
    }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: notification.is_read ? state.unreadCount : state.unreadCount + 1,
    })),

  markRead: (id) =>
    set((state) => {
      const target = state.notifications.find((n) => n.id === id)
      if (!target || target.is_read) return state
      return {
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, is_read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }
    }),

  dismiss: (id) =>
    set((state) => {
      const target = state.notifications.find((n) => n.id === id)
      return {
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: target && !target.is_read
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
      }
    }),

  clearAll: () => set({ notifications: [], unreadCount: 0 }),

  setOpen: (isOpen) => set({ isOpen }),

  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
})
