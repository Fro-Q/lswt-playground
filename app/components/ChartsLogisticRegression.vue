<script setup lang="ts">
import type { MutationPoint } from '~/types/mutation'
import { computed } from 'vue'

interface LakeFactors {
  lake: string
  lat: number
  lon: number
  pw: number
  chlorophyll: number
  ndvi: number
  depth: number
  pd: number
  pwlg: number
  depthlg: number
  pdlg: number
  depthlg10: number
}

const props = defineProps<{
  mutations?: MutationPoint[]
  lakeFactors?: Map<string, LakeFactors>
  timeFilter?: {
    start?: number | undefined
    end?: number | undefined
  }
}>()

function withinTimeFilter(year: number, filter?: { start?: number | undefined, end?: number | undefined }) {
  if (!filter)
    return true
  if (filter.start != null && year < filter.start)
    return false
  if (filter.end != null && year > filter.end)
    return false
  return true
}

const featureLabels: Record<string, string> = {
  year: 'Year',
  preAvg: 'Pre Avg',
  deltaAvg: 'Δ Avg',
  preVar: 'Pre Var',
  deltaVar: 'Δ Var',
  pw: 'PW',
  chlorophyll: 'Chlorophyll',
  ndvi: 'NDVI',
  depth: 'Depth',
  pd: 'PD',
  pwlg: 'PWLG',
  depthlg: 'DepthLG',
  pdlg: 'PDLG',
  depthlg10: 'DepthLG10',
}

interface LogisticData {
  y: number[]
  X: Record<string, number[]>
}

const logisticData = computed<LogisticData | null>(() => {
  if (!props.mutations?.length || !props.lakeFactors?.size)
    return null

  const filteredMutations = props.mutations.filter(m => withinTimeFilter(m.year, props.timeFilter))
  if (!filteredMutations.length)
    return null

  const y: number[] = []
  const X: Record<string, number[]> = {}

  const allFeatures = ['year', 'preAvg', 'deltaAvg', 'preVar', 'deltaVar', 'pw', 'chlorophyll', 'ndvi', 'depth', 'pd', 'pwlg', 'depthlg', 'pdlg', 'depthlg10']

  allFeatures.forEach(f => X[f] = [])

  for (const mutation of filteredMutations) {
    const factors = props.lakeFactors?.get(mutation.lakeId)
    if (!factors)
      continue

    const deltaAvg = mutation.postAvg - mutation.preAvg
    const deltaSen = mutation.postSen - mutation.preSen
    const deltaVar = mutation.postVar - mutation.preVar

    const featureValues: Record<string, number> = {
      year: mutation.year,
      preAvg: mutation.preAvg,
      deltaAvg,
      preVar: mutation.preVar,
      deltaVar,
      pw: factors.pw,
      chlorophyll: factors.chlorophyll,
      ndvi: factors.ndvi,
      depth: factors.depth,
      pd: factors.pd,
      pwlg: factors.pwlg,
      depthlg: factors.depthlg,
      pdlg: factors.pdlg,
      depthlg10: factors.depthlg10,
    }

    const allValid = allFeatures.every(f => Number.isFinite(featureValues[f]))
    if (!allValid || !Number.isFinite(deltaSen))
      continue

    y.push(deltaSen > 0 ? 1 : 0)
    allFeatures.forEach((f) => {
      X[f].push(featureValues[f])
    })
  }

  if (y.length < 20)
    return null

  return { y, X }
})

function standardize(arr: number[]): { values: number[], mean: number, std: number } {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length
  const std = Math.sqrt(arr.reduce((acc, val) => acc + (val - mean) ** 2, 0) / arr.length)
  if (std === 0)
    return { values: arr.map(() => 0), mean, std: 1 }
  return { values: arr.map(val => (val - mean) / std), mean, std }
}

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z))
}

interface LogisticResult {
  name: string
  features: string[]
  coefficients: Record<string, number>
  bias: number
  accuracy: number
  positiveRate: number
}

