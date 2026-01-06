import type { MutationDetectionParams, MutationPoint, TimeSeries } from '~/types/mutation'

function clampInt(value: unknown, { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY }: { min?: number, max?: number } = {}) {
  const num = Number(value)
  if (Number.isNaN(num))
    return min
  return Math.min(max, Math.max(min, Math.floor(num)))
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

function mean(arr: number[]): number {
  if (!arr.length)
    return 0
  return arr.reduce((sum, v) => sum + v, 0) / arr.length
}

function variance(arr: number[]): number {
  if (arr.length < 2)
    return 0
  const m = mean(arr)
  return arr.reduce((sum, v) => sum + (v - m) * (v - m), 0) / (arr.length - 1)
}

function pettittTest(arr: number[], minSegmentLength = 1): { changeIndex: number } {
  const n = arr.length
  if (n < 2)
    return { changeIndex: -1 }
  const Kvals = Array.from({ length: n }, () => 0)
  for (let t = 0; t < n; t++) {
    let Kt = 0
    for (let i = 0; i <= t; i++) {
      for (let j = t + 1; j < n; j++) {
        const diff = arr[i] - arr[j]
        if (diff > 0)
          Kt += 1
        else if (diff < 0)
          Kt -= 1
      }
    }
    Kvals[t] = Kt
  }
  let Kmax = 0
  let changeIndex = -1
  for (let t = 0; t < n; t++) {
    if (Math.abs(Kvals[t]) > Math.abs(Kmax)) {
      Kmax = Kvals[t]
      changeIndex = t
    }
  }
  if (changeIndex >= 0) {
    const leftLen = changeIndex + 1
    const rightLen = n - (changeIndex + 1)
    if (leftLen < minSegmentLength || rightLen < minSegmentLength)
      changeIndex = -1
  }
  return { changeIndex }
}

function olsSlope(values: number[], xs: number[]): number {
  const n = values.length
  if (n < 2)
    return 0
  const meanX = xs.reduce((s, v) => s + v, 0) / n
  const meanY = values.reduce((s, v) => s + v, 0) / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (values[i] - meanY)
    den += (xs[i] - meanX) * (xs[i] - meanX)
  }
  return den === 0 ? 0 : num / den
}

function senSlope(values: number[], xs: number[]): number {
  const n = values.length
  const slopes: number[] = []
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = xs[j] - xs[i]
      if (dx === 0)
        continue
      slopes.push((values[j] - values[i]) / dx)
    }
  }
  if (!slopes.length)
    return 0
  slopes.sort((a, b) => a - b)
  const m = slopes.length
  return m % 2 === 1 ? slopes[(m - 1) / 2] : (slopes[m / 2 - 1] + slopes[m / 2]) / 2
}

function sequentialTAvg(years: number[], values: number[], minSegmentLength: number) {
  const n = values.length
  if (n < minSegmentLength * 2)
    return { changeIndex: -1 }
  let bestStat = -Infinity
  let bestIdx = -1
  for (let t = minSegmentLength - 1; t <= n - minSegmentLength - 1; t++) {
    const left = values.slice(0, t + 1)
    const right = values.slice(t + 1)
    if (!left.length || !right.length)
      continue
    const m1 = mean(left)
    const m2 = mean(right)
    const v1 = variance(left)
    const v2 = variance(right)
    const se = Math.sqrt((v1 / left.length) + (v2 / right.length))
    const stat = se > 0 ? Math.abs(m2 - m1) / se : 0
    if (stat > bestStat) {
      bestStat = stat
      bestIdx = t
    }
  }
  return { changeIndex: bestIdx }
}

