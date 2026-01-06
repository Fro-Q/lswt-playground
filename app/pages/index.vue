<script setup lang="ts">
definePageMeta({
  layout: 'default',
})
</script>

<template>
  <div
    un-py-1
    un-max-w-800px
    un-mx-auto
  >
    <div
      un-text-3xl
      un-my-6
    >
      Lake Surface Water Temperature Playground
    </div>
    <div
      un-text="base neutral-500"
      un-mb-4
    >
      This is a playground for experimenting with
      lake surface water temperature (LSWT) data and related visualizations.
      Explore the different sections below
      to see various analyses and visual representations of LSWT data.
    </div>
    <div
      un-flex="~ row"
      un-gap-2
      un-items-center-safe
    >
      <un-i-ph-chart-line-up-duotone un-text="2xl amber-500" />
      <LinkUnderline
        href="/mutation"
        text="Mutation"
        :tooltip="true"
        tooltip-text="
        Explore mutation detection methods for lake surface water temperature data.
        "
        un-before="bg-amber-500 h-px"
        un-text="2xl neutral-600 dark:neutral-400 hover:neutral-900 dark:hover:neutral-100"
      />
    </div>
  </div>
</template>
