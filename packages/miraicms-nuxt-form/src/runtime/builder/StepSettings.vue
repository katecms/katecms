<script setup lang="ts">
import { ref } from 'vue'
import IconPicker from './IconPicker.vue'
import type { FormContent, FormStep } from '../form/model'
import { updateStep, updateStepHeader } from '../form/model'

const props = defineProps<{
  content: FormContent
}>()

const emit = defineEmits<{
  update: [content: FormContent]
}>()

const openId = ref(props.content.steps[0]?.id ?? '')

function setHeader(partial: Partial<FormContent['stepHeader']>) {
  emit('update', updateStepHeader(props.content, partial))
}

function patchStep(stepId: string, partial: Partial<FormStep>) {
  emit('update', updateStep(props.content, stepId, partial))
}

function toggle(stepId: string) {
  openId.value = openId.value === stepId ? '' : stepId
}
</script>

<template>
  <div class="miraicms-form-step-settings">
    <div class="miraicms-form-step-settings__heading">
      Steps
    </div>

    <MiraiCmsTrueFalseField
      :model-value="content.stepHeader.show"
      field-key="step-header-show"
      :field="{ type: 'true_false', label: 'Show Step Header', ui: true, uiOnText: 'On', uiOffText: 'Off' }"
      @update:model-value="setHeader({ show: $event === true })"
    />
    <div
      v-if="content.stepHeader.show"
      class="miraicms-form-step-settings__nested"
    >
      <MiraiCmsTrueFalseField
        :model-value="content.stepHeader.showLabel"
        field-key="step-header-label"
        :field="{ type: 'true_false', label: 'Show Header Label', ui: true, uiOnText: 'On', uiOffText: 'Off' }"
        @update:model-value="setHeader({ showLabel: $event === true })"
      />
      <MiraiCmsTrueFalseField
        :model-value="content.stepHeader.showSubtitle"
        field-key="step-header-subtitle"
        :field="{ type: 'true_false', label: 'Show Header Subtitle', ui: true, uiOnText: 'On', uiOffText: 'Off' }"
        @update:model-value="setHeader({ showSubtitle: $event === true })"
      />
    </div>
    <MiraiCmsTrueFalseField
      :model-value="content.stepHeader.showIcon"
      field-key="step-header-icon"
      :field="{ type: 'true_false', label: 'Show Header Icon', ui: true, uiOnText: 'On', uiOffText: 'Off' }"
      @update:model-value="setHeader({ showIcon: $event === true })"
    />

    <div class="miraicms-form-step-settings__list">
      <div
        v-for="(step, index) in content.steps"
        :key="step.id"
        class="miraicms-form-step-settings__item"
      >
        <button
          type="button"
          class="miraicms-form-step-settings__summary"
          :aria-expanded="openId === step.id"
          @click="toggle(step.id)"
        >
          <span>{{ step.label || `Step ${index + 1}` }}</span>
          <span class="miraicms-form-step-settings__chevron">{{ openId === step.id ? '−' : '+' }}</span>
        </button>
        <div
          v-if="openId === step.id"
          class="miraicms-form-step-settings__panel"
        >
          <IconPicker
            v-if="content.stepHeader.showIcon"
            label="Step Icon"
            :model-value="step.icon"
            @update:model-value="patchStep(step.id, { icon: $event })"
          />
          <div class="miraicms-form-step-settings__line">
            <IconPicker
              compact
              label="Label prefix icon"
              :model-value="step.labelPrefix"
              @update:model-value="patchStep(step.id, { labelPrefix: $event })"
            />
            <MiraiCmsTextField
              :model-value="step.label"
              :field-key="`${step.id}-label`"
              :field="{ type: 'text', label: 'Step Label', maxLength: 80 }"
              @update:model-value="patchStep(step.id, { label: String($event ?? '') })"
            />
            <IconPicker
              compact
              label="Label suffix icon"
              :model-value="step.labelSuffix"
              @update:model-value="patchStep(step.id, { labelSuffix: $event })"
            />
          </div>
          <div class="miraicms-form-step-settings__line">
            <IconPicker
              compact
              label="Subtitle prefix icon"
              :model-value="step.subtitlePrefix"
              @update:model-value="patchStep(step.id, { subtitlePrefix: $event })"
            />
            <MiraiCmsTextField
              :model-value="step.subtitle"
              :field-key="`${step.id}-subtitle`"
              :field="{ type: 'text', label: 'Step Subtitle', maxLength: 160 }"
              @update:model-value="patchStep(step.id, { subtitle: String($event ?? '') })"
            />
            <IconPicker
              compact
              label="Subtitle suffix icon"
              :model-value="step.subtitleSuffix"
              @update:model-value="patchStep(step.id, { subtitleSuffix: $event })"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../assets/styles" as *;

.miraicms-form-step-settings {
  display: flex;
  flex-direction: column;
  gap: math-rem(12);

  &__heading {
    margin: 0;
    font-size: math-rem(12);
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: $color-muted;
  }

  &__nested {
    display: flex;
    flex-direction: column;
    gap: math-rem(8);
    margin-left: math-rem(12);
    padding-left: math-rem(12);
    border-left: 1px solid $color-border;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: math-rem(8);
  }

  &__item {
    border: 1px solid $color-border;
    border-radius: $border-radius;
    background: $color-surface;
  }

  &__summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: math-rem(8);
    width: 100%;
    padding: math-rem(8) math-rem(10);
    border: 0;
    background: transparent;
    color: $color-ink;
    font: inherit;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
  }

  &__chevron {
    color: $color-muted;
  }

  &__panel {
    display: flex;
    flex-direction: column;
    gap: math-rem(10);
    padding: 0 math-rem(10) math-rem(10);
  }

  &__line {
    display: grid;
    grid-template-columns: math-rem(36) minmax(0, 1fr) math-rem(36);
    gap: math-rem(8);
    align-items: end;
  }
}
</style>
