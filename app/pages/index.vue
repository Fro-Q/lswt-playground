<script setup lang="ts">
const { data: home } = await useAsyncData(
  () => queryCollection('autopsia').path('/000_autopsia').first(),
)

useSeoMeta({
  title: home.value?.title,
  description: home.value?.description,
})
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
      <!-- Lake Surface Water Temperature Playground -->
      Homepage
    </div>
    <div
      un-text="base neutral-500"
      un-mb-4
    >
      <!-- This is a playground for experimenting with lake surface water temperature (LSWT) data and related visualizations. Explore the different sections below to see various analyses and visual representations of LSWT data. -->
      Intro
    </div>
    <div
      un-flex="~ row"
      un-gap-2
      un-items-center-safe
    >
      <un-i-ph-fingerprint-duotone un-text="2xl amber-500" />
      <LinkUnderline
        href="/"
        text="A Link"
        :tooltip="true"
        tooltip-text="Some tooltip text"
        un-before="bg-amber-500 h-px"
        un-text="2xl neutral-600 dark:neutral-400 hover:neutral-900 dark:hover:neutral-100"
      />
    </div>
    <h1
      un-text="4xl neutral-800 dark:neutral-200"
      un-mt-10
      un-mb-4
    >
      Here is some content
    </h1>
    <ContentRenderer
      v-if="home"
      :value="home"
    /><div v-else>
      Home not found
    </div>
  </div>
</template>
