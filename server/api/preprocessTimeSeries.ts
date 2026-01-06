import type { TimeSeries } from '~/types/mutation'

function movingAvg(values: number[], windowSize: number): number[] {
  if (!windowSize || windowSize <= 1)
    return values.slice()
  const k = Math.max(1, windowSize)
  const half = Math.floor((k - 1) / 2)
  const out: number[] = []
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - half)
    const end = Math.min(values.length, start + k)
    const slice = values.slice(start, end)
    const mean = slice.reduce((sum, v) => sum + v, 0) / slice.length
    out.push(mean)
  }
  return out
}

function differencing(values: number[], order: number): number[] {
  let out = values.slice()
  for (let d = 0; d < order; d++) {
    const next: number[] = []
    for (let i = 1; i < out.length; i++)
      next.push(out[i] - out[i - 1])
    out = next
    if (!out.length)
      break
  }
  return out
}

function normalizeSeries(raw: TimeSeries | undefined): TimeSeries | null {
  if (!raw || typeof raw !== 'object')
    return null
  const id = typeof raw.id === 'string' && raw.id.length ? raw.id : (typeof raw.label === 'string' ? raw.label : '')
  const label = typeof raw.label === 'string' && raw.label.length ? raw.label : id
  if (!id && !label)
    return null
  const lat = Number(raw.lat)
  const lon = Number(raw.lon)
  const pointsSrc = Array.isArray(raw.points) ? raw.points : []
  const points = pointsSrc.map((p) => {
    const t = new Date(p?.t as any)
    const v = Number(p?.v)
    if (Number.isNaN(t.getTime()) || Number.isNaN(v))
      return null
    return { t, v }
  }).filter((p): p is { t: Date, v: number } => Boolean(p)).sort((a, b) => a.t.getTime() - b.t.getTime())
  if (!points.length)
    return null
  return {
    id: id || label,
    label: label || id || 'series',
    lat: Number.isFinite(lat) ? lat : Number.NaN,
    lon: Number.isFinite(lon) ? lon : Number.NaN,
    points,
  }
}

function preprocessSeries(series: TimeSeries, smoothWindow: number, diffOrder: number): TimeSeries {
  const sortedPoints = series.points.slice().sort((a, b) => a.t.getTime() - b.t.getTime())
  const values = sortedPoints.map(p => Number(p.v))
  const times = sortedPoints.map(p => p.t)
  let processed = movingAvg(values, smoothWindow)
  processed = differencing(processed, diffOrder)
  const timeOffset = Math.max(0, times.length - processed.length)
  const alignedTimes = times.slice(timeOffset)
  const points = processed.map((v, idx) => ({ t: alignedTimes[idx] ?? times[Math.min(times.length - 1, idx)], v }))
  return { ...series, points }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event) as {
    smoothWindow?: number
    diffOrder?: number
  }
  const smoothWindow = query.smoothWindow ?? 1
  const diffOrder = query.diffOrder ?? 1

  let body: any
  try {
    body = await readBody(event)
  }
  catch (err) {
    setResponseStatus(event, 400)
    return {
      processedSeries: [],
      error: 'Failed to parse request body',
      detail: String(err),
    }
  }

  const rawSeriesInput = body
  if (!Array.isArray(rawSeriesInput)) {
    setResponseStatus(event, 400)
    return {
      processedSeries: [],
      error: 'rawSeries must be an array',
      detail: `Got: ${typeof rawSeriesInput}`,
    }
  }

  const processedSeries: TimeSeries[] = []
  for (const raw of rawSeriesInput) {
    const normalized = normalizeSeries(raw)
    if (!normalized)
      continue
    processedSeries.push(preprocessSeries(normalized, smoothWindow, diffOrder))
  }

  return {
    processedSeries,
    error: null,
    detail: null,
  }
})
