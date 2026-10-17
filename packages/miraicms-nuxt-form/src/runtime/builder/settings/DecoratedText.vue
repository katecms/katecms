<script setup lang="ts">
import type { FormIcon, FormMarkedText } from '../../form/text-options'

const rootClass = 'miraicms-decorated-text'


const props = defineProps<{
  fieldKey: string
  model: FormMarkedText
  textLabel?: string
}>()

const emit = defineEmits<{
  update: [value: FormMarkedText]
}>()

function patch(partial: Partial<FormMarkedText>) {
  emit('update', { ...props.model, ...partial })
}

function setIcon(key: 'prefix' | 'suffix', value: unknown) {
  patch({ [key]: iconValue(value) })
}

function iconValue(value: unknown): FormIcon | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  const url = 'url' in value && typeof value.url === 'string' ? value.url : ''
  if (!url) {
    return null
  }
  const icon: FormIcon = { url }
  if ('id' in value && typeof value.id === 'number') {
    icon.id = value.id
  }
  if ('alt' in value && typeof value.alt === 'string' && value.alt) {
    icon.alt = value.alt
  }
  return icon
}
</script>

<template>
  <div :class="rootClass">
    <MiraiCmsTextareaField
      :model-value="model.text"
      :field-key="`${fieldKey}-text`"
      :field="{ type: 'textarea', label: textLabel || 'Text', maxLength: 400, rows: 3 }"
      @update:model-value="patch({ text: String($event ?? '') })"
    />
    <div :class="`${rootClass}__icons`">
      <MiraiCmsImageField
        :class="`${rootClass}__icon`"
        :model-value="model.prefix"
        :field-key="`${fieldKey}-prefix`"
        :field="{ type: 'image', label: 'Prefix Icon', iconMode: true, returnFormat: 'array' }"
        @update:model-value="setIcon('prefix', $event)"
      />
      <MiraiCmsImageField
        :class="`${rootClass}__icon`"
        :model-value="model.suffix"
        :field-key="`${fieldKey}-suffix`"
        :field="{ type: 'image', label: 'Suffix Icon', iconMode: true, returnFormat: 'array' }"
        @update:model-value="setIcon('suffix', $event)"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "miraicms-nuxt/styles" as *;
$root: '.miraicms-decorated-text';


#{$root} {
  display: flex;
  flex-direction: column;
  gap: math-rem(8);

  &__icons {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: math-rem(8);
  }

  &__icon {
    width: 100%;
    min-width: 0;
  }
}
</style>
