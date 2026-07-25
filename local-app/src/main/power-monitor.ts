import { powerMonitor, BrowserWindow } from 'electron'
import { LocalServer } from './local-server'
import { logger } from './logger'

export class PowerMonitorService {
  private localServer: LocalServer
  private wasSyncing = false

  constructor(localServer: LocalServer) {
    this.localServer = localServer
    this.registerListeners()
  }

  private registerListeners(): void {
    powerMonitor.on('suspend', () => {
      this.handleSuspend()
    })

    powerMonitor.on('resume', () => {
      this.handleResume()
    })

    powerMonitor.on('on-battery', () => {
      this.broadcastPowerState('battery')
    })

    powerMonitor.on('on-ac', () => {
      this.broadcastPowerState('ac')
    })

    powerMonitor.on('shutdown', () => {
      this.handleShutdown()
    })
  }

  private handleSuspend(): void {
    logger.info('PowerMonitor', 'System suspending — pausing background tasks')
    this.wasSyncing = true
    this.broadcast('sync:status-changed', {
      status: 'suspended',
      message: 'System suspended, sync paused',
    })
  }

  private handleResume(): void {
    logger.info('PowerMonitor', 'System resumed — restarting background tasks')
    this.broadcast('sync:status-changed', {
      status: 'resuming',
      message: 'System resumed, restarting sync',
    })

    if (this.wasSyncing) {
      this.wasSyncing = false
      this.broadcast('sync:trigger', {})
    }
  }

  private handleShutdown(): void {
    logger.info('PowerMonitor', 'System shutting down')
    if (this.localServer) {
      this.localServer.kill()
    }
  }

  private broadcastPowerState(state: 'battery' | 'ac'): void {
    this.broadcast('power:state-changed', { state })
  }

  private broadcast(channel: string, data: unknown): void {
    BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send(channel, data)
      }
    })
  }
}
