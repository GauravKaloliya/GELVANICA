import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { cn } from '@/lib/utils'

export function OfflineIndicator({ className }: { className?: string }) {
  const { isOnline } = useOnlineStatus()

  if (isOnline) return null

  return (
    <div className={cn(
      'flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-sm text-destructive',
      className,
    )}>
      <WifiOff className="h-4 w-4" />
      <span>You are offline</span>
    </div>
  )
}
