<script setup lang="ts">
const props = defineProps<{
  poiCandidates?: string[]
}>()
const poi: Ref<string | undefined> = defineModel('poi')
</script>

<template>
  <div
    un-flex="~ col"
    un-gap-1
  >
    <QLabelValuePair
      label-id="poi-select"
      label-text="POI"
    >
      <template #value>
        <QSelect
          v-model="poi"
          :items="props.poiCandidates ?? []"
        />
      </template>
    </QLabelValuePair>
  </div>
</template>
