import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Sparkles, ArrowRight, Zap, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/router'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function getDateLabel() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function WelcomeHero({
  entityCount,
  workspaceName,
}: {
  entityCount?: number
  workspaceName?: string
}) {
  const navigate = useNavigate()

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-primary/[0.02] p-6 lg:p-8"
    >
      {/* Decorative background elements */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/[0.04] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-primary/[0.03] blur-2xl" />

      {/* Content */}
      <div className="relative z-10 flex items-start justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
            >
              <Zap className="h-5 w-5 text-primary" />
            </motion.div>
            <motion.p
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="text-sm text-muted-foreground"
            >
              {getDateLabel()}
            </motion.p>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-2xl font-bold tracking-tight lg:text-3xl"
          >
            {getGreeting()}
            {workspaceName && (
              <span className="text-muted-foreground">
                {' '}— {workspaceName}
              </span>
            )}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="max-w-md text-sm text-muted-foreground leading-relaxed"
          >
            {entityCount !== undefined && entityCount > 0
              ? `You have ${entityCount.toLocaleString()} entities in your knowledge base. What would you like to explore today?`
              : 'Welcome to your knowledge base. Start building your second brain by creating your first entity.'}
          </motion.p>

          {/* Quick action pills */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap items-center gap-2 pt-2"
          >
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => navigate(ROUTES.SEARCH)}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Search knowledge
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => navigate(ROUTES.AI)}
            >
              Ask AI
              <ArrowRight className="h-3 w-3" />
            </Button>
            {entityCount === 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5"
                onClick={() => navigate(ROUTES.DASHBOARD)}
              >
                <Plus className="h-3.5 w-3.5" />
                Create entity
              </Button>
            )}
          </motion.div>
        </div>

        {/* Floating icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
          className="hidden lg:flex"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
            <Sparkles className="h-10 w-10 text-primary/60" />
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
