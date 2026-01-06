<script setup lang="ts">
import type { MutationPoint, TimeSeries } from '~/types/mutation'
import type {
  ParamsData,
  ParamsMutation,
  ParamsPreprocess,
} from '~/types/param'
import ChartsMutationScatter from '~/components/ChartsMutationScatter.vue'
import QSeperator from '~/components/QSeperator.vue'

const rawSeries = ref<TimeSeries[] | undefined>(undefined)
const processedSeries = ref<TimeSeries[] | undefined>(undefined)
const mutationPoints = ref<MutationPoint[] | undefined>(undefined)

const poiSelected = ref<string | undefined>(undefined)

const tCandidates = ref<number[] | undefined>(undefined)

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

const lakeFactorsMap = ref<Map<string, LakeFactors>>(new Map())

function toCamelCase(str: string): string {
  return str.replace(/^\w|[A-Z]|\b\w/g, (letter, index) =>
    index === 0 ? letter.toLowerCase() : letter.toLowerCase()).replace(/\s+/g, '')
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else { inQuotes = !inQuotes }
    }
    else if (ch === ',' && !inQuotes) {
      result.push(current); current = ''
    }
    else {
      current += ch
    }
  }
  result.push(current)
  return result.map(s => s.trim())
}

onMounted(async () => {
  const _rawSeries = await $fetch(`/api/loadTimeSeries`)
    .then(res => res.series as TimeSeries[])
    .catch((e) => {
      console.error('Failed to load time series data:', e)
      return new Array<TimeSeries>()
    })

  if (_rawSeries && _rawSeries.length !== 0) {
    tCandidates.value = _rawSeries[0]?.points.map(
      (p: { t: Date, v: number }) => new Date(p.t).getFullYear(),
    ) || []
  }

  // Load factors CSV
  try {
    const factorsCsv: string = await $fetch('/factors_simplified.csv', { responseType: 'text' })
    const lines = factorsCsv.split(/\r?\n/).filter(l => l.trim())
    if (lines.length >= 2) {
      const headers = parseCsvLine(lines[0]!).map(h => toCamelCase(h))
      for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i]!)
        const entry: any = {}
        headers.forEach((header, idx) => {
          const val = values[idx]
          if (val !== undefined) {
            const num = Number(val)
            entry[header] = Number.isNaN(num) ? val : num
          }
        })
        if (entry.lake) {
          lakeFactorsMap.value.set(entry.lake, entry as LakeFactors)
        }
      }
    }
  }
  catch (e) {
    console.error('Failed to load factors CSV:', e)
  }
})

const poiCandidates = computed<string[] | undefined>(() => {
  if (!rawSeries.value || rawSeries.value.length === 0)
    return undefined
  return rawSeries.value.map((series: TimeSeries) => series.label) || []
})

const paramsData = ref<{
  agg: string
  clipRange?: [number, number]
}>({
  agg: 'avg',
})

const paramsPreprocess = ref<{
  smoothWindow: number
  diffOrder: number
}>({
  smoothWindow: 1,
  diffOrder: 1,
})

const paramsMutation = ref<{
  mutationMethod: string
  minSegLen: number
}>({
  mutationMethod: 'pettitt',
  minSegLen: 5,
})

const colorModeSelected = ref<'mutationYear' | 'deltaAvg' | 'none'>('mutationYear')
const colorModeCandidates: Array<'mutationYear' | 'deltaAvg' | 'none'> = [
  'mutationYear',
  'deltaAvg',
  'none',
]

const timeFilterRange = ref<{
  start: number | undefined
  end: number | undefined
}>({
  start: undefined,
  end: undefined,
})

watchEffect(
  async () => {
    const params = new URLSearchParams({
      agg: paramsData.value.agg,
    })
    if (paramsData.value.clipRange) {
      const clipStartYear = paramsData.value.clipRange[0]
      const clipEndYear = paramsData.value.clipRange[1]
      params.append('clipRange', `${clipStartYear},${clipEndYear}`)
    }
    rawSeries.value = await $fetch(`/api/loadTimeSeries?${params.toString()}`)
      .then(res => res.series as TimeSeries[])
      .catch((e) => {
        console.error('Failed to load time series data:', e)
        return new Array<TimeSeries>()
      })
  },
)

