import { useState, useCallback } from 'react'
import { Download, ExternalLink, Minus, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PdfViewerProps {
  src: string
  fileName?: string
  className?: string
  onClose?: () => void
}

export function PdfViewer({ src, fileName, className, onClose }: PdfViewerProps) {
  const [zoom, setZoom] = useState(100)

  const zoomIn = useCallback(() => setZoom((z) => Math.min(z + 10, 200)), [])
  const zoomOut = useCallback(() => setZoom((z) => Math.max(z - 10, 40)), [])
  const resetZoom = useCallback(() => setZoom(100), [])

  const handleDownload = useCallback(() => {
    const a = document.createElement('a')
    a.href = src
    a.download = fileName || 'document.pdf'
    a.click()
  }, [src, fileName])

  const handleOpenExternal = useCallback(() => {
    window.open(src, '_blank')
  }, [src])

  return (
    <div className={`flex h-full flex-col bg-muted/30 ${className ?? ''}`}>
      <div className="flex items-center gap-1 border-b border-border px-3 py-2">
        {fileName && (
          <span className="mr-2 truncate text-xs font-medium text-muted-foreground">{fileName}</span>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomOut} aria-label="Zoom out">
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <button
          onClick={resetZoom}
          className="min-w-[3rem] rounded px-1 py-0.5 text-center text-xs text-muted-foreground hover:bg-muted"
        >
          {zoom}%
        </button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomIn} aria-label="Zoom in">
          <Plus className="h-3.5 w-3.5" />
        </Button>
        <div className="mx-1 h-4 w-px bg-border" />
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload} title="Download" aria-label="Download">
          <Download className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleOpenExternal} title="Open externally" aria-label="Open externally">
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
        {onClose && (
          <>
            <div className="flex-1" />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} aria-label="Close">
              <X className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        <iframe
          src={src}
          title={fileName || 'PDF Viewer'}
          className="h-full w-full border-0"
          style={{ zoom: zoom / 100 }}
        />
      </div>
    </div>
  )
}
