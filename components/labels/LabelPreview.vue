<script setup lang="ts">
import type { SpecimenLabel } from '~/types'
import { MapPin, Calendar, User } from 'lucide-vue-next'

const props = defineProps<{
  label: SpecimenLabel
}>()
</script>

<template>
  <div class="border border-herb-brown-light/50 rounded p-3 font-serif text-herb-brown bg-herb-cream/80 relative">
    <div class="absolute -top-2 -right-2">
      <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-herb-green/30 text-herb-green-dark font-sans">
        右下角
      </span>
    </div>

    <div class="font-handwrite text-lg mb-0.5">
      {{ props.label.plantName || '未命名' }}
    </div>

    <div class="italic text-sm text-herb-brown/80 mb-2">
      {{ props.label.scientificName || '—' }}
    </div>

    <div class="space-y-1 text-xs text-herb-brown/70">
      <div v-if="props.label.collectionLocation" class="flex items-center gap-1">
        <MapPin :size="12" class="shrink-0" />
        <span>{{ props.label.collectionLocation }}</span>
      </div>
      <div v-if="props.label.collectionDate" class="flex items-center gap-1">
        <Calendar :size="12" class="shrink-0" />
        <span>{{ props.label.collectionDate }}</span>
      </div>
      <div v-if="props.label.collectorName" class="flex items-center gap-1">
        <User :size="12" class="shrink-0" />
        <span>{{ props.label.collectorName }}</span>
      </div>
    </div>

    <div v-if="props.label.notes" class="mt-2 pt-1.5 border-t border-herb-brown-light/30 text-[10px] text-herb-brown/50 leading-relaxed">
      {{ props.label.notes }}
    </div>
  </div>
</template>
