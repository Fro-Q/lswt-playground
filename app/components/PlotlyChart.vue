<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

type PlotlyModule = typeof import('plotly.js-dist-min')
type PlotlyHTMLElement = import('plotly.js-dist-min').PlotlyHTMLElement

const props = defineProps<{
  data: Plotly.Data[]
  layout?: Partial<Plotly.Layout>
  config?: Partial<Plotly.Config>
}>()

const emit = defineEmits<{ (e: 'plotlyClick', payload: any): void, (e: 'plotlyHover', payload: any): void, (e: 'plotlyUnhover', payload: any): void }>()

const el = ref<HTMLDivElement | null>(null)
let Plotly: PlotlyModule | null = null
let plotHandle: PlotlyHTMLElement | null = null

// const resolvedHeight = computed(() => {
//   if (props.height === undefined)
//     return '30vh'
//   if (typeof props.height === 'number')
//     return `${props.height}px`
//   return props.height
// })

async function ensurePlotly() {
  if (!Plotly)
    Plotly = (await import('plotly.js-dist-min')).default as any
}

const defaultData = computed<Plotly.Data[]>(() => {
  const dataObj: Plotly.Data[] = [
    {
      type: 'scatter',
      mode: 'markers',
      marker: {
        line: {
          width: 2,
          color: usePlotlyColor('text'),
        },
      },
    },
  ]
  return dataObj
})

const defaultLayout = computed(() => {
  const layout: Partial<Plotly.Layout> = {
    paper_bgcolor: usePlotlyColor('background'),
    plot_bgcolor: usePlotlyColor('background'),
    showlegend: false,
    margin: { l: 50, r: 50, t: 50, b: 50 },
    title: {
      font: {
        family: 'YshiPen-ShutiTC',
        color: usePlotlyColor('text'),
        size: 20,
      },
      x: 0.5,
      xanchor: 'center',
      yanchor: 'top',
    },
    hoverlabel: {
      bgcolor: usePlotlyColor('floatBg'),
      bordercolor: usePlotlyColor('floatBorder'),
      font: {
        color: usePlotlyColor('text'),
      },
    },
    xaxis: {
      title: {
        font: {
          family: 'YshiPen-ShutiTC',
          color: usePlotlyColor('text'),
        },
      },
      spikecolor: usePlotlyColor('line'),
      tickfont: {
        color: usePlotlyColor('label'),
      },
      zerolinecolor: usePlotlyColor('axis'),
      gridcolor: usePlotlyColor('grid'),
    },
    yaxis: {
      title: {
        font: {
          family: 'YshiPen-ShutiTC',
          color: usePlotlyColor('text'),
        },
      },
      tickfont: {
        color: usePlotlyColor('label'),
      },
      zerolinecolor: usePlotlyColor('axis'),
      gridcolor: usePlotlyColor('grid'),
      side: 'left',
    },
    yaxis2: {
      title: {
        font: {
          family: 'YshiPen-ShutiTC',
          color: usePlotlyColor('text'),
        },
      },
      tickfont: {
        color: usePlotlyColor('label'),
      },
      zerolinecolor: usePlotlyColor('axis'),
      gridcolor: usePlotlyColor('grid'),
    },
  }

  return layout
})

const defaultConfig = {
  displayModeBar: false,
  responsive: true,
}

// const data = computed(() => Object.assign([], defaultData.value, props.data || {}))
const data = computed(() => deepMerge(props.data || {}, defaultData.value))
// const layout = computed(() => Object.assign({}, defaultLayout.value, props.layout || {}))
const layout = computed(() => deepMerge(props.layout || {}, defaultLayout.value))
// const config = computed(() => Object.assign({}, defaultConfig, props.config || {}))
const config = computed(() => deepMerge(props.config || {}, defaultConfig))

function attachEvents(target: PlotlyHTMLElement | null) {
  if (!target || typeof target.on !== 'function')
    return
  target.removeAllListeners?.('plotly_click')
  target.removeAllListeners?.('plotly_hover')
  target.removeAllListeners?.('plotly_unhover')
  target.on('plotly_click', event => emit('plotlyClick', event))
  target.on('plotly_hover', event => emit('plotlyHover', event))
  target.on('plotly_unhover', event => emit('plotlyUnhover', event))
}

async function render() {
  if (!el.value)
    return
  await ensurePlotly()
  if (!Plotly)
    return
  // if (plotHandle) {
    // await Plotly.react(el.value, data.value, layout.value ?? {}, config.value)
  // }
  // else {
  plotHandle = await Plotly.newPlot(el.value, data.value, layout.value ?? {}, config.value)
  attachEvents(plotHandle)
  // }
}

onMounted(async () => {
  await nextTick()
  await render()
  // window.addEventListener('resize', handleResize)
  useEventListener(window, 'resize', handleResize)
})

function handleResize() {
  if (!Plotly || !el.value)
    return
  Plotly.Plots.resize(el.value)
}

onBeforeUnmount(() => {
  if (Plotly && el.value)
    Plotly.purge(el.value)
  plotHandle = null
})

watch(() => [props.data, props.layout, props.config], () => {
  render()
}, { deep: true })
</script>

<template>
  <div
    ref="el"
    un-w-full
  />
</template>
