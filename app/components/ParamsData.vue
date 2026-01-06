<script setup lang="ts">
import type { TimeSeries } from '~/types/mutation'

const props = defineProps<{
  tCandidates?: number[]
}>()

const emit = defineEmits<{
  (e: 'update:dataParams', dataParams: {
    agg: string
    clipIndexRange?: [number, number]
  }): void
}>()

const clipStartSelected = ref<number | undefined>(undefined)
const clipEndSelected = ref<number | undefined>(undefined)

const tMin = computed(() => {
  if (!props.tCandidates || props.tCandidates.length === 0)
    return undefined
  return Math.min(...props.tCandidates)
})

const tMax = computed(() => {
  if (!props.tCandidates || props.tCandidates.length === 0)
    return undefined
  return Math.max(...props.tCandidates)
})

const aggregateMethodSelected = ref<string>('avg')
const aggregateMethodCandidates = ['avg', 'sum', 'min', 'max', 'range', 'var', 'DJF', 'MAM', 'JJA', 'SON']

watch(
  [
    aggregateMethodSelected,
    clipStartSelected,
    clipEndSelected,
  ],
  () => {
    const dataParams: {
      agg: string
      clipRange?: [number, number]
    } = {
      agg: aggregateMethodSelected.value,
    }
    if (
      clipStartSelected.value !== undefined
      && clipEndSelected.value !== undefined
      && clipStartSelected.value >= 0
      && clipEndSelected.value >= 0
      && clipStartSelected.value < clipEndSelected.value
    ) {
      dataParams.clipRange = [
        clipStartSelected.value,
        clipEndSelected.value,
      ]
    }
    emit('update:dataParams', dataParams)
  },
  { immediate: true },
)
</script>

<template>
  <div
    un-flex="~ col"
    un-gap-1
  >
    <QLabelValuePair
      label-id="aggregate-method-select"
      label-text="Aggregate Method"
    >
      <template #value>
        <QSelect
          v-model="aggregateMethodSelected"
          :items="aggregateMethodCandidates"
        />
      </template>
    </QLabelValuePair>
    <QLabelValuePair
      label-id="clip-input"
      label-text="Clip"
    >
      <template #value>
        <QSlider
          :key="tCandidates?.length"
          v-model:start="clipStartSelected"
          v-model:end="clipEndSelected"
          :range="true"
          :min="tMin"
          :max="tMax"
          :step="1"
          :show-value="true"
        />
      </template>
    </QLabelValuePair>
  </div>
</template>
