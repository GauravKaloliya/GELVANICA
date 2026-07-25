import { useEffect, useRef, useCallback } from 'react'
import { rendererLogger } from '../lib/logger'
import { useStore } from '../store'
import { api } from '../lib/api'

export function useAutoSave() {
  const isDirty = useStore((s) => s.isDirty)
  const isSaving = useStore((s) => s.isSaving)
  const blocks = useStore((s) => s.blocks)
  const activeEntityId = useStore((s) => s.activeEntityId)
  const setDirty = useStore((s) => s.setDirty)
  const setSaving = useStore((s) => s.setSaving)
  const autoSaveInterval = useStore((s) => s.settings.general.auto_save_interval)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const blocksRef = useRef(blocks)
  blocksRef.current = blocks

  const save = useCallback(async () => {
    if (!activeEntityId || !isDirty) return

    setSaving(true)
    try {
      const currentBlocks = blocksRef.current

      await api.blocks.reorder({
        entity_id: activeEntityId,
        blocks: currentBlocks.map((b, i) => ({
          id: b.id,
          position: i,
        })),
      })

      for (const block of currentBlocks) {
        if (block.entity_id === activeEntityId) {
          await api.blocks.update(block.id, {
            content: block.content,
            position: block.position,
          })
        }
      }

      setDirty(false)
    } catch {
      rendererLogger.warn('AutoSave', 'Auto-save failed, dirty state preserved for retry')
    } finally {
      setSaving(false)
    }
  }, [activeEntityId, isDirty, setDirty, setSaving])

  useEffect(() => {
    if (!isDirty || autoSaveInterval <= 0) return

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      save()
    }, autoSaveInterval)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [isDirty, autoSaveInterval, save])

  const saveNow = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    await save()
  }, [save])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  return { saveNow, isSaving, isDirty }
}