function sequentialTTrendOls(years: number[], values: number[], minSegmentLength: number) {
  const n = values.length
  if (n < minSegmentLength * 2)
    return { changeIndex: -1 }
  const xs = years.map((_y, idx) => idx)
  let bestStat = -Infinity
  let bestIdx = -1
  for (let t = minSegmentLength - 1; t <= n - minSegmentLength - 1; t++) {
    const x1 = xs.slice(0, t + 1)
    const v1 = values.slice(0, t + 1)
    const x2 = xs.slice(t + 1)
    const v2 = values.slice(t + 1)
    if (v1.length < minSegmentLength || v2.length < minSegmentLength)
      continue
    const s1 = olsSlope(v1, x1)
    const s2 = olsSlope(v2, x2)
    const stat = Math.abs(s2 - s1)
    if (stat > bestStat) {
      bestStat = stat
      bestIdx = t
    }
  }
  return { changeIndex: bestIdx }
}

function sequentialTTrendSen(years: number[], values: number[], minSegmentLength: number) {
  const n = values.length
  if (n < minSegmentLength * 2)
    return { changeIndex: -1 }
  const xs = years.map((_y, idx) => idx)
  let bestStat = -Infinity
  let bestIdx = -1
  for (let t = minSegmentLength - 1; t <= n - minSegmentLength - 1; t++) {
    const x1 = xs.slice(0, t + 1)
    const v1 = values.slice(0, t + 1)
    const x2 = xs.slice(t + 1)
    const v2 = values.slice(t + 1)
    if (v1.length < minSegmentLength || v2.length < minSegmentLength)
      continue
    const s1 = senSlope(v1, x1)
    const s2 = senSlope(v2, x2)
    const stat = Math.abs(s2 - s1)
    if (stat > bestStat) {
      bestStat = stat
      bestIdx = t
    }
  }
  return { changeIndex: bestIdx }
}

