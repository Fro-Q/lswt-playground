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

const mutationParams = ['year', 'preAvg', 'deltaAvg', 'preSen', 'deltaSen', 'preVar', 'deltaVar'] as const
const factorParams = ['pw', 'chlorophyll', 'ndvi', 'depth', 'pd', 'pwlg', 'depthlg', 'pdlg', 'depthlg10'] as const

type MutationParam = typeof mutationParams[number]
type FactorParam = typeof factorParams[number]

const paramLabels: Record<MutationParam, string> = {
  year: 'Year',
  preAvg: 'Pre Avg',
  deltaAvg: 'Δ Avg',
  preSen: 'Pre Sen',
  deltaSen: 'Δ Sen',
  preVar: 'Pre Var',
  deltaVar: 'Δ Var',
}

const factorLabels: Record<FactorParam, string> = {
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

interface MatrixCell {
  mutationParam: MutationParam
  factorParam: FactorParam
  data: Array<{ x: number, y: number, year: number, label: string }>
}

const matrixData = computed<MatrixCell[][]>(() => {
  if (!props.mutations?.length || !props.lakeFactors?.size)
    return []

  const filteredMutations = props.mutations.filter(m => withinTimeFilter(m.year, props.timeFilter))
  if (!filteredMutations.length)
    return []

  const matrix: MatrixCell[][] = []

  for (const mutParam of mutationParams) {
    const row: MatrixCell[] = []
    for (const factorParam of factorParams) {
      const data: Array<{ x: number, y: number, year: number, label: string }> = []

      for (const mutation of filteredMutations) {
        const factors = props.lakeFactors?.get(mutation.lakeId)
        if (!factors)
          continue

        let yValue: number | undefined
        if (mutParam === 'deltaAvg') {
          yValue = mutation.postAvg - mutation.preAvg
        }
        else if (mutParam === 'deltaSen') {
          yValue = mutation.postSen - mutation.preSen
        }
        else if (mutParam === 'deltaVar') {
          yValue = mutation.postVar - mutation.preVar
        }
        else {
          yValue = mutation[mutParam]
        }

        const xValue = factors[factorParam]

        if (typeof yValue === 'number' && typeof xValue === 'number' && Number.isFinite(yValue) && Number.isFinite(xValue)) {
          data.push({
            x: xValue,
            y: yValue,
            year: mutation.year,
            label: mutation.lakeId,
          })
        }
      }

      row.push({
        mutationParam: mutParam,
        factorParam,
        data,
      })
    }
    matrix.push(row)
  }

  return matrix
})

function createScatterChart(cell: MatrixCell) {
  if (!cell.data.length)
    return null

  const data = [{
    type: 'scatter',
    mode: 'markers',
    x: cell.data.map(d => d.x),
    y: cell.data.map(d => d.y),
    text: cell.data.map(d => d.label),
    marker: {
      size: 4,
      color: cell.data.map(d => d.year),
      colorscale: 'YlOrRd',
      reversescale: true,
      opacity: 0.8,
      line: { color: usePlotlyColor('markerBorder'), width: 0.5 },
    },
    hovertemplate: '%{text} (Year: %{marker.color})<br>%{xaxis.title.text}: %{x:.2f}<br>%{yaxis.title.text}: %{y:.2f}<extra></extra>',
    showlegend: false,
  }]

  const layout = {
    xaxis: {
      title: { text: factorLabels[cell.factorParam], font: { size: 10 } },
      showticklabels: false,
      showgrid: true,
      gridcolor: usePlotlyColor('grid'),
    },
    yaxis: {
      title: { text: paramLabels[cell.mutationParam], font: { size: 10 } },
      showticklabels: false,
      showgrid: true,
      gridcolor: usePlotlyColor('grid'),
    },
    margin: { t: 25, r: 10, b: 25, l: 40 },
    hovermode: 'closest',
  }

  return { data, layout }
}

const hasData = computed(() => matrixData.value.some(row => row.some(cell => cell.data.length > 0)))

const cellCount = computed(() => factorParams.length)
const cellWidthPercent = computed(() => `${100 / cellCount.value}%`)
</script>

<template>
  <section
    un-flex="~ col"
    un-gap-3
    un-w-full
  >
    <div
      v-if="!hasData"
      un-text="neutral-500 dark:neutral-400 center"
      un-p-8
    >
      No data available for the matrix scatter plot.
    </div>
    <div
      v-else
      un-flex="~ col"
      un-gap-2
      un-w-full
    >
      <div
        v-for="(row, rowIdx) in matrixData"
        :key="rowIdx"
        un-flex="~ row"
        un-gap-2
        un-w-full
      >
        <div
          v-for="(cell, colIdx) in row"
          :key="colIdx"
          un-border="~ neutral-300 dark:neutral-700"
          :style="{ width: cellWidthPercent, aspectRatio: '1 / 1' }"
        >
          <PlotlyChart
            v-if="createScatterChart(cell)"
            :data="createScatterChart(cell)!.data"
            :layout="createScatterChart(cell)!.layout"
            un-h-full
          />
          <div
            v-else
            un-flex="~ col items-center justify-center"
            un-h-full
            un-text="xs neutral-400 dark:neutral-600"
          >
            No data
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
