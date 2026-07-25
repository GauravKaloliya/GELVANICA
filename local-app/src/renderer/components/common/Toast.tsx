import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner'

type ToastOptions = {
  title?: string
  description?: string
  duration?: number
}

function createToast(options: ToastOptions | string) {
  if (typeof options === 'string') {
    return sonnerToast(options)
  }
  if (options.title && options.description) {
    return sonnerToast(options.title, { description: options.description, duration: options.duration })
  }
  return sonnerToast(options.title ?? '', { duration: options.duration })
}

createToast.success = (message: string, options?: ToastOptions) =>
  sonnerToast.success(message, { description: options?.description, duration: options?.duration })

createToast.error = (message: string, options?: ToastOptions) =>
  sonnerToast.error(message, { description: options?.description, duration: options?.duration })

createToast.warning = (message: string, options?: ToastOptions) =>
  sonnerToast.warning(message, { description: options?.description, duration: options?.duration })

createToast.info = (message: string, options?: ToastOptions) =>
  sonnerToast.info(message, { description: options?.description, duration: options?.duration })

createToast.dismiss = sonnerToast.dismiss

export { createToast as toast, sonnerToast }

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      richColors
      closeButton
      duration={4000}
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
    />
  )
}