watchEffect(
  async () => {
    if (!rawSeries.value)
      return
    const params = new URLSearchParams({
      smoothWindow: paramsPreprocess.value.smoothWindow.toString(),
      diffOrder: paramsPreprocess.value.diffOrder.toString(),
    })
    processedSeries.value = await $fetch(`/api/preprocessTimeSeries?${params.toString()}`, {
      method: 'POST',
      body: rawSeries.value,
    })
      .then(res => res.processedSeries as TimeSeries[])
      .catch((e) => {
        console.error('Failed to preprocess time series data:', e)
        return new Array<TimeSeries>()
      })
  },
)

// Detect mutations
watchEffect(
  async () => {
    if (!processedSeries.value)
      return
    const params = new URLSearchParams({
      mutationMethod: paramsMutation.value.mutationMethod,
      minSegLen: paramsMutation.value.minSegLen.toString(),
    })
    mutationPoints.value = await $fetch(`/api/detectMutation?${params.toString()}`, {
      method: 'POST',
      body: {
        processedSeries: processedSeries.value,
        rawSeries: rawSeries.value,
      },
    })
      .then(res => res.mutationPoints as MutationPoint[])
      .catch((e) => {
        console.error('Failed to detect mutations, ', e)
        return new Array<MutationPoint>()
      })
  },
)

const mutationThisId = computed<MutationPoint | undefined>(() => {
  if (!mutationPoints.value || mutationPoints.value.length === 0 || !poiSelected.value)
    return undefined
  const mp = mutationPoints.value.find(
    mp => mp.lakeId === poiSelected.value,
  )
  return mp
})
</script>

