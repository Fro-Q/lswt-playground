<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

defineOptions({
  inheritAttrs: true,
})

const props = defineProps<{
  modelValue?: number
  start?: number
  end?: number
  min?: number
  max?: number
  step?: number
  showValue?: boolean
  ariaLabel?: string
  range?: boolean
}>()
const emit = defineEmits(['update:modelValue', 'update:start', 'update:end'])
type RangeHandle = 'a' | 'b'
type RangeRole = 'start' | 'end'
type ThumbHandle = 'single' | RangeHandle

const min = props.min ?? 0
const max = props.max ?? 100
const step = props.step ?? 1

const trackRef = ref<HTMLElement | null>(null)
const activeHandle = ref<ThumbHandle | null>(null)

const singleValue = ref<number>(props.modelValue ?? min)
const handleAValue = ref<number>(props.start ?? min)
const handleBValue = ref<number>(props.end ?? max)
const handleARole = ref<RangeRole>('start')
const handleBRole = ref<RangeRole>('end')

const isRange = computed(() => props.range ?? (props.start !== undefined || props.end !== undefined))

function clamp(v: number) { return Math.min(max, Math.max(min, v)) }
function roundStep(v: number) {
  const stepped = Math.round((v - min) / step) * step + min
  return Number(stepped.toFixed(6))
}

function valueToPercent(v: number) {
  return ((v - min) / (max - min)) * 100
}

function percentToValue(p: number) {
  const v = min + (p / 100) * (max - min)
  return roundStep(v)
}

function getValueByHandle(handle: RangeHandle) {
  return handle === 'a' ? handleAValue.value : handleBValue.value
}

function setValueByHandle(handle: RangeHandle, v: number) {
  if (handle === 'a')
    handleAValue.value = v
  else
    handleBValue.value = v
}

function roleToHandle(role: RangeRole): RangeHandle {
  return handleARole.value === role ? 'a' : 'b'
}

function getValueByRole(role: RangeRole) {
  return getValueByHandle(roleToHandle(role))
}

function setValueByRole(role: RangeRole, v?: number) {
  const target = roleToHandle(role)
  setValueByHandle(target, clamp(typeof v === 'number' ? v : role === 'start' ? min : max))
}

function swapHandleRoles() {
  const prev = handleARole.value
  handleARole.value = handleBRole.value
  handleBRole.value = prev
}

function enforceRoleOrder() {
  const startVal = getValueByRole('start')
  const endVal = getValueByRole('end')
  if (startVal <= endVal)
    return
  swapHandleRoles()
}

function emitRange() {
  emit('update:start', getValueByRole('start'))
  emit('update:end', getValueByRole('end'))
}

onMounted(() => {
  if (!isRange.value && typeof props.modelValue === 'number')
    singleValue.value = clamp(props.modelValue)
  if (isRange.value) {
    setValueByRole('start', props.start)
    setValueByRole('end', props.end)
    enforceRoleOrder()
  }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
})

watch(() => props.modelValue, (val) => {
  if (isRange.value)
    return
  if (typeof val === 'number')
    singleValue.value = clamp(val)
})

watch(() => props.start, (val) => {
  if (!isRange.value)
    return
  if (typeof val === 'number') {
    setValueByRole('start', val)
    enforceRoleOrder()
  }
})

watch(() => props.end, (val) => {
  if (!isRange.value)
    return
  if (typeof val === 'number') {
    setValueByRole('end', val)
    enforceRoleOrder()
  }
})

function updateSingle(v: number) {
  const next = clamp(roundStep(v))
  singleValue.value = next
  emit('update:modelValue', singleValue.value)
}

function updateRange(handle: RangeHandle, v: number) {
  const next = clamp(roundStep(v))
  setValueByHandle(handle, next)
  enforceRoleOrder()
  emitRange()
}

function pickNearestHandle(v: number): RangeHandle {
  const distA = Math.abs(v - handleAValue.value)
  const distB = Math.abs(v - handleBValue.value)
  return distA <= distB ? 'a' : 'b'
}

function setFromClientX(clientX: number, handle: ThumbHandle | 'auto' = 'single') {
  const track = trackRef.value
  if (!track)
    return
  const rect = track.getBoundingClientRect()
  const p = ((clientX - rect.left) / rect.width) * 100
  const v = percentToValue(Math.min(100, Math.max(0, p)))

  if (isRange.value) {
    let target: RangeHandle
    if (handle === 'auto' || handle === 'single')
      target = pickNearestHandle(v)
    else
      target = handle
    updateRange(target, v)
    return
  }

  updateSingle(v)
}

function onThumbPointerDown(handle: ThumbHandle, e: PointerEvent) {
  const target = e.target as HTMLElement
  target.setPointerCapture?.(e.pointerId)
  activeHandle.value = handle
  setFromClientX(e.clientX, handle)
}

function onPointerMove(e: PointerEvent) {
  if (!activeHandle.value)
    return
  setFromClientX(e.clientX, activeHandle.value)
}

function onPointerUp(e: PointerEvent) {
  if (!activeHandle.value)
    return
  try { (e.target as HTMLElement).releasePointerCapture?.(e.pointerId) }
  catch {}
  activeHandle.value = null
}

function onTrackClick(e: MouseEvent) {
  setFromClientX(e.clientX, isRange.value ? 'auto' : 'single')
}

