<script setup lang="ts">
import { onMounted } from 'vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import { useRejectionsStore } from '@/features/admin-rejections/store'

const rejectionsStore = useRejectionsStore()

onMounted(() => {
  rejectionsStore.loadPossibleReasons()
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-semibold text-navy mb-2">Possible rejection reasons</h1>
    <p class="text-gray-500 mb-6">
      Common reasons visa applications get rejected. Avoid these to improve your chances.
    </p>

    <ul class="space-y-3">
      <li v-for="reason in rejectionsStore.possibleReasons" :key="reason.code">
        <AppCard padding="sm">
          <p class="font-medium text-navy">{{ reason.title }}</p>
          <p class="text-sm text-gray-500 mt-1">{{ reason.description }}</p>
        </AppCard>
      </li>
    </ul>

    <RouterLink to="/rejections/why-rejected" class="block mt-6">
      <AppButton variant="outline" full-width>Check My Application Status</AppButton>
    </RouterLink>
  </div>
</template>
