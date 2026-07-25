import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Link2, Clock, BarChart3, Search, X, Check } from 'lucide-react'
import { useStore } from '@/store'
import {
  useGovernanceHealth,
  useDuplicates,
  useOrphans,
  useStale,
  useRecalculateHealth,
} from '@/hooks/useGovernance'
import { useArchiveEntity } from '@/hooks/useEntity'
import { useCreateRelation } from '@/hooks/useRelations'
import { useEntities } from '@/hooks/useEntity'
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { HealthScore } from '@/components/governance/HealthScore'
import { IssueList } from '@/components/governance/IssueList'
import { GovernanceReport } from '@/components/governance/GovernanceReport'
import type { GovernanceReport as GovernanceReportType } from '@shared/types'
import type { RelationType } from '@shared/types'

interface DuplicateEntry {
  entity_a_id: string
  entity_b_id: string
  similarity: number
  title_a: string
  title_b: string
}

interface OrphanEntry {
  id: string
  title: string
  updated_at: string
}

interface StaleEntry {
  id: string
  title: string
  updated_at: string
}

const RELATION_TYPES: { value: RelationType; label: string }[] = [
  { value: 'related_to', label: 'Related to' },
  { value: 'refers_to', label: 'Refers to' },
  { value: 'depends_on', label: 'Depends on' },
  { value: 'part_of', label: 'Part of' },
  { value: 'implements', label: 'Implements' },
  { value: 'extends', label: 'Extends' },
]

