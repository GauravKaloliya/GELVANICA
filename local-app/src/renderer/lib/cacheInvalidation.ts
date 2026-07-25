import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from './queryKeys'

export function invalidateWorkspace(qc: QueryClient, _wid: string) {
  void qc.invalidateQueries({ queryKey: queryKeys.workspaces.all })
  void qc.invalidateQueries({ queryKey: queryKeys.entities.all })
  void qc.invalidateQueries({ queryKey: queryKeys.blocks.all })
  void qc.invalidateQueries({ queryKey: queryKeys.relations.all })
  void qc.invalidateQueries({ queryKey: queryKeys.tags.all })
  void qc.invalidateQueries({ queryKey: queryKeys.files.all })
  void qc.invalidateQueries({ queryKey: queryKeys.graph.all })
}

export function invalidateEntity(qc: QueryClient, eid: string) {
  void qc.invalidateQueries({ queryKey: queryKeys.entities.detail(eid) })
  void qc.invalidateQueries({ queryKey: queryKeys.blocks.all })
  void qc.invalidateQueries({ queryKey: queryKeys.relations.all })
}
