import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, Clock, Hash, Type, Calendar,
  ToggleLeft, AlignLeft, Palette, Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useAttachTag, useDetachTag } from '@/hooks/useTags'
import { TagBadge } from '@/components/tags/TagBadge'
import { TagPicker } from '@/components/tags/TagPicker'
import { toast } from 'sonner'
import { cn, formatRelativeTime } from '@/lib/utils'
import { api } from '@lib/api'
import { useStore } from '@/store'
import { useEntity } from '@/hooks/useEntity'
import type { EntityProperty, PropertyType } from '@shared/types'

interface PropertyRowProps {
  prop: EntityProperty
  onEdit: (id: string, value: string) => void
  onDelete: (id: string) => void
}

const PROPERTY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  text: Type,
  number: Hash,
  date: Calendar,
  checkbox: ToggleLeft,
  select: Palette,
  multi_select: AlignLeft,
  url: AlignLeft,
}

function PropertyRow({ prop, onEdit, onDelete }: PropertyRowProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(prop.value ?? ''))
  const Icon = PROPERTY_ICONS[prop.property_type] ?? Type

  const handleSave = () => {
    onEdit(prop.id, value)
    setEditing(false)
  }

  return (
    <div className="group flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground">{prop.property_name ?? prop.name}</p>
        {editing ? (
          <div className="flex items-center gap-1">
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-6 text-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') setEditing(false)
              }}
            />
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleSave}>
              <Check className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <p className="text-sm break-all">{String(prop.value ?? '—')}</p>
        )}
      </div>
      {!editing && (
        <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setEditing(true)}
            className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Edit property"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={() => onDelete(prop.id)}
            className="rounded p-0.5 text-destructive hover:bg-destructive/10"
            aria-label="Delete property"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}

export function PropertiesPanel({
  entityId,
  properties,
  tags,
  isLoading,
}: {
  entityId: string
  properties?: EntityProperty[]
  tags?: Array<{ id: string; name: string; color?: string }>
  isLoading?: boolean
}) {
  const [addingProperty, setAddingProperty] = useState(false)
  const [newPropName, setNewPropName] = useState('')
  const [newPropType, setNewPropType] = useState('text')
  const attachTag = useAttachTag()
  const detachTag = useDetachTag()
  const [showTagPicker, setShowTagPicker] = useState(false)
  const queryClient = useQueryClient()
  const activeWorkspaceId = useStore((s) => s.activeWorkspaceId)
  const { data: entity } = useEntity(entityId)

  const handleAddProperty = useCallback(async () => {
    if (!newPropName.trim()) return
    try {
      await api.entities.properties.create({
        workspace_id: activeWorkspaceId ?? '',
        name: newPropName,
        property_type: (newPropType === 'boolean' ? 'checkbox' : newPropType) as PropertyType,
      })
      queryClient.invalidateQueries({ queryKey: ['entity-properties', entityId] })
    } catch {
      toast.error('Failed to create property')
    }
    setAddingProperty(false)
    setNewPropName('')
  }, [newPropName, newPropType, entityId, queryClient, activeWorkspaceId])

  if (isLoading) {
    return (
      <div className="space-y-3 p-3">
        <Skeleton className="h-4 w-24" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-3">
        {/* Properties Section */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground">Properties</h4>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5"
              onClick={() => setAddingProperty(!addingProperty)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          <AnimatePresence>
            {addingProperty && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mb-2 space-y-1.5 rounded-md border border-dashed p-2">
                  <Input
                    placeholder="Property name"
                    value={newPropName}
                    onChange={(e) => setNewPropName(e.target.value)}
                    className="h-7 text-xs"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleAddProperty()}
                  />
                  <div className="flex gap-1">
                    {['text', 'number', 'date', 'checkbox', 'select'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setNewPropType(t)}
                        className={cn(
                          'rounded px-1.5 py-0.5 text-[10px] transition-colors',
                          newPropType === t
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <Button size="sm" className="h-6 w-full text-xs" onClick={handleAddProperty}>
                    Add Property
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-0.5">
            {(properties ?? []).map((prop) => (
              <PropertyRow
                key={prop.id}
                prop={prop}
                onEdit={async (_id, value) => {
                  try {
                    await api.entities.update(entityId, { properties: { [_id]: value } })
                    queryClient.invalidateQueries({ queryKey: ['entity-properties', entityId] })
                  } catch {
                    toast.error('Failed to update property value')
                  }
                }}
                onDelete={async (_id) => {
                  toast.info('Property deletion will be available in a future update')
                }}
              />
            ))}
            {(!properties || properties.length === 0) && (
              <p className="py-2 text-center text-xs text-muted-foreground">
                No properties yet. Click + to add one.
              </p>
            )}
          </div>
        </div>

        <Separator />

        {/* Tags Section */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground">Tags</h4>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(tags ?? []).map((tag) => (
              <TagBadge
                key={tag.id}
                name={tag.name}
                color={tag.color}
                size="sm"
                removable
                onRemove={() => detachTag.mutate({ tagId: tag.id, entityId })}
              />
            ))}
            <div className="relative">
              <button
                onClick={() => setShowTagPicker(!showTagPicker)}
                className="flex h-6 items-center gap-1 rounded-full border border-dashed px-2 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <Plus className="h-3 w-3" />
                Add tag
              </button>
              {showTagPicker && (
                <div className="absolute left-0 top-full z-50 mt-1">
                  <TagPicker
                    selectedTagIds={(tags ?? []).map((t) => t.id)}
                    onToggle={(tagId) => {
                      const alreadyAttached = (tags ?? []).some((t) => t.id === tagId)
                      if (alreadyAttached) {
                        detachTag.mutate({ tagId, entityId })
                      } else {
                        attachTag.mutate({ tagId, entityId })
                      }
                    }}
                    onClose={() => setShowTagPicker(false)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Metadata */}
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Metadata</h4>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Created</span>
              <span className="ml-auto text-foreground">
                {entity?.created_at ? formatRelativeTime(new Date(entity.created_at)) : '—'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Modified</span>
              <span className="ml-auto text-foreground">
                {entity?.updated_at ? formatRelativeTime(new Date(entity.updated_at)) : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}
