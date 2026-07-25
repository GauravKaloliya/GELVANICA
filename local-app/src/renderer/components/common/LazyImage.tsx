import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ImageOff } from 'lucide-react'

export function LazyImage({ src, alt, className, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting && imgRef.current && src) { imgRef.current.src = src; obs.disconnect() }
    }, { rootMargin: '100px' })
    if (imgRef.current) obs.observe(imgRef.current)
    return () => obs.disconnect()
  }, [src])

  if (error) return <div className={cn('flex items-center justify-center bg-muted', className)}><ImageOff className="h-6 w-6 text-muted-foreground" /></div>
  return <img ref={imgRef} alt={alt ?? ''} className={cn('transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0', className)} onLoad={() => setLoaded(true)} onError={() => setError(true)} {...props} />
}