function fitLogistic(y: number[], X: Record<string, number[]>, features: string[], iterations = 100): LogisticResult | null {
  const n = y.length
  if (n < features.length + 1)
    return null

  // Standardize features
  const XStd: Record<string, number[]> = {}
  features.forEach((f) => {
    XStd[f] = standardize(X[f]).values
  })

  // Initialize weights
  const weights: Record<string, number> = {}
  features.forEach(f => weights[f] = 0)
  let bias = 0

  const learningRate = 0.1

  // Gradient descent
  for (let iter = 0; iter < iterations; iter++) {
    const predictions: number[] = []
    for (let i = 0; i < n; i++) {
      let z = bias
      for (const f of features)
        z += weights[f] * XStd[f][i]
      predictions.push(sigmoid(z))
    }

    // Update weights
    const gradients: Record<string, number> = {}
    features.forEach(f => gradients[f] = 0)
    let biasGrad = 0

    for (let i = 0; i < n; i++) {
      const error = predictions[i] - y[i]
      biasGrad += error
      for (const f of features)
        gradients[f] += error * XStd[f][i]
    }

    bias -= (learningRate / n) * biasGrad
    features.forEach((f) => {
      weights[f] -= (learningRate / n) * gradients[f]
    })
  }

  // Calculate accuracy
  let correct = 0
  let positiveCount = 0
  for (let i = 0; i < n; i++) {
    let z = bias
    for (const f of features)
      z += weights[f] * XStd[f][i]
    const pred = sigmoid(z) >= 0.5 ? 1 : 0
    if (pred === y[i])
      correct++
    if (pred === 1)
      positiveCount++
  }

  return {
    name: '',
    features,
    coefficients: weights,
    bias,
    accuracy: correct / n,
    positiveRate: positiveCount / n,
  }
}

const model1 = computed<LogisticResult | null>(() => {
  if (!logisticData.value)
    return null
  const lakeFeatures = ['pw', 'chlorophyll', 'ndvi', 'depth', 'pd', 'pwlg', 'depthlg', 'pdlg', 'depthlg10']
  const result = fitLogistic(logisticData.value.y, logisticData.value.X, lakeFeatures)
  if (result)
    result.name = 'Model 1: Lake Features Only'
  return result
})

const model2 = computed<LogisticResult | null>(() => {
  if (!logisticData.value)
    return null
  const features = ['pw', 'chlorophyll', 'ndvi', 'depth', 'pd', 'pwlg', 'depthlg', 'pdlg', 'depthlg10', 'preAvg', 'deltaAvg', 'preVar', 'deltaVar']
  const result = fitLogistic(logisticData.value.y, logisticData.value.X, features)
  if (result)
    result.name = 'Model 2: Lake + Mutation Features'
  return result
})

const model3 = computed<LogisticResult | null>(() => {
  if (!logisticData.value)
    return null
  const features = ['pw', 'chlorophyll', 'ndvi', 'depth', 'pd', 'pwlg', 'depthlg', 'pdlg', 'depthlg10', 'preAvg', 'deltaAvg', 'preVar', 'deltaVar', 'year']
  const result = fitLogistic(logisticData.value.y, logisticData.value.X, features)
  if (result)
    result.name = 'Model 3: Lake + Mutation + Year'
  return result
})

const comparisonChart = computed(() => {
  const models = [model1.value, model2.value, model3.value].filter(m => m !== null) as LogisticResult[]
  if (!models.length)
    return null

  const data = [{
    type: 'bar',
    x: models.map(m => m.name),
    y: models.map(m => m.accuracy),
    marker: {
      color: usePlotlyColor('marker'),
      line: { color: usePlotlyColor('markerBorder'), width: 1 },
    },
    text: models.map(m => `${(m.accuracy * 100).toFixed(1)}%`),
    textposition: 'outside',
    hovertemplate: '%{x}<br>Accuracy: %{y:.2%}<extra></extra>',
    showlegend: false,
  }]

  const layout = {
    title: { text: 'Model Comparison: Classification Accuracy' },
    xaxis: { title: '' },
    yaxis: { title: 'Accuracy', range: [0, 1], tickformat: '.0%' },
    margin: { t: 60, r: 30, b: 120, l: 60 },
  }

  return { data, layout }
})