function detectChangeIndex(values: number[], years: number[], method: string, minSegmentLength: number): number {
  let changeIndex = -1
  switch (method) {
    case 'seq-t-avg': {
      const res = sequentialTAvg(years, values, minSegmentLength)
      changeIndex = res.changeIndex
      break
    }
    case 'seq-t-ols': {
      const res = sequentialTTrendOls(years, values, minSegmentLength)
      changeIndex = res.changeIndex
      break
    }
    case 'seq-t-sen': {
      const res = sequentialTTrendSen(years, values, minSegmentLength)
      changeIndex = res.changeIndex
      break
    }
    case 'pettitt':
    default: {
      const res = pettittTest(values, minSegmentLength)
      changeIndex = res.changeIndex
      break
    }
  }
  if (typeof changeIndex === 'number' && changeIndex >= 0 && changeIndex < years.length)
    return changeIndex
  return -1
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event) as Partial<MutationDetectionParams> & {
    mutationMethod?: string
    minSegLen?: number | string
  }

  const mutationMethod = (query.mutationMethod ?? query.method ?? 'pettitt').toString().trim().toLowerCase() || 'pettitt'
  const minSegmentLength = clampInt(query.minSegLen ?? query.minSegmentLength ?? 5, { min: 1, max: 1000 })

  let body: any
  try {
    body = await readBody(event)
  }
  catch (err) {
    setResponseStatus(event, 400)
    return {
      mutationPoints: [],
      error: 'Failed to parse request body',
      detail: String(err),
    }
  }

  // Support two body shapes for backward compatibility:
  // 1) Array of processed series (legacy)
  // 2) { processedSeries: [...], rawSeries: [...] } (preferred)
  let processedInput: any[] = []
  let rawInput: any[] = []
  if (Array.isArray(body)) {
    processedInput = body
  }
  else if (body && typeof body === 'object' && Array.isArray(body.processedSeries)) {
    processedInput = body.processedSeries
    rawInput = Array.isArray(body.rawSeries) ? body.rawSeries : []
  }
  else {
    setResponseStatus(event, 400)
    return {
      mutationPoints: [],
      error: 'Request body must be an array of processed series or an object with processedSeries/rawSeries',
    }
  }

  const normalizedProcessed: TimeSeries[] = []
  for (const raw of processedInput) {
    const normalized = normalizeSeries(raw)
    if (normalized)
      normalizedProcessed.push(normalized)
  }

  const normalizedRawById = new Map<string, TimeSeries>()
  for (const raw of rawInput) {
    const normalized = normalizeSeries(raw)
    if (normalized)
      normalizedRawById.set(normalized.id, normalized)
  }

  if (!normalizedProcessed.length) {
    setResponseStatus(event, 400)
    return {
      mutationPoints: [],
      error: 'No valid processed time series provided',
    }
  }

  const mutationPoints: MutationPoint[] = []
  for (const series of normalizedProcessed) {
    const orderedPoints = series.points.slice().sort((a, b) => a.t.getTime() - b.t.getTime())
    const values = orderedPoints.map(p => p.v)
    const years = orderedPoints.map(p => p.t.getFullYear())
    const changeIndex = detectChangeIndex(values, years, mutationMethod, minSegmentLength)
    if (changeIndex < 0)
      continue
    const year = years[changeIndex]

    // Try to compute pre/post stats using the corresponding raw series if available.
    const rawSeries = normalizedRawById.get(series.id)

    let preVals: number[] = []
    let postVals: number[] = []

    if (rawSeries && Array.isArray(rawSeries.points) && rawSeries.points.length) {
      const rawOrdered = rawSeries.points.slice().sort((a, b) => a.t.getTime() - b.t.getTime())
      // Attempt to map processed change index to raw index. First try direct timestamp match.
      const processedTimestamp = orderedPoints[changeIndex]?.t?.getTime()
      let rawIdx = -1
      if (typeof processedTimestamp === 'number') {
        rawIdx = rawOrdered.findIndex(p => p.t.getTime() === processedTimestamp)
      }
      // If direct match not found, try align by offset using first timestamp.
      if (rawIdx < 0 && orderedPoints.length && rawOrdered.length) {
        const firstProcessedTs = orderedPoints[0]?.t?.getTime()
        const offset = typeof firstProcessedTs === 'number' ? rawOrdered.findIndex(p => p.t.getTime() === firstProcessedTs) : -1
        if (offset >= 0)
          rawIdx = offset + changeIndex
      }
      // If still not found, fallback to nearest timestamp within tolerance (1 day)
      if (rawIdx < 0 && typeof processedTimestamp === 'number') {
        let bestDiff = Infinity
        for (let i = 0; i < rawOrdered.length; i++) {
          const diff = Math.abs(rawOrdered[i].t.getTime() - processedTimestamp)
          if (diff < bestDiff) {
            bestDiff = diff
            rawIdx = i
          }
        }
      }

      if (rawIdx >= 0) {
        preVals = rawOrdered.slice(0, rawIdx + 1).map(p => p.v)
        postVals = rawOrdered.slice(rawIdx + 1).map(p => p.v)
      }
    }

    // Fallback to processed values if raw mapping failed
    if (!preVals.length || !postVals.length) {
      const procPre = values.slice(0, changeIndex + 1)
      const procPost = values.slice(changeIndex + 1)
      preVals = procPre
      postVals = procPost
    }

    if (!preVals.length || !postVals.length)
      continue

    const preXs = preVals.map((_v, idx) => idx)
    const postXs = postVals.map((_v, idx) => idx + (preVals.length))
    mutationPoints.push({
      lakeId: series.id,
      year,
      index: changeIndex,
      preAvg: mean(preVals),
      postAvg: mean(postVals),
      preOls: olsSlope(preVals, preXs),
      postOls: olsSlope(postVals, postXs),
      preSen: senSlope(preVals, preXs),
      postSen: senSlope(postVals, postXs),
      preVar: variance(preVals),
      postVar: variance(postVals),
    })
  }

  return {
    mutationPoints,
    error: null,
    detail: { mutationMethod, minSegmentLength },
  }
})