function getHandleValue(handle: RangeHandle) {
  return handle === 'a' ? handleAValue.value : handleBValue.value
}

function onThumbKeydown(handle: ThumbHandle, e: KeyboardEvent) {
  let handled = false
  if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
    if (isRange.value && handle !== 'single')
      updateRange(handle, getHandleValue(handle) - step)
    else
      updateSingle(singleValue.value - step)
    handled = true
  }
  else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
    if (isRange.value && handle !== 'single')
      updateRange(handle, getHandleValue(handle) + step)
    else
      updateSingle(singleValue.value + step)
    handled = true
  }
  else if (e.key === 'Home') {
    if (isRange.value && handle !== 'single') {
      updateRange(handle, min)
      handled = true
    }
    else {
      updateSingle(min)
      handled = true
    }
  }
  else if (e.key === 'End') {
    if (isRange.value && handle !== 'single') {
      updateRange(handle, max)
      handled = true
    }
    else {
      updateSingle(max)
      handled = true
    }
  }
  if (handled)
    e.preventDefault()
}

const percentSingle = computed(() => valueToPercent(singleValue.value))
const percentHandleA = computed(() => valueToPercent(handleAValue.value))
const percentHandleB = computed(() => valueToPercent(handleBValue.value))
const rangePercentStart = computed(() => valueToPercent(Math.min(handleAValue.value, handleBValue.value)))
const rangePercentEnd = computed(() => valueToPercent(Math.max(handleAValue.value, handleBValue.value)))

const trackFillStyle = computed(() => {
  if (isRange.value) {
    const start = rangePercentStart.value
    const end = rangePercentEnd.value
    return {
      left: `${start}%`,
      width: `${Math.max(end - start, 0)}%`,
    }
  }
  return { width: `${percentSingle.value}%`, left: '0%' }
})

const displayValue = computed(() => {
  if (isRange.value)
    return `${getValueByRole('start')} - ${getValueByRole('end')}`
  return singleValue.value
})
</script>

<template>
  <div
    v-if="props.showValue !== false"
    un-text-sm
    un-shrink-0
  >
    {{ displayValue }}
  </div>
  <div
    ref="trackRef"
    un-relative
    un-w-20
    un-h-2px
    un-shrink-0
    un-mr-2
    un-bg="neutral-300 dark:neutral-700"
    un-cursor="pointer active:grabbing"
    :aria-valuemin="isRange ? undefined : min"
    :aria-valuemax="isRange ? undefined : max"
    :aria-valuenow="isRange ? undefined : singleValue"
    :aria-label="props.ariaLabel ?? 'Slider'"
    :role="isRange ? 'group' : 'slider'"
    @click.stop="onTrackClick"
  >
    <div
      un-absolute
      un-top-0
      un-bottom-0
      un-left-0
      un-bg="neutral-700 dark:neutral-300"
      :style="trackFillStyle"
    />
    <template v-if="isRange">
      <div
        un-absolute
        un-top="50%"
        un-translate-x="-1/2"
        un-translate-y="-1/2"
        un-w-4
        un-h-4
        un-bg="neutral-50 dark:neutral-950 hover:neutral-300 dark:hover:neutral-700"
        un-shadow-md
        un-transition-colors
        un-duration-200
        un-border="1 solid neutral-700 dark:neutral-300"
        un-rounded-full
        un-cursor="pointer grab active:grabbing"
        tabindex="0"
        :aria-valuemin="min"
        :aria-valuemax="max"
        :aria-valuenow="handleAValue"
        :style="{ left: `${percentHandleA}%` }"
        role="slider"
        @pointerdown.prevent="onThumbPointerDown('a', $event)"
        @click.stop
        @keydown="onThumbKeydown('a', $event)"
      />
      <div
        un-absolute
        un-top="50%"
        un-translate-x="-1/2"
        un-translate-y="-1/2"
        un-w-4
        un-h-4
        un-bg="neutral-50 dark:neutral-950 hover:neutral-300 dark:hover:neutral-700"
        un-shadow-md
        un-transition-colors
        un-duration-200
        un-border="1 solid neutral-700 dark:neutral-300"
        un-rounded-full
        un-cursor="pointer grab active:grabbing"
        tabindex="0"
        :aria-valuemin="min"
        :aria-valuemax="max"
        :aria-valuenow="handleBValue"
        :style="{ left: `${percentHandleB}%` }"
        role="slider"
        @pointerdown.prevent="onThumbPointerDown('b', $event)"
        @click.stop
        @keydown="onThumbKeydown('b', $event)"
      />
    </template>
    <template v-else>
      <div
        un-absolute
        un-top="50%"
        un-translate-x="-1/2"
        un-translate-y="-1/2"
        un-w-4
        un-h-4
        un-bg="neutral-50 dark:neutral-950 hover:neutral-300 dark:hover:neutral-700"
        un-shadow-md
        un-transition-colors
        un-duration-200
        un-border="1 solid neutral-700 dark:neutral-300"
        un-rounded-full
        un-cursor="pointer grab active:grabbing"
        tabindex="0"
        :style="{ left: `${percentSingle}%` }"
        role="slider"
        @pointerdown.prevent="onThumbPointerDown('single', $event)"
        @click.stop
        @keydown="onThumbKeydown('single', $event)"
      />
    </template>
  </div>
</template>

<style scoped>

</style>
