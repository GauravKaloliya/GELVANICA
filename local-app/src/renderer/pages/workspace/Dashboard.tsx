import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useDashboardOverview } from '@/hooks/useDashboard'
import { useActivityLog } from '@/hooks/useActivity'
import { useGovernanceHealth } from '@/hooks/useGovernance'
import { useWorkspace } from '@/hooks/useWorkspace'
import { useDeleteEntity } from '@/hooks/useEntity'
import { useStore } from '@/store'
import { WelcomeHero } from '@/components/dashboard/WelcomeHero'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { RecentEntities } from '@/components/dashboard/RecentEntities'
import ActivityFeed from '@/components/dashboard/ActivityFeed'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { GovernanceHealth } from '@/components/dashboard/GovernanceHealth'
import { EntityCreateModal } from '@/components/modals/EntityCreateModal'
import { EntityEditModal } from '@/components/modals/EntityEditModal'
import { Button } from '@/components/ui/button'
import type { Entity, GovernanceReport, ActivityEvent } from '@shared/types'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
}

export default function Dashboard() {
  const { activeWorkspaceId } = useStore()
  const { data: overview, isLoading: overviewLoading } = useDashboardOverview(activeWorkspaceId ?? '')
  const { data: activityData, isLoading: activityLoading } = useActivityLog(activeWorkspaceId ?? '', { per_page: 10 })
  const { data: healthData, isLoading: healthLoading } = useGovernanceHealth(activeWorkspaceId ?? '')
  const { data: workspace } = useWorkspace(activeWorkspaceId ?? undefined)
  const deleteEntity = useDeleteEntity()

  const [showCreateEntity, setShowCreateEntity] = useState(false)
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null)

  const activities = ((activityData as { data?: ActivityEvent[] })?.data ?? []).map((e) => ({
    ...e,
    entity_id: e.entity_id ?? undefined,
  }))
  const health = healthData as GovernanceReport | undefined

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="p-6 lg:p-8 space-y-6"
    >
      {/* Welcome Hero */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between">
          <WelcomeHero
            entityCount={overview?.entity_count}
            workspaceName={workspace?.name ?? 'Workspace'}
          />
          <Button size="sm" onClick={() => setShowCreateEntity(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> New Entity
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={item}>
        <StatsCards overview={overview} isLoading={overviewLoading} />
      </motion.div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <motion.div variants={item}>
          <RecentEntities
            entities={overview?.recent_entities}
            isLoading={overviewLoading}
            onEdit={(entity) => setEditingEntity(entity as Entity)}
            onDelete={(entity) => deleteEntity.mutate(entity.id)}
          />
        </motion.div>
        <motion.div variants={item}>
          <ActivityFeed
            activities={activities}
            isLoading={activityLoading}
          />
        </motion.div>
      </div>

      {/* Bottom row */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <motion.div variants={item}>
          <QuickActions />
        </motion.div>
        <motion.div variants={item}>
          <GovernanceHealth
            healthScore={health?.health_score}
            duplicateCount={health?.duplicate_count}
            orphanCount={health?.orphan_count}
            staleCount={health?.stale_count}
            entityCount={overview?.entity_count}
            isLoading={healthLoading}
          />
        </motion.div>
      </div>

      <EntityCreateModal open={showCreateEntity} onClose={() => setShowCreateEntity(false)} />
      <EntityEditModal open={!!editingEntity} entity={editingEntity} onClose={() => setEditingEntity(null)} />
    </motion.div>
  )
}
