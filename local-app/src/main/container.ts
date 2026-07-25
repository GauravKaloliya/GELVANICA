import type { AuthService } from './auth-service'
import type { LocalServer } from './local-server'
import type { WindowManager } from './window-manager'
import type { TrayManager } from './tray'
import { logger } from './logger'

interface ServiceRegistry {
  authService: AuthService
  localServer: LocalServer
  windowManager: WindowManager
  trayManager: TrayManager
}

class Container {
  private services: Partial<ServiceRegistry> = {}
  private initialized = false

  register<K extends keyof ServiceRegistry>(name: K, service: ServiceRegistry[K]): void {
    this.services[name] = service
    logger.debug('Container', `Registered service: ${name}`)
  }

  get<K extends keyof ServiceRegistry>(name: K): ServiceRegistry[K] {
    const service = this.services[name]
    if (!service) {
      throw new Error(`Service '${name}' not registered in container`)
    }
    return service
  }

  has<K extends keyof ServiceRegistry>(name: K): boolean {
    return name in this.services
  }

  markInitialized(): void {
    this.initialized = true
    logger.info('Container', 'All services registered')
  }

  isInitialized(): boolean {
    return this.initialized
  }
}

export const container = new Container()
