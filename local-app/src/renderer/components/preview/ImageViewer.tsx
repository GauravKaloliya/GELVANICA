import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ZoomIn, ZoomOut, RotateCw, RotateCcw, Maximize2, Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ImageViewerProps {
  src: string
  alt?: string
  className?: string
  onClose?: () => void
}

export function ImageViewer({ src, alt, className, onClose }: ImageViewerProps) {
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const zoomIn = useCallback(() => setScale((s) => Math.min(s + 0.25, 5)), [])
  const zoomOut = useCallback(() => setScale((s) => Math.max(s - 0.25, 0.25)), [])
  const rotateCW = useCallback(() => setRotation((r) => r + 90), [])
  const rotateCCW = useCallback(() => setRotation((r) => r - 90), [])
  const resetTransform = useCallback(() => {
    setScale(1)
    setRotation(0)
    setPosition({ x: 0, y: 0 })
  }, [])

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) {
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        setScale((s) => Math.max(0.25, Math.min(5, s + delta)))
      } else {
        setPosition((p) => ({
          x: p.x - e.deltaX,
          y: p.y - e.deltaY,
        }))
      }
    },
    []
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return
      setIsDragging(true)
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
    },
    [position]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    },
    [isDragging, dragStart]
  )

  const handleMouseUp = useCallback(() => setIsDragging(false), [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.()
      if (e.key === '+' || e.key === '=') zoomIn()
      if (e.key === '-') zoomOut()
      if (e.key === 'r') rotateCW()
      if (e.key === '0') resetTransform()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, zoomIn, zoomOut, rotateCW, resetTransform])

  const handleDownload = useCallback(() => {
    const a = document.createElement('a')
    a.href = src
    a.download = alt || 'image'
    a.click()
  }, [src, alt])

  return (
    <div className={`flex h-full flex-col bg-black/90 ${className ?? ''}`}>
      <div className="flex items-center gap-1 border-b border-white/10 bg-black/50 px-3 py-2">
        <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white" onClick={zoomOut} aria-label="Zoom out">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="min-w-[3rem] text-center text-xs text-white/60">{Math.round(scale * 100)}%</span>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white" onClick={zoomIn} aria-label="Zoom in">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <div className="mx-1 h-4 w-px bg-white/20" />
        <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white" onClick={rotateCCW} aria-label="Rotate counterclockwise">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white" onClick={rotateCW} aria-label="Rotate clockwise">
          <RotateCw className="h-4 w-4" />
        </Button>
        <div className="mx-1 h-4 w-px bg-white/20" />
        <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white" onClick={resetTransform} aria-label="Reset view">
          <Maximize2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white" onClick={handleDownload} aria-label="Download">
          <Download className="h-4 w-4" />
        </Button>
        {onClose && (
          <>
            <div className="flex-1" />
            <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
      <div
        ref={containerRef}
        className="flex flex-1 items-center justify-center overflow-hidden"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <motion.img
          ref={imgRef}
          src={src}
          alt={alt ?? ''}
          className="max-h-full select-none object-contain"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
          draggable={false}
          onLoad={resetTransform}
        />
      </div>
    </div>
  )
}
