import { $id, $el } from '../lib/helpers.js'
import { getGraph, materializeGraph, queryGraph, traverseGraph, findPaths } from '../lib/api.js'

let _store = null
let _cleanup = null
let _graphData = null

export function render() {
  return `<div class="graph-page">
    <div class="graph-toolbar">
      <button class="graph-btn graph-btn--materialize" data-action="materialize" title="Materialize graph">Materialize</button>
      <button class="graph-btn graph-btn--refresh" data-action="refresh" title="Refresh graph">Refresh</button>
      <span class="graph-status" id="graphStatus">Loading...</span>
    </div>
    <div class="graph-canvas-wrap" id="graphCanvasWrap">
      <canvas id="graphCanvas" class="graph-canvas"></canvas>
    </div>
  </div>`
}

function drawGraph(canvas, data) {
  if (!canvas || !data) return
  const ctx = canvas.getContext('2d')
  const rect = canvas.parentElement.getBoundingClientRect()
  canvas.width = rect.width * devicePixelRatio
  canvas.height = rect.height * devicePixelRatio
  canvas.style.width = rect.width + 'px'
  canvas.style.height = rect.height + 'px'
  ctx.scale(devicePixelRatio, devicePixelRatio)
  const w = rect.width, h = rect.height

  const nodes = data.graph_snapshot?.nodes || []
  const edges = data.graph_snapshot?.edges || []
  if (!nodes.length) {
    ctx.fillStyle = 'var(--muted)'
    ctx.font = '14px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText('No graph data — click Materialize', w / 2, h / 2)
    return
  }

  const positions = {}
  const cx = w / 2, cy = h / 2
  const radius = Math.min(w, h) * 0.35
  nodes.forEach((n, i) => {
    const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2
    positions[n.id] = { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius }
  })

  ctx.clearRect(0, 0, w, h)

  for (const e of edges) {
    const src = positions[e.source]
    const tgt = positions[e.target]
    if (!src || !tgt) continue
    ctx.beginPath()
    ctx.moveTo(src.x, src.y)
    ctx.lineTo(tgt.x, tgt.y)
    ctx.strokeStyle = 'var(--border)'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }

  for (const n of nodes) {
    const p = positions[n.id]
    if (!p) continue
    ctx.beginPath()
    ctx.arc(p.x, p.y, 8, 0, Math.PI * 2)
    ctx.fillStyle = '#3b82f6'
    ctx.fill()
    ctx.fillStyle = 'var(--foreground)'
    ctx.font = '11px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText(n.title || 'Untitled', p.x, p.y + 22)
  }
}

async function loadGraph() {
  const status = $id('graphStatus')
  const canvas = $id('graphCanvas')
  if (status) status.textContent = 'Loading...'
  try {
    _graphData = await getGraph('default')
    if (status) status.textContent = 'Ready'
    drawGraph(canvas, _graphData)
  } catch {
    if (status) status.textContent = 'No graph — materialize first'
    if (canvas) {
      const ctx = canvas.getContext('2d')
      const rect = canvas.parentElement.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
      ctx.fillStyle = 'var(--muted)'
      ctx.font = '14px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText('No graph data — click Materialize', rect.width / 2, rect.height / 2)
    }
  }
}

export function mount(store) {
  _store = store
  const container = $id('mainContent')

  loadGraph()

  function attachEvents() {
    if (_cleanup) { _cleanup(); _cleanup = null }

    const clickHandler = async (e) => {
      const btn = e.target.closest('[data-action]')
      if (!btn) return
      const action = btn.dataset.action
      const status = $id('graphStatus')
      const canvas = $id('graphCanvas')

      if (action === 'materialize') {
        if (status) status.textContent = 'Materializing...'
        try {
          await materializeGraph('default')
          await loadGraph()
          if (status) status.textContent = 'Ready'
        } catch { if (status) status.textContent = 'Failed' }
      }

      if (action === 'refresh') {
        await loadGraph()
      }
    }

    container.addEventListener('click', clickHandler)

    const resizeHandler = () => {
      if (_graphData) drawGraph($id('graphCanvas'), _graphData)
    }
    window.addEventListener('resize', resizeHandler)

    _cleanup = () => {
      container.removeEventListener('click', clickHandler)
      window.removeEventListener('resize', resizeHandler)
    }
  }

  attachEvents()
}

export function unmount() {
  if (_cleanup) { _cleanup(); _cleanup = null }
  _graphData = null
  _store = null
}
