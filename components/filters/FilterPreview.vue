<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  filterType: string
  intensity: number
  enabled: boolean
}>()

const filterStyle = computed(() => {
  if (!props.enabled) return {}
  const ratio = props.intensity / 100
  const filters: Record<string, (r: number) => string> = {
    watercolor: (r) => `saturate(${0.8 * r + 1 * (1 - r)}) brightness(${1.05 * r + 1 * (1 - r)}) contrast(${1.1 * r + 1 * (1 - r)})`,
    diffuse: (r) => `blur(${1 * r}px) brightness(${1.02 * r + 1 * (1 - r)})`,
    texture: (r) => `contrast(${1.15 * r + 1 * (1 - r)}) brightness(${0.95 * r + 1 * (1 - r)}) grayscale(${0.1 * r})`,
    vintage: (r) => `sepia(${0.6 * r}) brightness(${0.95 * r + 1 * (1 - r)}) saturate(${0.7 * r + 1 * (1 - r)})`,
  }
  const fn = filters[props.filterType]
  return fn ? { filter: fn(ratio) } : {}
})
</script>

<template>
  <div class="w-full h-16 rounded-lg overflow-hidden bg-herb-cream/50">
    <div class="w-full h-full flex items-center justify-center" :style="filterStyle">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 40 40"
        class="w-10 h-10"
        fill="none"
      >
        <path
          d="M20 4C14 4 8 10 8 20c0 6 4 12 12 16 8-4 12-10 12-16C32 10 26 4 20 4z"
          fill="#A8D5BA"
          stroke="#7BBF96"
          stroke-width="1"
        />
        <path
          d="M20 8v24M14 14c3 2 6 2 6 2M20 10c0 0 4-1 7 1"
          stroke="#7BBF96"
          stroke-width="0.8"
          fill="none"
        />
      </svg>
    </div>
  </div>
</template>
