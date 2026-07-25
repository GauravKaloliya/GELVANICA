export class ExponentialBackoff {
  private delay = 5000
  private maxDelay = 300000
  private multiplier = 2

  next(): number {
    const current = this.delay
    this.delay = Math.min(this.delay * this.multiplier, this.maxDelay)
    return current
  }

  reset(): void {
    this.delay = 5000
  }

  get currentDelay(): number {
    return this.delay
  }
}
