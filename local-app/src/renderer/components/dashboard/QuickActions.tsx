import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Sparkles,
  GitBranch,
  Upload,
  Globe,
  Shield,
  Settings,
  Keyboard,
  Plus,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/router'

interface QuickAction {
  label: string
  description: string
  icon: LucideIcon
  color: string
  bgColor: string
  route: string
}

const ACTIONS: QuickAction[] = [
  {
    label: 'Search',
    description: 'Find anything',
    icon: Search,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10 hover:bg-blue-500/15',
    route: ROUTES.SEARCH,
  },
  {
    label: 'AI Assistant',
    description: 'Ask a question',
    icon: Sparkles,
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10 hover:bg-violet-500/15',
    route: ROUTES.AI,
  },
  {
    label: 'Graph View',
    description: 'Explore connections',
    icon: Globe,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10 hover:bg-emerald-500/15',
    route: ROUTES.GRAPH,
  },
  {
    label: 'New Entity',
    description: 'Create content',
    icon: Plus,
    color: 'text-primary',
    bgColor: 'bg-primary/10 hover:bg-primary/15',
    route: ROUTES.DASHBOARD,
  },
  {
    label: 'Branches',
    description: 'Version control',
    icon: GitBranch,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10 hover:bg-cyan-500/15',
    route: ROUTES.BRANCHES,
  },
  {
    label: 'Upload',
    description: 'Add files',
    icon: Upload,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10 hover:bg-amber-500/15',
    route: ROUTES.FILES,
  },
  {
    label: 'Governance',
    description: 'Health check',
    icon: Shield,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10 hover:bg-rose-500/15',
    route: ROUTES.GOVERNANCE,
  },
  {
    label: 'Settings',
    description: 'Preferences',
    icon: Settings,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted hover:bg-muted/80',
    route: ROUTES.SETTINGS,
  },
]

export function QuickActions() {
  const navigate = useNavigate()

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Quick Actions</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-muted-foreground"
            onClick={() => navigate(ROUTES.SHORTCUTS)}
          >
            <Keyboard className="h-3 w-3" />
            Shortcuts
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2">
          {ACTIONS.map((action, i) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => navigate(action.route)}
              className={cn(
                'group flex flex-col items-center gap-2 rounded-xl p-3 text-center transition-all',
                'hover:shadow-sm',
                action.bgColor
              )}
            >
              <action.icon
                className={cn(
                  'h-5 w-5 transition-transform group-hover:scale-110',
                  action.color
                )}
              />
              <div>
                <p className="text-xs font-medium">{action.label}</p>
                <p className="text-[10px] text-muted-foreground">{action.description}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