<template>
  <div
    un-flex="~ row grow"
    un-w-full
    un-max-h-full
  >
    <div
      class="side-view"
      un-w="1/4"
      un-min-w-200px
      un-p-4
      un-flex="~ col"
      un-gap-4
      un-overflow-y-auto
    >
      <QSeperator
        title="Data Loading"
        un-text="teal-500"
      />
      <ParamsData
        :t-candidates="tCandidates"
        @update:data-params="(params: ParamsData) => {
          paramsData = params
        }"
      />
      <QSeperator
        title="Preprocessing"
        un-text="teal-500"
      />
      <ParamsPreprocess
        @update:preprocess-params="(params: ParamsPreprocess) => {
          paramsPreprocess = params
        }"
      />
      <QSeperator
        title="Mutation Detection"
        un-text="teal-500"
      />
      <ParamsMutation
        @update:mutation-params="(params: ParamsMutation) => {
          paramsMutation = params
        }"
      />
      <QSeperator
        title="Points of Interest"
        un-text="teal-500"
      />
      <ParamsPoi
        v-model:poi="poiSelected"
        :poi-candidates
      />
      <ChartTimeSeries
        :time-series="
          {
            raw: rawSeries?.filter(
              ts => ts.id === poiSelected,
            )[0],
            processed:
              processedSeries?.filter(
                ts => ts.id === poiSelected,
              )[0],
          }"
        :mutations="mutationPoints?.filter(
          mp => mp.lakeId === poiSelected,
        )"
      />
      <QSeperator
        title="Mutation This POI"
        un-text="teal-500"
      />
      <QLabelValuePair
        label-id="avg"
        label-text="Avg"
      >
        <template #value>
          <div
            v-if="mutationThisId"
            un-text="nowrap"
            un-font="mono"
          >
            {{ mutationThisId.preAvg.toFixed(2) }}
            <span
              :un-text="mutationThisId.postAvg > mutationThisId.preAvg
                ? mutationThisId.postAvg === mutationThisId.preAvg ? 'neutral-500' : 'red-500'
                : mutationThisId.postAvg < mutationThisId.preAvg ? 'green-500' : 'neutral-500'"
              un-mx-1
            >
              ->
            </span>
            {{ mutationThisId.postAvg.toFixed(2) }}
          </div>
        </template>
      </QLabelValuePair>
      <QLabelValuePair
        label-id="sen"
        label-text="Sen's"
      >
        <template #value>
          <div
            v-if="mutationThisId"
            un-text="nowrap"
            un-font="mono"
          >
            {{ mutationThisId.preSen.toFixed(2) }}
            <span
              :un-text="mutationThisId.postSen > mutationThisId.preSen
                ? mutationThisId.postSen === mutationThisId.preSen ? 'neutral-500' : 'red-500'
                : mutationThisId.postSen < mutationThisId.preSen ? 'green-500' : 'neutral-500'"
              un-mx-1
            >
              ->
            </span>
            {{ mutationThisId.postSen.toFixed(2) }}
          </div>
        </template>
      </QLabelValuePair>
      <QLabelValuePair
        label-id="ols"
        label-text="OLS"
      >
        <template #value>
          <div
            v-if="mutationThisId"
            un-text="nowrap"
            un-font="mono"
          >
            {{ mutationThisId.preOls.toFixed(2) }}
            <span
              :un-text="mutationThisId.postOls > mutationThisId.preOls
                ? mutationThisId.postOls === mutationThisId.preOls ? 'neutral-500' : 'red-500'
                : mutationThisId.postOls < mutationThisId.preOls ? 'green-500' : 'neutral-500'"
              un-mx-1
            >
              ->
            </span>
            {{ mutationThisId.postOls.toFixed(2) }}
          </div>
        </template>
      </QLabelValuePair>
      <QLabelValuePair
        label-id="var"
        label-text="Var"
      >
        <template #value>
          <div
            v-if="mutationThisId"
            un-text="nowrap"
            un-font="mono"
          >
            {{ mutationThisId.preVar.toFixed(2) }}
            <span
              :un-text="mutationThisId.postVar > mutationThisId.preVar
                ? mutationThisId.postVar === mutationThisId.preVar ? 'neutral-500' : 'red-500'
                : mutationThisId.postVar < mutationThisId.preVar ? 'green-500' : 'neutral-500'"
              un-mx-1
            >
              ->
            </span>
            {{ mutationThisId.postVar.toFixed(2) }}
          </div>
        </template>
      </QLabelValuePair>
    </div>
    <!-- </div> -->
    <div
      un-w-px
      un-bg="neutral-700 dark:neutral-300"
      un-mx-2
    />

    <div
      class="main-view"
      un-flex="~ col grow"
      un-p-4
      un-pt-0
      un-gap-4
      un-overflow-y-auto
    >
      <div
        un-sticky
        un-top-0
        un-z-10
        un-bg="neutral-100 dark:neutral-900"
        un-flex="~ col grow"
        un-gap-4
      >
        <QSeperator
          title="Lake Distribution"
          un-text="teal-500"
          un-bg="neutral-100 dark:neutral-900"
        />
        <QLabelValuePair
          label-id="color-mode"
          label-text="Color Mode"
          un-shrink-0
        >
          <template #value>
            <QSelect
              v-model="colorModeSelected"
              :items="colorModeCandidates"
            />
          </template>
        </QLabelValuePair>
        <QLabelValuePair
          label-id="time-filter"
          label-text="Time Filter"
          un-shrink-0
        >
          <template #value>
            <QSlider
              :key="tCandidates?.length"
              v-model:start="timeFilterRange.start"
              v-model:end="timeFilterRange.end"
              :min="tCandidates ? Math.min(...tCandidates) : 0"
              :max="tCandidates ? Math.max(...tCandidates) : 0"
              :step="1"
              :range="true"
              :show-value="true"
            />
          </template>
        </QLabelValuePair>
        <QSeperator />
      </div>
      <MapGeoLake
        v-model:poi="poiSelected"
        :lakes="rawSeries?.map(
          ts => ({
            id: ts.id,
            label: ts.label,
            lat: ts.lat,
            lon: ts.lon,
          }),
        ) || []"
        :mutations="mutationPoints"
        :color-mode="colorModeSelected"
        :time-filter="timeFilterRange"
      />
      <QSeperator
        title="Mutation Scatterplots"
        un-text="teal-500"
      />
      <ChartsMutationScatter
        :mutations="mutationPoints"
        :time-filter="timeFilterRange"
      />
      <QSeperator
        title="Mutation Factor Matrix"
        un-text="teal-500"
      />
      <ChartsFactorMatrix
        :mutations="mutationPoints"
        :lake-factors="lakeFactorsMap"
        :time-filter="timeFilterRange"
      />
      <QSeperator
        title="Logistic Regression For ΔSen > 0"
        un-text="teal-500"
      />
      <ChartsLogisticRegression
        :mutations="mutationPoints"
        :lake-factors="lakeFactorsMap"
        :time-filter="timeFilterRange"
      />
    </div>
  </div>
</template>

<style>
.param-input {
  --uno: 'flex:(~ row) gap-4 justify-between items-center';
}
</style>
