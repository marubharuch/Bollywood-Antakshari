/**
 * Procedural Web Audio — no external copyrighted assets.
 */
export class IntroAudioEngine {
  constructor() {
    this.ctx = null
    this.master = null
    this.nodes = []
    this.enabled = true
    this.volume = 0.75
  }

  ensureContext() {
    if (this.ctx) return this.ctx
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return null
    this.ctx = new Ctx()
    this.master = this.ctx.createGain()
    this.master.gain.value = this.enabled ? this.volume : 0
    this.master.connect(this.ctx.destination)
    return this.ctx
  }

  setOptions({ enabled, volume }) {
    this.enabled = enabled !== false
    if (typeof volume === 'number') this.volume = volume
    if (this.master) {
      this.master.gain.value = this.enabled ? this.volume : 0
    }
  }

  async resume() {
    const ctx = this.ensureContext()
    if (ctx?.state === 'suspended') await ctx.resume()
  }

  stopAll() {
    this.nodes.forEach((n) => {
      try {
        n.stop?.()
        n.disconnect?.()
      } catch {
        /* already stopped */
      }
    })
    this.nodes = []
  }

  dispose() {
    this.stopAll()
    if (this.ctx) {
      this.ctx.close().catch(() => {})
      this.ctx = null
      this.master = null
    }
  }

  _osc(type, freq, start, duration, gain = 0.08) {
    const ctx = this.ensureContext()
    if (!ctx || !this.enabled) return
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    g.gain.setValueAtTime(0, start)
    g.gain.linearRampToValueAtTime(gain * this.volume, start + 0.05)
    g.gain.exponentialRampToValueAtTime(0.001, start + duration)
    osc.connect(g)
    g.connect(this.master)
    osc.start(start)
    osc.stop(start + duration + 0.05)
    this.nodes.push(osc)
  }

  playGrandSequence(reducedMotion) {
    this.stopAll()
    const ctx = this.ensureContext()
    if (!ctx || !this.enabled) return
    const t0 = ctx.currentTime + 0.1
    const scale = reducedMotion ? 0.35 : 1

    this._osc('sine', 55, t0, 4 * scale, 0.12)
    this._osc('sine', 110, t0 + 0.5 * scale, 3 * scale, 0.06)
    this._osc('triangle', 220, t0 + 3 * scale, 2 * scale, 0.05)
    this._osc('sine', 330, t0 + 8 * scale, 1.5 * scale, 0.1)
    this._osc('triangle', 440, t0 + 14 * scale, 2 * scale, 0.12)
    this._osc('sine', 523, t0 + 18 * scale, 3 * scale, 0.1)
    this._osc('square', 880, t0 + 22 * scale, 0.4 * scale, 0.04)
  }

  playRoundSting(reducedMotion) {
    this.stopAll()
    const ctx = this.ensureContext()
    if (!ctx || !this.enabled) return
    const t0 = ctx.currentTime + 0.05
    const s = reducedMotion ? 0.4 : 1
    this._osc('triangle', 196, t0, 0.8 * s, 0.1)
    this._osc('sine', 392, t0 + 0.3 * s, 1.2 * s, 0.08)
    this._osc('sine', 587, t0 + 1.5 * s, 1.5 * s, 0.09)
  }
}

let sharedEngine = null

export function getIntroAudioEngine() {
  if (!sharedEngine) sharedEngine = new IntroAudioEngine()
  return sharedEngine
}
