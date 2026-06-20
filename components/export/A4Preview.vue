<script setup lang="ts">
import type { SpecimenLabel } from '~/types'
import LabelPreview from '~/components/labels/LabelPreview.vue'

withDefaults(defineProps<{
  labels?: SpecimenLabel[]
  showBorder?: boolean
  borderStyle?: 'none' | 'simple' | 'botanical'
}>(), {
  labels: () => [],
  showBorder: true,
  borderStyle: 'simple'
})
</script>

<template>
  <div class="flex flex-col items-center">
    <div
      class="relative bg-white shadow-2xl transition-all duration-300 paper-texture"
      :class="[
        'aspect-[210/297] w-full max-w-[420px] mx-auto',
        showBorder && borderStyle === 'simple' ? 'border border-herb-brown-light/50' : '',
        showBorder && borderStyle === 'botanical' ? 'border border-herb-brown-light/60' : ''
      ]"
    >
      <div
        v-if="showBorder && borderStyle === 'botanical'"
        class="absolute inset-2 border-2 border-herb-brown-light/40 pointer-events-none"
      />

      <svg v-if="showBorder && borderStyle === 'botanical'" class="absolute top-0 left-0 w-10 h-10 text-herb-brown-light/60 pointer-events-none" viewBox="0 0 40 40" fill="none">
        <path d="M2 2 L2 15 M2 2 L15 2" stroke="currentColor" stroke-width="1.5" />
        <path d="M5 5 Q8 8 12 6 Q10 10 6 12 Q9 9 5 5" fill="currentColor" opacity="0.4" />
        <circle cx="14" cy="14" r="2" fill="currentColor" opacity="0.3" />
      </svg>
      <svg v-if="showBorder && borderStyle === 'botanical'" class="absolute top-0 right-0 w-10 h-10 text-herb-brown-light/60 pointer-events-none rotate-90" viewBox="0 0 40 40" fill="none">
        <path d="M2 2 L2 15 M2 2 L15 2" stroke="currentColor" stroke-width="1.5" />
        <path d="M5 5 Q8 8 12 6 Q10 10 6 12 Q9 9 5 5" fill="currentColor" opacity="0.4" />
        <circle cx="14" cy="14" r="2" fill="currentColor" opacity="0.3" />
      </svg>
      <svg v-if="showBorder && borderStyle === 'botanical'" class="absolute bottom-0 left-0 w-10 h-10 text-herb-brown-light/60 pointer-events-none -rotate-90" viewBox="0 0 40 40" fill="none">
        <path d="M2 2 L2 15 M2 2 L15 2" stroke="currentColor" stroke-width="1.5" />
        <path d="M5 5 Q8 8 12 6 Q10 10 6 12 Q9 9 5 5" fill="currentColor" opacity="0.4" />
        <circle cx="14" cy="14" r="2" fill="currentColor" opacity="0.3" />
      </svg>
      <svg v-if="showBorder && borderStyle === 'botanical'" class="absolute bottom-0 right-0 w-10 h-10 text-herb-brown-light/60 pointer-events-none rotate-180" viewBox="0 0 40 40" fill="none">
        <path d="M2 2 L2 15 M2 2 L15 2" stroke="currentColor" stroke-width="1.5" />
        <path d="M5 5 Q8 8 12 6 Q10 10 6 12 Q9 9 5 5" fill="currentColor" opacity="0.4" />
        <circle cx="14" cy="14" r="2" fill="currentColor" opacity="0.3" />
      </svg>

      <div class="absolute top-0 left-0 w-20 h-20 pointer-events-none" style="background: radial-gradient(ellipse at 0% 0%, rgba(168,213,186,0.12) 0%, transparent 70%)" />
      <div class="absolute top-0 right-0 w-20 h-20 pointer-events-none" style="background: radial-gradient(ellipse at 100% 0%, rgba(197,179,216,0.1) 0%, transparent 70%)" />
      <div class="absolute bottom-0 left-0 w-20 h-20 pointer-events-none" style="background: radial-gradient(ellipse at 0% 100%, rgba(197,179,216,0.1) 0%, transparent 70%)" />
      <div class="absolute bottom-0 right-0 w-20 h-20 pointer-events-none" style="background: radial-gradient(ellipse at 100% 100%, rgba(168,213,186,0.12) 0%, transparent 70%)" />

      <div class="absolute inset-12 flex flex-col gap-6">
        <div class="flex-1 flex justify-center items-end">
          <div class="relative w-full h-full flex items-center justify-center">
            <svg class="w-48 h-48 text-herb-green/30" viewBox="0 0 200 200" fill="none">
              <ellipse cx="100" cy="80" rx="45" ry="55" fill="currentColor" opacity="0.3" />
              <ellipse cx="70" cy="100" rx="30" ry="40" fill="currentColor" opacity="0.25" transform="rotate(-30 70 100)" />
              <ellipse cx="130" cy="100" rx="30" ry="40" fill="currentColor" opacity="0.25" transform="rotate(30 130 100)" />
              <ellipse cx="80" cy="130" rx="25" ry="35" fill="currentColor" opacity="0.2" transform="rotate(-60 80 130)" />
              <ellipse cx="120" cy="130" rx="25" ry="35" fill="currentColor" opacity="0.2" transform="rotate(60 120 130)" />
              <circle cx="100" cy="90" r="15" fill="#E8C4C4" opacity="0.5" />
              <circle cx="100" cy="90" r="8" fill="#C5B3D8" opacity="0.6" />
              <path d="M100 110 L100 170" stroke="#6B5B4E" stroke-width="2" opacity="0.2" />
              <path d="M100 140 Q80 135 70 150" stroke="#6B5B4E" stroke-width="1.5" opacity="0.2" fill="none" />
              <ellipse cx="65" cy="152" rx="12" ry="8" fill="currentColor" opacity="0.25" transform="rotate(-20 65 152)" />
              <path d="M100 155 Q120 150 132 165" stroke="#6B5B4E" stroke-width="1.5" opacity="0.2" fill="none" />
              <ellipse cx="137" cy="167" rx="12" ry="8" fill="currentColor" opacity="0.25" transform="rotate(20 137 167)" />
            </svg>
          </div>
        </div>

        <div class="mt-auto">
          <template v-if="labels.length > 0">
            <div class="flex flex-col gap-3">
              <LabelPreview
                v-for="label in labels"
                :key="label.id"
                :label="label"
              />
            </div>
          </template>
          <template v-else>
            <div class="font-handwrite text-herb-brown/30 text-center text-lg">
              拖拽素材至画布开始创作
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.paper-texture {
  background-image:
    linear-gradient(135deg, rgba(107, 91, 78, 0.015) 0%, transparent 50%),
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(107, 91, 78, 0.008) 2px,
      rgba(107, 91, 78, 0.008) 4px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 2px,
      rgba(107, 91, 78, 0.008) 2px,
      rgba(107, 91, 78, 0.008) 4px
    ),
    radial-gradient(ellipse at 30% 20%, rgba(245, 240, 232, 0.3) 0%, transparent 50%);
  background-color: #FAF8F5;
}
</style>