export default function GovernancePage() {
  const activeWorkspaceId = useStore((s) => s.activeWorkspaceId)
  const [activeTab, setActiveTab] = useState('health')
  const [archivingStaleId, setArchivingStaleId] = useState<string | null>(null)
  const [mergingDuplicateId, setMergingDuplicateId] = useState<string | null>(null)

  const [relatingOrphan, setRelatingOrphan] = useState<OrphanEntry | null>(null)
  const [targetEntityId, setTargetEntityId] = useState('')
  const [relationType, setRelationType] = useState<RelationType>('related_to')
  const [entitySearch, setEntitySearch] = useState('')

  const healthQuery = useGovernanceHealth(activeWorkspaceId ?? '')
  const duplicatesQuery = useDuplicates(activeWorkspaceId ?? '')
  const orphansQuery = useOrphans(activeWorkspaceId ?? '')
  const staleQuery = useStale(activeWorkspaceId ?? '')
  const recalculate = useRecalculateHealth()
  const archiveEntity = useArchiveEntity()
  const createRelation = useCreateRelation()
  const { data: entitiesData } = useEntities(
    activeWorkspaceId ? { workspace_id: activeWorkspaceId } : undefined,
  )

  const health = healthQuery.data as GovernanceReportType | undefined
  const duplicates = (duplicatesQuery.data ?? []) as DuplicateEntry[]
  const orphans = useMemo(() => (orphansQuery.data ?? []) as OrphanEntry[], [orphansQuery.data])
  const stale = (staleQuery.data ?? []) as StaleEntry[]

  const allEntities = useMemo(() => {
    const raw = (entitiesData as { data?: Array<{ id: string; title: string }> } | undefined)?.data
    if (!raw) return []
    const orphanIds = new Set(orphans.map((o) => o.id))
    return raw.filter((e) => !orphanIds.has(e.id))
  }, [entitiesData, orphans])

  const filteredEntities = useMemo(() => {
    if (!entitySearch.trim()) return allEntities
    const q = entitySearch.toLowerCase()
    return allEntities.filter((e) => e.title.toLowerCase().includes(q))
  }, [allEntities, entitySearch])

  const tabs = [
    { value: 'health', label: 'Health', icon: BarChart3 },
    { value: 'duplicates', label: 'Duplicates', icon: AlertTriangle, count: health?.duplicate_count ?? duplicates.length },
    { value: 'orphans', label: 'Orphans', icon: Link2, count: health?.orphan_count ?? orphans.length },
    { value: 'stale', label: 'Stale', icon: Clock, count: health?.stale_count ?? stale.length },
  ]

  function handleRelateOrphan() {
    if (!relatingOrphan || !targetEntityId || !activeWorkspaceId) return
    createRelation.mutate(
      {
        workspace_id: activeWorkspaceId,
        source_entity_id: relatingOrphan.id,
        target_entity_id: targetEntityId,
        relation_type: relationType,
      },
      {
        onSuccess: () => {
          setRelatingOrphan(null)
          setTargetEntityId('')
          setEntitySearch('')
          setRelationType('related_to')
          orphansQuery.refetch()
        },
      },
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-8"
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-bold">Governance</h1>
          <p className="text-sm text-muted-foreground">
            Workspace health, duplicates, orphans, and stale content
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
              <t.icon className="h-4 w-4" />
              {t.label}
              {t.count !== undefined && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {t.count}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="health">
          <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
            <HealthScore
              score={health?.health_score}
              entityCount={health?.report?.entity_count ?? 0}
              duplicateCount={health?.duplicate_count}
              orphanCount={health?.orphan_count}
              staleCount={health?.stale_count}
              isRecalculating={recalculate.isPending}
              onRecalculate={() => activeWorkspaceId && recalculate.mutate(activeWorkspaceId)}
            />
            <GovernanceReport
              healthScore={health?.health_score ?? 0}
              entityCount={health?.report?.entity_count ?? 0}
              duplicateCount={health?.duplicate_count ?? 0}
              orphanCount={health?.orphan_count ?? 0}
              staleCount={health?.stale_count ?? 0}
              lastCalculated={health?.created_at}
            />
          </div>
        </TabsContent>

        <TabsContent value="duplicates">
          <IssueList
            type="duplicate"
            items={duplicates}
            isLoading={duplicatesQuery.isLoading}
            onAction={(item, action) => {
              if (action === 'merge') {
                setMergingDuplicateId(item.entity_a_id)
              }
            }}
          />
        </TabsContent>

        <TabsContent value="orphans">
          <IssueList
            type="orphan"
            items={orphans}
            isLoading={orphansQuery.isLoading}
            onAction={(item, action) => {
              if (action === 'relate') {
                setRelatingOrphan(item as OrphanEntry)
                setTargetEntityId('')
                setEntitySearch('')
              }
            }}
          />
        </TabsContent>

        <TabsContent value="stale">
          <IssueList
            type="stale"
            items={stale}
            isLoading={staleQuery.isLoading}
            onAction={(item, action) => {
              if (action === 'archive') {
                setArchivingStaleId(item.id)
              }
            }}
          />
        </TabsContent>
      </Tabs>

      <DeleteConfirmModal
        open={!!archivingStaleId}
        onCancel={() => setArchivingStaleId(null)}
        title="Archive Stale Entity"
        description="This entity has not been updated recently. Archiving will remove it from active views."
        action={{ type: 'archive' }}
        onConfirm={() => {
          if (archivingStaleId) {
            archiveEntity.mutate(archivingStaleId, {
              onSuccess: () => {
                staleQuery.refetch()
                setArchivingStaleId(null)
              },
            })
          }
        }}
      />

      <DeleteConfirmModal
        open={!!mergingDuplicateId}
        onCancel={() => setMergingDuplicateId(null)}
        title="Merge Duplicate Entities"
        description="These entities appear to be duplicates. The duplicate entity will be archived and its blocks transferred to the primary entity."
        action={{ type: 'custom', label: 'Merge' }}
        onConfirm={() => {
          if (mergingDuplicateId) {
            archiveEntity.mutate(mergingDuplicateId, {
              onSuccess: () => {
                duplicatesQuery.refetch()
                setMergingDuplicateId(null)
              },
            })
          }
        }}
      />

      {/* Orphan Relate Modal */}
      <AnimatePresence>
        {relatingOrphan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setRelatingOrphan(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 w-full max-w-md rounded-xl border bg-background p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Relate Orphan Entity</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Connect <span className="font-medium text-foreground">"{relatingOrphan.title}"</span> to another entity
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setRelatingOrphan(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-3">
                {/* Relation type selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Relation Type</label>
                  <div className="flex flex-wrap gap-1.5">
                    {RELATION_TYPES.map((rt) => (
                      <button
                        key={rt.value}
                        onClick={() => setRelationType(rt.value)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          relationType === rt.value
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {rt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Entity search */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Target Entity</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search entities..."
                      value={entitySearch}
                      onChange={(e) => setEntitySearch(e.target.value)}
                      className="h-8 pl-8 text-xs"
                    />
                    {entitySearch && (
                      <button
                        onClick={() => setEntitySearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label="Clear search"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Entity list */}
                <div className="max-h-48 overflow-y-auto rounded-md border">
                  {filteredEntities.length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      {entitySearch ? 'No matching entities' : 'No entities available'}
                    </p>
                  ) : (
                    filteredEntities.map((entity) => (
                      <button
                        key={entity.id}
                        onClick={() => setTargetEntityId(entity.id)}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-muted/50 ${
                          targetEntityId === entity.id ? 'bg-primary/10' : ''
                        }`}
                      >
                        <Check
                          className={`h-3 w-3 shrink-0 ${
                            targetEntityId === entity.id ? 'text-primary' : 'text-transparent'
                          }`}
                        />
                        <span className="truncate">{entity.title}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setRelatingOrphan(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!targetEntityId || createRelation.isPending}
                  onClick={handleRelateOrphan}
                >
                  {createRelation.isPending ? 'Creating...' : 'Create Relation'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
