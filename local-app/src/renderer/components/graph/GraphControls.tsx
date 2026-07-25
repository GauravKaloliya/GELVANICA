import { useState, useCallback, forwardRef } from 'react'
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  RotateCcw,
  Lock,
  Unlock,
  Grid3X3,
  RefreshCw,
  Download,
  FileImage,
  FileCode2,
  FileJson,
  PinOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface GraphControlsProps {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
  onReset: () => void
  isLocked: boolean
  onToggleLock: () => void
  showGrid: boolean
  onToggleGrid: () => void
  isRefreshing?: boolean
  onRefresh?: () => void
  nodeCount: number
  edgeCount: number
  onExportPng?: () => void
  onExportSvg?: () => void
  onExportJson?: () => void
  pinnedCount?: number
  onUnpinAll?: () => void
  className?: string
}

export const GraphControls = forwardRef<HTMLDivElement, GraphControlsProps>(
  function GraphControls(
    {
      zoom,
      onZoomIn,
      onZoomOut,
      onFit,
      onReset,
      isLocked,
      onToggleLock,
      showGrid,
      onToggleGrid,
      isRefreshing,
      onRefresh,
      nodeCount,
      edgeCount,
      onExportPng,
      onExportSvg,
      onExportJson,
      pinnedCount,
      onUnpinAll,
      className,
    },
    ref
  ) {
    const [isExporting, setIsExporting] = useState(false)

    const handleExport = useCallback(
      async (format: 'png' | 'svg' | 'json') => {
        setIsExporting(true)
        try {
          if (format === 'png') onExportPng?.()
          else if (format === 'svg') onExportSvg?.()
          else if (format === 'json') onExportJson?.()
        } finally {
          setIsExporting(false)
        }
      },
      [onExportPng, onExportSvg, onExportJson]
    )

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center gap-1 rounded-xl border bg-background/95 p-1 shadow-lg backdrop-blur-sm',
          className
        )}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onZoomIn}
                disabled={zoom >= 3}
                aria-label="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Zoom in</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Badge
          variant="secondary"
          className="h-6 min-w-[3.5rem] justify-center px-1.5 text-[10px] font-mono tabular-nums"
        >
          {Math.round(zoom * 100)}%
        </Badge>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onZoomOut}
                disabled={zoom <= 0.3}
                aria-label="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Zoom out</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Separator orientation="vertical" className="mx-0.5 h-5" />

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onFit} aria-label="Fit to view">
                <Maximize className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Fit to view</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onReset} aria-label="Reset view">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Reset view</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Separator orientation="vertical" className="mx-0.5 h-5" />

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showGrid ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={onToggleGrid}
                aria-label="Toggle grid"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Toggle grid</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isLocked ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={onToggleLock}
                aria-label={isLocked ? 'Unlock layout' : 'Lock layout'}
              >
                {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isLocked ? 'Unlock layout' : 'Lock layout'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {onRefresh && (
          <>
            <Separator orientation="vertical" className="mx-0.5 h-5" />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    aria-label="Refresh graph"
                  >
                    <RefreshCw
                      className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Refresh graph</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        )}

        {/* Export */}
        {(onExportPng || onExportSvg || onExportJson) && (
          <>
            <Separator orientation="vertical" className="mx-0.5 h-5" />
            <DropdownMenu>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={isExporting}
                        aria-label="Export graph"
                      >
                        <Download
                          className={cn(
                            'h-4 w-4',
                            isExporting && 'animate-pulse'
                          )}
                        />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Export graph</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent align="end" className="w-44">
                {onExportPng && (
                  <DropdownMenuItem onClick={() => handleExport('png')}>
                    <FileImage className="mr-2 h-3.5 w-3.5" />
                    Export as PNG
                  </DropdownMenuItem>
                )}
                {onExportSvg && (
                  <DropdownMenuItem onClick={() => handleExport('svg')}>
                    <FileCode2 className="mr-2 h-3.5 w-3.5" />
                    Export as SVG
                  </DropdownMenuItem>
                )}
                {onExportJson && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleExport('json')}>
                      <FileJson className="mr-2 h-3.5 w-3.5" />
                      Export as JSON
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}

        {/* Unpin all */}
        {pinnedCount != null && pinnedCount > 0 && onUnpinAll && (
          <>
            <Separator orientation="vertical" className="mx-0.5 h-5" />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={onUnpinAll}
                    aria-label="Unpin all nodes"
                  >
                    <PinOff className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Unpin all ({pinnedCount})
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        )}

        <Separator orientation="vertical" className="mx-0.5 h-5" />
        <div className="flex items-center gap-2 px-1.5 text-[10px]">
          <span className="font-medium text-primary">{nodeCount}</span>
          <span className="text-muted-foreground">nodes</span>
          <span className="font-medium text-muted-foreground">{edgeCount}</span>
          <span className="text-muted-foreground">edges</span>
        </div>
      </div>
    )
  }
)
