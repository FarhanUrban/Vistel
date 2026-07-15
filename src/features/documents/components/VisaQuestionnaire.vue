<script setup lang="ts">
import { computed } from 'vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import AppInput from '@/components/AppInput.vue'
import AppSelect from '@/components/AppSelect.vue'
import { useDocumentsStore } from '@/features/documents/store'
import type { VisaQuestion } from '@/types'

const documentsStore = useDocumentsStore()

const emit = defineEmits<{
  back: []
  continue: []
}>()

const requiredTotal = computed(() => documentsStore.visaQuestions.filter((q) => q.required).length)

const requiredAnswered = computed(
  () =>
    documentsStore.visaQuestions.filter((q) => {
      if (!q.required) return false
      const value = documentsStore.answers[q.id]
      return typeof value === 'string' && value.trim().length > 0
    }).length,
)

function selectOptions(question: VisaQuestion) {
  return (question.options ?? []).map((opt) => ({ value: opt, label: opt }))
}

function onContinue() {
  if (!documentsStore.allRequiredAnswered()) return
  emit('continue')
}
</script>

<template>
  <div>
    <div class="mb-4 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 class="text-xl font-semibold text-navy">Application questions</h2>
        <p class="mt-1 text-sm text-navy/60">
          Answer these questions for your destination. Required fields must be completed to
          continue.
        </p>
      </div>
      <p class="text-sm font-medium text-accent-blue">
        {{ requiredAnswered }} of {{ requiredTotal }} required answered
      </p>
    </div>

    <div class="mb-3 h-2 overflow-hidden rounded-full bg-muted">
      <div
        class="h-full rounded-full bg-accent-orange transition-all"
        :style="{
          width: `${requiredTotal ? Math.round((requiredAnswered / requiredTotal) * 100) : 0}%`,
        }"
      />
    </div>

    <AppCard class="mb-6 space-y-5">
      <div v-for="question in documentsStore.visaQuestions" :key="question.id" class="space-y-1.5">
        <p
          v-if="question.category"
          class="text-xs font-medium uppercase tracking-wide text-accent-blue"
        >
          {{ question.category }}
        </p>

        <AppSelect
          v-if="question.type === 'select'"
          :model-value="documentsStore.answers[question.id] ?? ''"
          :label="question.label + (question.required ? ' *' : '')"
          :options="selectOptions(question)"
          :placeholder="question.placeholder ?? 'Select an option'"
          @update:model-value="documentsStore.setAnswer(question.id, $event)"
        />

        <AppInput
          v-else-if="question.type === 'text' || question.type === 'date'"
          :model-value="documentsStore.answers[question.id] ?? ''"
          :label="question.label + (question.required ? ' *' : '')"
          :type="question.type"
          :placeholder="question.placeholder ?? ''"
          @update:model-value="documentsStore.setAnswer(question.id, $event)"
        />

        <div v-else-if="question.type === 'textarea'">
          <label class="mb-1.5 block text-sm font-medium text-navy">
            {{ question.label }}{{ question.required ? ' *' : '' }}
          </label>
          <textarea
            :value="documentsStore.answers[question.id] ?? ''"
            rows="3"
            class="w-full rounded-control border border-muted bg-white px-4 py-2.5 text-navy placeholder:text-navy/40 focus:border-accent-blue focus:outline-none focus:ring-2 focus:ring-accent-blue/40"
            :placeholder="question.placeholder ?? ''"
            @input="
              documentsStore.setAnswer(question.id, ($event.target as HTMLTextAreaElement).value)
            "
          />
        </div>

        <div v-else-if="question.type === 'radio'">
          <p class="mb-2 text-sm font-medium text-navy">
            {{ question.label }}{{ question.required ? ' *' : '' }}
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opt in question.options ?? []"
              :key="opt"
              type="button"
              class="rounded-control border px-3 py-2 text-sm transition-colors"
              :class="
                documentsStore.answers[question.id] === opt
                  ? 'border-accent-orange bg-accent-orange/15 text-navy'
                  : 'border-muted bg-white text-navy/80 hover:border-accent-blue/50'
              "
              @click="documentsStore.setAnswer(question.id, opt)"
            >
              {{ opt }}
            </button>
          </div>
        </div>

        <p v-if="question.helpText" class="text-xs text-navy/50">{{ question.helpText }}</p>
      </div>
    </AppCard>

    <div class="flex flex-col gap-3 sm:flex-row">
      <AppButton variant="outline" full-width @click="emit('back')">Back to documents</AppButton>
      <AppButton
        variant="secondary"
        full-width
        :disabled="!documentsStore.allRequiredAnswered()"
        @click="onContinue"
      >
        Review &amp; submit
      </AppButton>
    </div>
  </div>
</template>