function getTopCoefficients(model: LogisticResult | null, topN = 10) {
  if (!model)
    return []
  const entries = Object.entries(model.coefficients)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, topN)
  return entries
}

const hasData = computed(() => logisticData.value !== null)
</script>

<template>
  <section
    un-flex="~ col"
    un-gap-3
  >
    <div
      v-if="!hasData"
      un-text="neutral-500 dark:neutral-400 center"
      un-p-8
    >
      Insufficient data for logistic regression (need at least 20 samples).
    </div>
    <div
      v-else
      un-flex="~ col"
      un-gap-4
    >
      <!-- Model Details -->
      <div
        un-grid="~ cols-1 lg:cols-3"
        un-gap-4
      >
        <div
          v-for="model in [model1, model2, model3]"
          :key="model?.name"
          un-flex="~ col"
          un-gap-2
          un-p-4
          un-border="~ neutral-300 dark:neutral-700"
        >
          <h3 un-text="base font-semibold">
            {{ model?.name }}
          </h3>
          <div
            un-grid="~ cols-2"
            un-gap-2
            un-text="sm"
          >
            <div>
              <div un-text="xs neutral-600 dark:neutral-400">
                Accuracy
              </div>
              <div un-font="mono semibold">
                {{ ((model?.accuracy ?? 0) * 100).toFixed(1) }}%
              </div>
            </div>
            <div>
              <div un-text="xs neutral-600 dark:neutral-400">
                Positive Rate
              </div>
              <div un-font="mono semibold">
                {{ ((model?.positiveRate ?? 0) * 100).toFixed(1) }}%
              </div>
            </div>
          </div>
          <div
            un-text="xs"
            un-mt-2
          >
            <div
              un-text="neutral-600 dark:neutral-400"
              un-mb-1
            >
              Model Formula:
            </div>
            <div
              un-p-2
              un-bg="neutral-100 dark:neutral-800"
              un-text="2xs"
            >
              <div un-mb-1>
                P(ΔSen > 0) = 1 / (1 + e^(-z))
              </div>
              <div
                un-whitespace-pre-wrap
              >
                z = {{ (model?.bias ?? 0).toFixed(3) }}
                <template
                  v-for="feat in model?.features"
                  :key="feat"
                >
                  <br>
                  <span :un-text="(model?.coefficients[feat] ?? 0) >= 0 ? 'green-600 dark:green-400' : 'red-600 dark:red-400'">
                    {{ (model?.coefficients[feat] ?? 0) >= 0 ? ' + ' : ' - ' }}{{ Math.abs(model?.coefficients[feat] ?? 0).toFixed(3) }}×{{ featureLabels[feat] || feat }}
                  </span>
                </template>
              </div>
            </div>
          </div>
          <div
            un-text="xs"
            un-mt-2
          >
            <div
              un-text="neutral-600 dark:neutral-400"
              un-mb-1
            >
              Top Coefficients:
            </div>
            <QLabelValuePair
              v-for="[feat, coef] in getTopCoefficients(model, 5)"
              :key="feat"
              label-id="feat"
              :label-text="featureLabels[feat] || feat"
              un-shrink-0
              un-text="sm"
            >
              <template #value>
                <span
                  un-font="mono"
                  :un-text="coef > 0 ? 'green-600 dark:green-400' : 'red-600 dark:red-400'"
                >
                  {{ coef.toFixed(3) }}
                </span>
              </template>
            </QLabelValuePair>
            <!-- <div -->
            <!--   v-for="[feat, coef] in getTopCoefficients(model, 5)" -->
            <!--   :key="feat" -->
            <!--   un-flex="~ row justify-between" -->
            <!--   un-py-0.5 -->
            <!-- > -->
            <!--   <span>{{ featureLabels[feat] || feat }}</span> -->
            <!--   <span -->
            <!--     un-font="mono" -->
            <!--     :un-text="coef > 0 ? 'green-600 dark:green-400' : 'red-600 dark:red-400'" -->
            <!--   > -->
            <!--     {{ coef.toFixed(3) }} -->
            <!--   </span> -->
            <!-- </div> -->
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
