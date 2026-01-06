<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{
  modelValue?: string
  items: string[]
  placeholder?: string
}>()

const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const buttonRef = ref<HTMLElement | null>(null)
const popupStyle = ref<Record<string, string>>({})

function calculatePosition() {
  const btn = buttonRef.value
  if (!btn)
    return
  const rect = btn.getBoundingClientRect()
  const popupWidth = Math.max(rect.width, 200)
  const estimatedHeight = 240

  // default place below the button
  let top = rect.bottom + window.scrollY
  let left = rect.left + window.scrollX

  const spaceBelow = window.innerHeight - rect.bottom
  const spaceAbove = rect.top
  if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
    // place above
    top = rect.top + window.scrollY - estimatedHeight
  }

  // clamp horizontally
  if (left + popupWidth > window.innerWidth) {
    left = Math.max(8, window.innerWidth - popupWidth - 8)
  }
  if (left < 8)
    left = 8

  popupStyle.value = {
    position: 'absolute',
    top: `${top}px`,
    left: `${left}px`,
    width: `${popupWidth}px`,
    zIndex: '9999',
  }
}

async function openSelect() {
  open.value = !open.value
  if (open.value) {
    await nextTick()
    // initial calculate
    calculatePosition()
    // ensure layout/fonts settle: recalc on next animation frames and a short timeout
    requestAnimationFrame(() => calculatePosition())
    requestAnimationFrame(() => {
      setTimeout(() => calculatePosition(), 50)
    })
  }
}

function selectItem(item: string) {
  emit('update:modelValue', item)
  open.value = false
}

function handleClickOutside(e: MouseEvent) {
  const target = e.target as Node
  const btn = buttonRef.value
  const popup = document.getElementById('qselect-popup')
  if (!btn)
    return
  if (btn.contains(target))
    return
  if (popup && popup.contains(target))
    return
  open.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape')
    open.value = false
}

useEventListener(window, 'resize', () => {
  if (open.value)
    calculatePosition()
})
useEventListener(window, 'scroll', () => {
  if (open.value)
    calculatePosition()
}, { passive: true })

onMounted(() => {
  window.addEventListener('click', handleClickOutside)
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  window.removeEventListener('click', handleClickOutside)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div
    un-flex="~ row"
    un-items-center
  >
    <button
      ref="buttonRef"
      un-h-fit
      un-px-4
      un-text="neutral-800 dark:neutral-200"
      un-underline="~ px neutral-400 dark:neutral-600 hover:neutral-700 dark:hover:neutral-300"
      un-flex="~ row"
      un-items-center
      un-text-nowrap
      un-justify-between
      un-cursor-pointer
      un-gap-2
      @click="openSelect"
    >
      <span>{{ props.modelValue ?? props.placeholder ?? 'Select' }}</span>
    </button>
    <un-i-ph-caret-down-duotone
      un-text="neutral-500 dark:neutral-400"
      un-text-lg
      :class="{ 'rotate-90': !open }"
      un-transition-transform
    />
  </div>

  <Teleport to="body">
    <div
      v-if="open"
      id="qselect-popup"
      :style="popupStyle"
      un-bg="neutral-100 dark:neutral-900"
      un-shadow-lg
      un-border="~ neutral-700 dark:neutral-300"
      un-overflow-auto
      un-max-h-320px
    >
      <ul>
        <li
          v-for="item in props.items"
          :key="item"
          un-p-1
          un-cursor-pointer
          un-text-sm
          un-break-normal
          un-transition-colors
          :un-bg="props.modelValue === item ? 'neutral-700 dark:neutral-300' : 'hover:neutral-300 dark:hover:neutral-700'"
          :un-text="props.modelValue === item ? 'neutral-100 dark:neutral-900' : 'neutral-800 dark:neutral-200'"
          @click="selectItem(item)"
          @mouseenter.prevent
        >
          {{ item }}
        </li>
      </ul>
    </div>
  </Teleport>
</template>
