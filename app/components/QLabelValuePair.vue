<script setup lang="ts">
const props = defineProps<{
  labelText: string
  labelId: string
}>()
</script>

<template>
  <div class="param-input">
    <label
      un-text-base
      :for="labelId"
      v-bind="$attrs"
    >
      {{ props.labelText }}
    </label>
    <QSeperator type="dashed" />
    <slot name="value" />
  </div>
</template>
