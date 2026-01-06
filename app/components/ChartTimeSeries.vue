<script setup lang="ts">
import type { MutationPoint, TimeSeries } from '~/types/mutation'

const props = defineProps<{
  timeSeries?: Record<string, TimeSeries | undefined>
  mutations?: MutationPoint[]
}>()

const data: ComputedRef<Plotly.Data[]> = computed(() => {
  if (!props.timeSeries || Object.keys(props.timeSeries).length === 0) {
    return [{ x: [], y: [] }]
  }

  const dataObj: Plotly.Data[] = []

  const raw = props.timeSeries.raw
  const processed = props.timeSeries.processed

  if (raw) {
    dataObj.push({
      x: raw.points.map(p => p.t),
      y: raw.points.map(p => p.v),
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Raw Series',
      marker: {
        color: usePlotlyColor('marker'),
        symbol: 'circle-open',
      },
      line: {
        color: usePlotlyColor('axis'),
        shape: 'spline',
        width: 3,
      },
      hovertemplate: '%{y:.3f}<extra></extra>',
      yaxis: 'y1',
    })
  }

  if (processed) {
    dataObj.push({
      x: processed.points.map(p => p.t),
      y: processed.points.map(p => p.v),
      type: 'scatter',
      mode: 'lines',
      name: 'Processed Series',
      marker: {
        color: usePlotlyColor('marker'),
        symbol: 'diamond-open',
      },
      line: {
        color: usePlotlyColor('line'),
        shape: 'spline',
        width: 1,
      },
      hovertemplate: '%{y:.3f}<extra></extra>',
      yaxis: 'y2',
    })
  }

  return dataObj
})

const layout = computed(() => {
  const layoutObj: Record<string, any> = {
    margin: {
      t: 50,
      r: 50,
      b: 50,
      l: 50,
    },
    hovermode: 'x unified',
    hoverlabel: {
      bgcolor: usePlotlyColor('floatBg'),
      bordercolor: usePlotlyColor('floatBorder'),
      font: {
        color: usePlotlyColor('text'),
      },
    },
    title: {
      font: {
        family: 'YshiPen-ShutiTC',
        color: usePlotlyColor('text'),
      },
      text: `${props.timeSeries?.[0]?.label || ''} Time Series`,
    },
    xaxis: {
      spikecolor: usePlotlyColor('line'),
      tickfont: {
        color: usePlotlyColor('label'),
      },
      zerolinecolor: usePlotlyColor('axis'),
      gridcolor: usePlotlyColor('grid'),
      title: 'Time',
    },
    yaxis: {
      title: 'Raw Value',
      tickfont: {
        color: usePlotlyColor('label'),
      },
      zerolinecolor: usePlotlyColor('axis'),
      gridcolor: usePlotlyColor('grid'),
      side: 'left',
    },
    yaxis2: {
      title: 'Processed Value',
      tickfont: {
        color: usePlotlyColor('label'),
      },
      zerolinecolor: usePlotlyColor('axis'),
      // gridcolor: usePlotlyColor('grid'),
      overlaying: 'y',
      side: 'right',
    },
    legend: {
      xanchor: 'right',
      yanchor: 'top',
      bgcolor: usePlotlyColor('floatBg'),
      bordercolor: usePlotlyColor('floatBorder'),
      borderwidth: 1,
      font: {
        color: usePlotlyColor('text'),
      },
    },
  }

  props.mutations?.forEach((mutation) => {
    layoutObj.shapes = layoutObj.shapes || []
    layoutObj.annotations = layoutObj.annotations || []

    layoutObj.shapes.push({
      type: 'line',
      x0: new Date(mutation.year, 0, 1),
      x1: new Date(mutation.year, 0, 1),
      y0: 0,
      y1: 1,
      xref: 'x',
      yref: 'paper',
      line: {
        color: 'orange',
        width: 2,
        dash: 'dot',
      },
    })
  })

  return layoutObj
})
</script>

<template>
  <div
    un-w-full
    un-h-full
    un-border="~ neutral-300 dark:neutral-700"
  >
    <PlotlyChart
      :data="data"
      :layout="layout"
    />
  </div>
</template>
