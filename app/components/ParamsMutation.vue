<script setup lang="ts">
const emit = defineEmits<{
  (e: 'update:mutationParams', mutationParams: {
    mutationMethod: string
    minSegLen: number
  }): void
}>()

const mutationMethodSelected = ref<string>('pettitt')
const mutationMethodCandidates = ['pettitt', 'seq-t-avg', 'seq-t-ols', 'seq-t-sen']

const minSegLenSelected = ref<number>(5)

watchEffect(
  () => {
    const paramsMutation: {
      mutationMethod: string
      minSegLen: number
    } = {
      mutationMethod: mutationMethodSelected.value,
      minSegLen: minSegLenSelected.value,
    }
    emit('update:mutationParams', paramsMutation)
  },
)
</script>

<template>
  <div
    un-flex="~ col"
    un-gap-1
  >
    <QLabelValuePair
      label-id="mutation-method-select"
      label-text="Mutation Method"
    >
      <template #value>
        <QSelect
          v-model="mutationMethodSelected"
          :items="mutationMethodCandidates"
        />
      </template>
    </QLabelValuePair>
    <QLabelValuePair
      label-id="min-seg-len-slider"
      label-text="Minimum Segment Length"
    >
      <template #value>
        <QSlider
          v-model="minSegLenSelected"
          :min="1"
          :max="20"
          :step="1"
          :show-value="true"
        />
      </template>
    </QLabelValuePair>
  </div>
</template>
