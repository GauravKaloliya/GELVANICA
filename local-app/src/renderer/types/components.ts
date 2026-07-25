import type { ReactNode } from 'react'

export interface WithChildren {
  children: ReactNode
}

export interface WithClassName {
  className?: string
}

export interface WithId {
  id: string
}

export interface LoadingState {
  isLoading: boolean
  error?: string | null
}

export interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void | Promise<void>
  variant?: 'default' | 'destructive'
}

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
}

export interface EntityCardProps {
  id: string
  title: string
  entityType?: string
  updatedAt: string
  tags?: Array<{ id: string; name: string; color?: string }>
  onClick?: () => void
}

export interface TagBadgeProps {
  name: string
  color?: string
  onRemove?: () => void
  onClick?: () => void
}
