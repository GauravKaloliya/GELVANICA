import { useMemo } from 'react'
import { useStore } from '../store'

type Permission = 'read' | 'write' | 'delete' | 'admin' | 'manage_members' | 'manage_settings'

const LOCAL_PERMISSIONS: Permission[] = ['read', 'write', 'delete', 'admin', 'manage_members', 'manage_settings']

export function usePermissions() {
  const user = useStore((s) => s.user)
  const isAuthenticated = useStore((s) => s.isAuthenticated)

  const permissions = useMemo<Permission[]>(() => {
    if (!isAuthenticated || !user) return []
    return LOCAL_PERMISSIONS
  }, [isAuthenticated, user])

  const hasPermission = useMemo(
    () => (permission: Permission): boolean => permissions.includes(permission),
    [permissions]
  )

  return {
    permissions,
    canRead: hasPermission('read'),
    canWrite: hasPermission('write'),
    canDelete: hasPermission('delete'),
    canAdmin: hasPermission('admin'),
    canManageMembers: hasPermission('manage_members'),
    canManageSettings: hasPermission('manage_settings'),
    hasPermission,
  }
}
