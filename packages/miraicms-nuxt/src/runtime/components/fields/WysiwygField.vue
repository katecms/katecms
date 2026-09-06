<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { TextStyleKit } from '@tiptap/extension-text-style'
import TextAlign from '@tiptap/extension-text-align'
import { TableKit } from '@tiptap/extension-table'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import type { Field } from '@miraicms/core'

type WysiwygFieldConfig = Extract<Field, { type: 'wysiwyg' }>
type BlockType = 'paragraph' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'pre'
type AlignType = 'left' | 'center' | 'right' | 'justify'
type TableCommand
  = 'insert'
    | 'addRowBefore'
    | 'addRowAfter'
    | 'deleteRow'
    | 'addColumnBefore'
    | 'addColumnAfter'
    | 'deleteColumn'
    | 'deleteTable'

const DEFAULT_FONT_SIZES = [
  '8px', '10px', '12px', '14px', '16px', '20px', '24px',
  '28px', '32px', '36px', '48px', '60px', '72px', '96px',
]

const DEFAULT_COLOR_PALETTE = [
  '#000000', '#1a1d27', '#6b7185', '#9ca3af', '#e2e4ec', '#ffffff',
  '#f0453d', '#d97706', '#22b573', '#2F6FED', '#7c3aed', '#db2777',
  '#fecaca', '#fde68a', '#bbf7d0', '#bfdbfe', '#ddd6fe', '#fbcfe8',
]

const BLOCK_OPTIONS: { value: BlockType, label: string }[] = [
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
  { value: 'h4', label: 'Heading 4' },
  { value: 'h5', label: 'Heading 5' },
  { value: 'h6', label: 'Heading 6' },
  { value: 'pre', label: 'Preformatted' },
]

const ALIGN_OPTIONS: { value: AlignType, label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
  { value: 'justify', label: 'Justify' },
]

const TABLE_OPTIONS: { value: TableCommand, label: string, inTable?: boolean }[] = [
  { value: 'insert', label: 'Insert 3×3 table' },
  { value: 'addRowBefore', label: 'Add row before', inTable: true },
  { value: 'addRowAfter', label: 'Add row after', inTable: true },
  { value: 'deleteRow', label: 'Delete row', inTable: true },
  { value: 'addColumnBefore', label: 'Add column before', inTable: true },
  { value: 'addColumnAfter', label: 'Add column after', inTable: true },
  { value: 'deleteColumn', label: 'Delete column', inTable: true },
  { value: 'deleteTable', label: 'Delete table', inTable: true },
]

const props = withDefaults(defineProps<{
  fieldKey: string
  field?: WysiwygFieldConfig
}>(), {
  field: () => ({ type: 'wysiwyg', label: '' }),
})

const model = defineModel<string>({ default: '' })

const rootClass = 'miraicms-wysiwyg-field'
const isFullToolbar = computed(() => props.field?.toolbar !== 'basic')

const tabsMode = computed(() => props.field?.tabs ?? 'all')
const showTabSwitch = computed(() => tabsMode.value === 'all')
const activeTab = ref<'visual' | 'text'>(tabsMode.value === 'text' ? 'text' : 'visual')

const fontSizes = computed(() => {
  const custom = props.field?.fontSize
  if (Array.isArray(custom) && custom.length > 0) {
    return custom.map(normalizeFontSize)
  }
  return DEFAULT_FONT_SIZES
})

const colorPalette = computed(() => {
  const custom = props.field?.colorPalette
  if (Array.isArray(custom) && custom.length > 0) {
    return custom
  }
  return DEFAULT_COLOR_PALETTE
})

/** Bumps on every editor transaction so toolbar active-states stay in sync. */
const editorTick = ref(0)

const editor = useEditor({
  content: model.value,
  immediatelyRender: false,
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      link: {
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
        },
      },
    }),
    TextStyleKit.configure({
      backgroundColor: false,
      fontFamily: false,
      lineHeight: false,
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    Subscript,
    Superscript,
    TableKit.configure({
      table: { resizable: true },
    }),
  ],
  editorProps: {
    attributes: { class: `${rootClass}__editable` },
  },
  onUpdate: ({ editor: instance }) => {
    model.value = instance.getHTML()
  },
  onTransaction: () => {
    editorTick.value += 1
  },
})

watch(model, (value) => {
  const instance = editor.value
  if (instance && value !== instance.getHTML()) {
    instance.commands.setContent(value || '', { emitUpdate: false })
  }
})

const linkOpen = ref(false)
const linkUrl = ref('')
const linkUrlInput = ref<HTMLInputElement | null>(null)

function normalizeFontSize(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return trimmed
  return /^\d+(?:\.\d+)?$/.test(trimmed) ? `${trimmed}px` : trimmed
}

function selectValue(event: Event): string {
  return (event.target as HTMLSelectElement).value
}

const currentFontSize = computed(() => {
  void editorTick.value
  return editor.value?.getAttributes('textStyle').fontSize || ''
})

const currentBlock = computed<BlockType>(() => {
  void editorTick.value
  const e = editor.value
  if (!e) return 'paragraph'
  for (let level = 1; level <= 6; level++) {
    if (e.isActive('heading', { level })) {
      return `h${level}` as BlockType
    }
  }
  if (e.isActive('codeBlock')) return 'pre'
  return 'paragraph'
})

const currentAlign = computed<AlignType>(() => {
  void editorTick.value
  const e = editor.value
  if (!e) return 'left'
  for (const option of ALIGN_OPTIONS) {
    if (e.isActive({ textAlign: option.value })) {
      return option.value
    }
  }
  return 'left'
})

const currentColor = computed(() => {
  void editorTick.value
  return editor.value?.getAttributes('textStyle').color || ''
})

const isInTable = computed(() => {
  void editorTick.value
  return !!editor.value?.isActive('table')
})

const isLinkActive = computed(() => {
  void editorTick.value
  return !!editor.value?.isActive('link')
})

function isMarkActive(name: string) {
  void editorTick.value
  return !!editor.value?.isActive(name)
}

function setFontSize(size: string) {
  const e = editor.value
  if (!e) return
  if (!size) {
    e.chain().focus().unsetFontSize().run()
  }
  else {
    e.chain().focus().setFontSize(normalizeFontSize(size)).run()
  }
}

function setBlockType(type: BlockType) {
  const e = editor.value
  if (!e) return
  const chain = e.chain().focus()

  if (type === 'paragraph') {
    chain.setParagraph().run()
  }
  else if (type === 'pre') {
    chain.toggleCodeBlock().run()
  }
  else {
    const level = Number(type.slice(1)) as 1 | 2 | 3 | 4 | 5 | 6
    chain.toggleHeading({ level }).run()
  }
}

function setAlign(align: AlignType) {
  editor.value?.chain().focus().setTextAlign(align).run()
}

function setColor(color: string) {
  const e = editor.value
  if (!e) return
  if (!color) {
    e.chain().focus().unsetColor().run()
  }
  else {
    e.chain().focus().setColor(color).run()
  }
}

function onFontSizeChange(event: Event) {
  setFontSize(selectValue(event))
}

function onBlockChange(event: Event) {
  setBlockType(selectValue(event) as BlockType)
}

function onAlignChange(event: Event) {
  setAlign(selectValue(event) as AlignType)
}

function onColorChange(event: Event) {
  setColor(selectValue(event))
}

function onTableChange(event: Event) {
  const select = event.target as HTMLSelectElement
  const command = select.value as TableCommand | ''
  select.value = ''
  if (!command) return

  const e = editor.value
  if (!e) return

  if (command === 'insert') {
    e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    return
  }

  e.chain().focus()[command]().run()
}

const visibleTableOptions = computed(() => {
  return TABLE_OPTIONS.filter(option => !option.inTable || isInTable.value)
})

function openLinkDialog() {
  const e = editor.value
  if (!e) return
  linkUrl.value = e.getAttributes('link').href || 'https://'
  linkOpen.value = true
  nextTick(() => {
    linkUrlInput.value?.focus()
    linkUrlInput.value?.select()
  })
}

function applyLink() {
  const e = editor.value
  if (!e) return

  const href = linkUrl.value.trim()
  if (!href || href === 'https://' || href === 'http://') {
    e.chain().focus().extendMarkRange('link').unsetLink().run()
  }
  else {
    e.chain().focus().extendMarkRange('link').setLink({ href }).run()
  }

  linkOpen.value = false
}

function removeLink() {
  editor.value?.chain().focus().extendMarkRange('link').unsetLink().run()
  linkOpen.value = false
}
</script>

<template>
  <MiraiCmsFieldWrapper
    :field-key="fieldKey"
    :field="field"
    label-tag="div"
  >
    <div :class="rootClass">
      <div :class="`${rootClass}__wrap`">
      <div
        v-if="showTabSwitch"
        :class="`${rootClass}__tabs`"
      >
        <button
          type="button"
          :class="[`${rootClass}__tab`, { 'is-active': activeTab === 'visual' }]"
          @click="activeTab = 'visual'"
        >
          Visual
        </button>
        <button
          type="button"
          :class="[`${rootClass}__tab`, { 'is-active': activeTab === 'text' }]"
          @click="activeTab = 'text'"
        >
          Text
        </button>
      </div>

      <template v-if="activeTab === 'visual'">
        <div
          v-if="editor"
          :class="`${rootClass}__toolbar`"
        >
          <!-- Font size -->
          <div :class="`${rootClass}__group`">
            <select
              :class="`${rootClass}__select`"
              title="Font size"
              aria-label="Font size"
              :value="currentFontSize"
              @change="onFontSizeChange"
            >
              <option value="">
                Size
              </option>
              <option
                v-for="size in fontSizes"
                :key="size"
                :value="size"
              >
                {{ size }}
              </option>
            </select>
          </div>

          <!-- Block type -->
          <div :class="`${rootClass}__group`">
            <select
              :class="`${rootClass}__select`"
              title="Block type"
              aria-label="Block type"
              :value="currentBlock"
              @change="onBlockChange"
            >
              <option
                v-for="option in BLOCK_OPTIONS"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </div>

          <span :class="`${rootClass}__sep`" />

          <!-- Inline marks -->
          <div :class="`${rootClass}__group`">
            <button
              type="button"
              :class="[`${rootClass}__btn`, { 'is-active': isMarkActive('bold') }]"
              title="Bold"
              aria-label="Bold"
              @click="editor.chain().focus().toggleBold().run()"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 640 640"
              >
                <path
                  d="M160 96C142.3 96 128 110.3 128 128C128 145.7 142.3 160 160 160L192 160L192 480L160 480C142.3 480 128 494.3 128 512C128 529.7 142.3 544 160 544L384 544C454.7 544 512 486.7 512 416C512 369.5 487.2 328.7 450 306.3C468.7 284 480 255.3 480 224C480 153.3 422.7 96 352 96L160 96zM416 224C416 259.3 387.3 288 352 288L256 288L256 160L352 160C387.3 160 416 188.7 416 224zM256 480L256 352L384 352C419.3 352 448 380.7 448 416C448 451.3 419.3 480 384 480L256 480z"
                />
              </svg>
            </button>
            <button
              type="button"
              :class="[`${rootClass}__btn`, { 'is-active': isMarkActive('italic') }]"
              title="Italic"
              aria-label="Italic"
              @click="editor.chain().focus().toggleItalic().run()"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 640 640"
              >
                <path
                  d="M256 128C256 110.3 270.3 96 288 96L480 96C497.7 96 512 110.3 512 128C512 145.7 497.7 160 480 160L421.3 160L288 480L352 480C369.7 480 384 494.3 384 512C384 529.7 369.7 544 352 544L160 544C142.3 544 128 529.7 128 512C128 494.3 142.3 480 160 480L218.7 480L352 160L288 160C270.3 160 256 145.7 256 128z"
                />
              </svg>
            </button>
            <button
              type="button"
              :class="[`${rootClass}__btn`, { 'is-active': isMarkActive('underline') }]"
              title="Underline"
              aria-label="Underline"
              @click="editor.chain().focus().toggleUnderline().run()"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 640 640"
              >
                <path
                  d="M128 96C128 78.3 142.3 64 160 64L224 64C241.7 64 256 78.3 256 96C256 113.7 241.7 128 224 128L224 288C224 341 267 384 320 384C373 384 416 341 416 288L416 128C398.3 128 384 113.7 384 96C384 78.3 398.3 64 416 64L480 64C497.7 64 512 78.3 512 96C512 113.7 497.7 128 480 128L480 288C480 376.4 408.4 448 320 448C231.6 448 160 376.4 160 288L160 128C142.3 128 128 113.7 128 96zM128 544C128 526.3 142.3 512 160 512L480 512C497.7 512 512 526.3 512 544C512 561.7 497.7 576 480 576L160 576C142.3 576 128 561.7 128 544z"
                />
              </svg>
            </button>
            <button
              type="button"
              :class="[`${rootClass}__btn`, { 'is-active': isMarkActive('strike') }]"
              title="Strikethrough"
              aria-label="Strikethrough"
              @click="editor.chain().focus().toggleStrike().run()"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 640 640"
              >
                <path
                  d="M160 221.5C160 152.2 216.2 96 285.5 96L432 96C449.7 96 464 110.3 464 128C464 145.7 449.7 160 432 160L285.5 160C251.5 160 224 187.5 224 221.5C224 252.5 247.1 278.7 277.9 282.5L322 288L544 288C561.7 288 576 302.3 576 320C576 337.7 561.7 352 544 352L96 352C78.3 352 64 337.7 64 320C64 302.3 78.3 288 96 288L179.1 288C167 268.6 160 245.8 160 221.5zM413.2 400L478.7 400C479.6 406.1 480.1 412.2 480.1 418.5C480.1 487.8 423.9 544 354.6 544L208 544C190.3 544 176 529.7 176 512C176 494.3 190.3 480 208 480L354.5 480C388.5 480 416 452.5 416 418.5C416 412.1 415 405.8 413.2 400z"
                />
              </svg>
            </button>
            <template v-if="isFullToolbar">
              <button
                type="button"
                :class="[`${rootClass}__btn`, { 'is-active': isMarkActive('superscript') }]"
                title="Superscript"
                aria-label="Superscript"
                @click="editor.chain().focus().toggleSuperscript().run()"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 640 640"
                >
                  <path
                    d="M576 96C576 84.9 570.3 74.6 560.8 68.8C551.3 63 539.6 62.4 529.7 67.4L497.7 83.4C481.9 91.3 475.5 110.5 483.4 126.3C489 137.5 500.3 144 512 144L512 224C494.3 224 480 238.3 480 256C480 273.7 494.3 288 512 288L576 288C593.7 288 608 273.7 608 256C608 238.3 593.7 224 576 224L576 96zM128 128C110.3 128 96 142.3 96 160C96 177.7 110.3 192 128 192L143.3 192L232.9 320L143.3 448L128 448C110.3 448 96 462.3 96 480C96 497.7 110.3 512 128 512L160 512C170.4 512 180.2 506.9 186.2 498.4L272 375.8L357.8 498.4C363.8 507 373.6 512 384 512L416 512C433.7 512 448 497.7 448 480C448 462.3 433.7 448 416 448L400.7 448L311.1 320L400.7 192L416 192C433.7 192 448 177.7 448 160C448 142.3 433.7 128 416 128L384 128C373.6 128 363.8 133.1 357.8 141.6L272 264.2L186.2 141.6C180.2 133.1 170.4 128 160 128L128 128z"
                  />
                </svg>
              </button>
              <button
                type="button"
                :class="[`${rootClass}__btn`, { 'is-active': isMarkActive('subscript') }]"
                title="Subscript"
                aria-label="Subscript"
                @click="editor.chain().focus().toggleSubscript().run()"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 640 640"
                >
                  <path
                    d="M128 128C110.3 128 96 142.3 96 160C96 177.7 110.3 192 128 192L143.3 192L232.9 320L143.3 448L128 448C110.3 448 96 462.3 96 480C96 497.7 110.3 512 128 512L160 512C170.4 512 180.2 506.9 186.2 498.4L272 375.8L357.8 498.4C363.8 507 373.6 512 384 512L416 512C433.7 512 448 497.7 448 480C448 462.3 433.7 448 416 448L400.7 448L311.1 320L400.7 192L416 192C433.7 192 448 177.7 448 160C448 142.3 433.7 128 416 128L384 128C373.6 128 363.8 133.1 357.8 141.6L272 264.2L186.2 141.6C180.2 133.1 170.4 128 160 128L128 128zM576 384C576 372.9 570.3 362.6 560.8 356.8C551.3 351 539.6 350.4 529.7 355.4L497.7 371.4C481.9 379.3 475.5 398.5 483.4 414.3C489 425.5 500.3 432 512 432L512 512C494.3 512 480 526.3 480 544C480 561.7 494.3 576 512 576L576 576C593.7 576 608 561.7 608 544C608 526.3 593.7 512 576 512L576 384z"
                  />
                </svg>
              </button>
              <button
                type="button"
                :class="[`${rootClass}__btn`, { 'is-active': isMarkActive('code') }]"
                title="Code"
                aria-label="Code"
                @click="editor.chain().focus().toggleCode().run()"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 640 640"
                >
                  <path
                    d="M392.8 65.2C375.8 60.3 358.1 70.2 353.2 87.2L225.2 535.2C220.3 552.2 230.2 569.9 247.2 574.8C264.2 579.7 281.9 569.8 286.8 552.8L414.8 104.8C419.7 87.8 409.8 70.1 392.8 65.2zM457.4 201.3C444.9 213.8 444.9 234.1 457.4 246.6L530.8 320L457.4 393.4C444.9 405.9 444.9 426.2 457.4 438.7C469.9 451.2 490.2 451.2 502.7 438.7L598.7 342.7C611.2 330.2 611.2 309.9 598.7 297.4L502.7 201.4C490.2 188.9 469.9 188.9 457.4 201.4zM182.7 201.3C170.2 188.8 149.9 188.8 137.4 201.3L41.4 297.3C28.9 309.8 28.9 330.1 41.4 342.6L137.4 438.6C149.9 451.1 170.2 451.1 182.7 438.6C195.2 426.1 195.2 405.8 182.7 393.3L109.3 320L182.6 246.6C195.1 234.1 195.1 213.8 182.6 201.3z"
                  />
                </svg>
              </button>
            </template>
          </div>

          <template v-if="isFullToolbar">
            <span :class="`${rootClass}__sep`" />

            <!-- Align -->
            <div :class="`${rootClass}__group`">
              <select
                :class="`${rootClass}__select`"
                title="Align"
                aria-label="Align"
                :value="currentAlign"
                @change="onAlignChange"
              >
                <option
                  v-for="option in ALIGN_OPTIONS"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </div>

            <span :class="`${rootClass}__sep`" />
          </template>

          <!-- Blockquote + lists -->
          <div :class="`${rootClass}__group`">
            <button
              v-if="isFullToolbar"
              type="button"
              :class="[`${rootClass}__btn`, { 'is-active': isMarkActive('blockquote') }]"
              title="Blockquote"
              aria-label="Blockquote"
              @click="editor.chain().focus().toggleBlockquote().run()"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 640 640"
              >
                <path
                  d="M236.986 199.117C251.137 189.275 269.836 177.665 293.083 164.417L266.55 120C251.137 129.338 232.185 141.452 209.442 156.215C186.7 170.978 165.222 189.022 145.006 210.221C124.952 231.349 108.019 255.228 94.7207 281.136C80.8227 307.256 74 336.404 74 368.455C74 413.88 83.0969 450.474 101.417 478.612C119.611 506.246 150.06 520 192.385 520C219.55 520 240.776 511.167 256.063 493.376C270.94 477.502 279.402 456.689 279.817 434.953C279.817 405.931 270.972 383.975 253.158 369.212C235.848 353.943 211.969 346.246 181.394 346.246H145.764C148.797 320.631 153.977 299.558 161.304 283.407C169.303 266.218 180.057 250.447 193.144 236.719C206.183 222.511 220.982 209.888 236.986 199.117ZM510.776 199.117C525.053 189.275 543.878 177.665 567 164.417L540.468 120C525.053 129.338 506.102 141.452 483.36 156.215C460.617 170.978 439.138 189.022 418.923 210.221C398.869 231.349 381.936 255.228 368.638 281.136C354.739 307.256 347.917 336.404 347.917 368.455C347.917 413.88 357.014 450.474 375.334 478.612C393.527 506.246 423.977 520 466.303 520C493.467 520 514.692 511.167 529.981 493.376C544.856 477.502 553.318 456.689 553.733 434.953C553.733 405.931 544.89 383.975 527.074 369.212C509.766 353.943 485.887 346.246 455.31 346.246H419.681C421.613 324.94 426.635 304.027 434.589 284.164C441.918 267.76 452.784 252.114 467.061 236.845C480.085 222.547 494.759 209.967 510.776 199.117Z"
                />
              </svg>
            </button>
            <button
              type="button"
              :class="[`${rootClass}__btn`, { 'is-active': isMarkActive('bulletList') }]"
              title="Bulleted list"
              aria-label="Bulleted list"
              @click="editor.chain().focus().toggleBulletList().run()"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 640 640"
              >
                <path
                  d="M112 208C138.5 208 160 186.5 160 160C160 133.5 138.5 112 112 112C85.5 112 64 133.5 64 160C64 186.5 85.5 208 112 208zM256 128C238.3 128 224 142.3 224 160C224 177.7 238.3 192 256 192L544 192C561.7 192 576 177.7 576 160C576 142.3 561.7 128 544 128L256 128zM256 288C238.3 288 224 302.3 224 320C224 337.7 238.3 352 256 352L544 352C561.7 352 576 337.7 576 320C576 302.3 561.7 288 544 288L256 288zM256 448C238.3 448 224 462.3 224 480C224 497.7 238.3 512 256 512L544 512C561.7 512 576 497.7 576 480C576 462.3 561.7 448 544 448L256 448zM112 528C138.5 528 160 506.5 160 480C160 453.5 138.5 432 112 432C85.5 432 64 453.5 64 480C64 506.5 85.5 528 112 528zM160 320C160 293.5 138.5 272 112 272C85.5 272 64 293.5 64 320C64 346.5 85.5 368 112 368C138.5 368 160 346.5 160 320z"
                />
              </svg>
            </button>
            <button
              type="button"
              :class="[`${rootClass}__btn`, { 'is-active': isMarkActive('orderedList') }]"
              title="Numbered list"
              aria-label="Numbered list"
              @click="editor.chain().focus().toggleOrderedList().run()"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 640 640"
              >
                <path
                  d="M64 136C64 122.8 74.7 112 88 112L136 112C149.3 112 160 122.7 160 136L160 240L184 240C197.3 240 208 250.7 208 264C208 277.3 197.3 288 184 288L88 288C74.7 288 64 277.3 64 264C64 250.7 74.7 240 88 240L112 240L112 160L88 160C74.7 160 64 149.3 64 136zM94.4 365.2C105.8 356.6 119.7 352 134 352L138.9 352C172.6 352 200 379.4 200 413.1C200 432.7 190.6 451 174.8 462.5L150.8 480L184 480C197.3 480 208 490.7 208 504C208 517.3 197.3 528 184 528L93.3 528C77.1 528 64 514.9 64 498.7C64 489.3 68.5 480.5 76.1 475L146.6 423.7C150 421.2 152 417.3 152 413.1C152 405.9 146.1 400 138.9 400L134 400C130.1 400 126.3 401.3 123.2 403.6L102.4 419.2C91.8 427.2 76.8 425 68.8 414.4C60.8 403.8 63 388.8 73.6 380.8L94.4 365.2zM288 128L544 128C561.7 128 576 142.3 576 160C576 177.7 561.7 192 544 192L288 192C270.3 192 256 177.7 256 160C256 142.3 270.3 128 288 128zM288 288L544 288C561.7 288 576 302.3 576 320C576 337.7 561.7 352 544 352L288 352C270.3 352 256 337.7 256 320C256 302.3 270.3 288 288 288zM288 448L544 448C561.7 448 576 462.3 576 480C576 497.7 561.7 512 544 512L288 512C270.3 512 256 497.7 256 480C256 462.3 270.3 448 288 448z"
                />
              </svg>
            </button>
          </div>

          <template v-if="isFullToolbar">
            <span :class="`${rootClass}__sep`" />

            <!-- Text color -->
            <div :class="`${rootClass}__group`">
              <select
                :class="`${rootClass}__select`"
                title="Text color"
                aria-label="Text color"
                :value="currentColor"
                @change="onColorChange"
              >
                <option value="">
                  Color
                </option>
                <option
                  v-for="color in colorPalette"
                  :key="color"
                  :value="color"
                >
                  {{ color }}
                </option>
              </select>
            </div>

            <span :class="`${rootClass}__sep`" />
          </template>

          <!-- Link -->
          <div :class="`${rootClass}__group`">
            <button
              type="button"
              :class="[`${rootClass}__btn`, { 'is-active': isLinkActive || linkOpen }]"
              title="Link"
              aria-label="Link"
              @click="openLinkDialog"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 640 640"
              >
                <path
                  d="M451.5 160C434.9 160 418.8 164.5 404.7 172.7C388.9 156.7 370.5 143.3 350.2 133.2C378.4 109.2 414.3 96 451.5 96C537.9 96 608 166 608 252.5C608 294 591.5 333.8 562.2 363.1L491.1 434.2C461.8 463.5 422 480 380.5 480C294.1 480 224 410 224 323.5C224 322 224 320.5 224.1 319C224.6 301.3 239.3 287.4 257 287.9C274.7 288.4 288.6 303.1 288.1 320.8C288.1 321.7 288.1 322.6 288.1 323.4C288.1 374.5 329.5 415.9 380.6 415.9C405.1 415.9 428.6 406.2 446 388.8L517.1 317.7C534.4 300.4 544.2 276.8 544.2 252.3C544.2 201.2 502.8 159.8 451.7 159.8zM307.2 237.3C305.3 236.5 303.4 235.4 301.7 234.2C289.1 227.7 274.7 224 259.6 224C235.1 224 211.6 233.7 194.2 251.1L123.1 322.2C105.8 339.5 96 363.1 96 387.6C96 438.7 137.4 480.1 188.5 480.1C205 480.1 221.1 475.7 235.2 467.5C251 483.5 269.4 496.9 289.8 507C261.6 530.9 225.8 544.2 188.5 544.2C102.1 544.2 32 474.2 32 387.7C32 346.2 48.5 306.4 77.8 277.1L148.9 206C178.2 176.7 218 160.2 259.5 160.2C346.1 160.2 416 230.8 416 317.1C416 318.4 416 319.7 416 321C415.6 338.7 400.9 352.6 383.2 352.2C365.5 351.8 351.6 337.1 352 319.4C352 318.6 352 317.9 352 317.1C352 283.4 334 253.8 307.2 237.5z"
                />
              </svg>
            </button>
          </div>

          <template v-if="isFullToolbar">
            <span :class="`${rootClass}__sep`" />

            <!-- Table -->
            <div :class="`${rootClass}__group`">
              <select
                :class="[`${rootClass}__select`, { 'is-active': isInTable }]"
                title="Table"
                aria-label="Table"
                value=""
                @change="onTableChange"
              >
                <option
                  value=""
                  disabled
                >
                  Table
                </option>
                <option
                  v-for="option in visibleTableOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </div>
          </template>

          <span :class="`${rootClass}__sep`" />

          <!-- History -->
          <div :class="`${rootClass}__group`">
            <button
              type="button"
              :class="`${rootClass}__btn`"
              title="Undo"
              aria-label="Undo"
              @click="editor.chain().focus().undo().run()"
            >
              Undo
            </button>
            <button
              type="button"
              :class="`${rootClass}__btn`"
              title="Redo"
              aria-label="Redo"
              @click="editor.chain().focus().redo().run()"
            >
              Redo
            </button>
          </div>
        </div>

        <!-- Link popover -->
        <div
          v-if="linkOpen"
          :class="`${rootClass}__link-bar`"
        >
          <label
            :class="`${rootClass}__link-label`"
            :for="`${fieldKey}-link-url`"
          >
            URL
          </label>
          <input
            :id="`${fieldKey}-link-url`"
            ref="linkUrlInput"
            v-model="linkUrl"
            type="url"
            :class="`${rootClass}__link-input`"
            placeholder="https://"
            @keydown.enter.prevent="applyLink"
            @keydown.esc.prevent="linkOpen = false"
          >
          <button
            type="button"
            :class="[`${rootClass}__btn`, `${rootClass}__btn--primary`]"
            @click="applyLink"
          >
            Apply
          </button>
          <button
            v-if="isLinkActive"
            type="button"
            :class="`${rootClass}__btn`"
            @click="removeLink"
          >
            Unlink
          </button>
          <button
            type="button"
            :class="`${rootClass}__btn`"
            @click="linkOpen = false"
          >
            Cancel
          </button>
        </div>

        <EditorContent
          :editor="editor"
          :class="`${rootClass}__content`"
        />
      </template>

      <textarea
        v-else
        v-model="model"
        :class="`${rootClass}__textarea`"
        rows="10"
      />
      </div>
    </div>
  </MiraiCmsFieldWrapper>
</template>

<style scoped lang="scss">
@use "../../assets/styles" as *;

$root: '.miraicms-wysiwyg-field';

#{$root} {
  &__wrap {
    width: 100%;
    max-width: 100%;
    border: 1px solid $color-border;
    border-radius: $border-radius;
    overflow: hidden;
    background: $color-surface;
  }

  &__tabs {
    display: flex;
    border-bottom: 1px solid $color-border;
  }

  &__tab {
    padding: 8px 14px;
    background-color: $color-bg;
    border: 0;
    border-right: 1px solid $color-border;
    color: $color-muted;
    cursor: pointer;

    &.is-active {
      background-color: $color-surface;
      color: $color-ink;
      font-weight: 600;
    }

    &:focus-visible {
      outline: 2px solid $color-accent;
      outline-offset: -2px;
    }
  }

  &__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    padding: 6px;
    background-color: $color-bg;
    border-bottom: 1px solid $color-border;
  }

  &__group {
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }

  &__sep {
    width: 1px;
    height: 22px;
    margin: 0 4px;
    background: $color-border;
  }

  &__select {
    height: 30px;
    max-width: 160px;
    padding: 0 6px;
    background-color: $color-surface;
    border: 1px solid $color-border;
    border-radius: $border-radius-inter;
    color: $color-ink;
    font-size: 12px;
    cursor: pointer;

    &.is-active {
      border-color: $color-accent;
      color: $color-accent;
    }

    &:focus-visible {
      outline: 2px solid $color-accent;
      outline-offset: 1px;
    }
  }

  &__btn {
    min-width: 32px;
    height: 30px;
    padding: 0 5px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    background-color: $color-surface;
    border: 1px solid $color-border;
    border-radius: $border-radius-inter;
    color: $color-ink;
    font-size: 12px;
    line-height: 1;
    cursor: pointer;
    user-select: none;

    &--primary {
      background: $color-accent;
      border-color: $color-accent;
      color: $color-surface;

      &:hover {
        background: $color-accent-hover;
        border-color: $color-accent-hover;
      }
    }

    &.is-active {
      background-color: $color-accent-wash;
      border-color: $color-accent;
      color: $color-accent;
    }

    &:hover {
      background-color: $color-accent-wash;
    }

    &:focus-visible {
      outline: 2px solid $color-accent;
      outline-offset: 1px;
    }

    svg {
      display: block;

      path {
        fill: $color-muted;
      }
    }
  }

  &__link-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    padding: 8px;
    background: $color-bg;
    border-bottom: 1px solid $color-border;
  }

  &__link-label {
    font-size: 12px;
    color: $color-muted;
  }

  &__link-input {
    flex: 1;
    min-width: 180px;
    height: 30px;
    padding: 0 8px;
    border: 1px solid $color-border;
    border-radius: $border-radius-inter;
    background: $color-surface;
    color: $color-ink;

    &:focus {
      outline: none;
      border-color: $color-accent;
    }
  }

  &__content {
    padding: 12px;

    :deep(.miraicms-wysiwyg-field__editable) {
      min-height: 180px;
      outline: none;
      color: $color-ink;

      > * + * {
        margin-top: 0.75em;
      }

      h1 {
        font-size: 2em;
        font-weight: 700;
      }

      h2 {
        font-size: 1.5em;
        font-weight: 700;
      }

      h3 {
        font-size: 1.25em;
        font-weight: 650;
      }

      h4 {
        font-size: 1.1em;
        font-weight: 650;
      }

      h5 {
        font-size: 1em;
        font-weight: 600;
      }

      h6 {
        font-size: 0.9em;
        font-weight: 600;
      }

      ul,
      ol {
        padding-left: 1.25em;
      }

      blockquote {
        margin: 0;
        padding-left: 0.9em;
        border-left: 3px solid $color-border;
        color: $color-muted;
      }

      code {
        padding: 0.1em 0.35em;
        border-radius: 3px;
        background: $color-bg;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 0.9em;
      }

      pre {
        margin: 0;
        padding: 0.75em 1em;
        border-radius: $border-radius-inter;
        background: $color-bg;
        overflow: auto;

        code {
          padding: 0;
          background: transparent;
        }
      }

      a {
        color: $color-accent;
        text-decoration: underline;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        overflow: hidden;
      }

      td,
      th {
        min-width: 80px;
        padding: 6px 8px;
        border: 1px solid $color-border;
        vertical-align: top;
        box-sizing: border-box;
        position: relative;
      }

      th {
        background: $color-bg;
        font-weight: 600;
        text-align: left;
      }

      .selectedCell::after {
        content: '';
        position: absolute;
        inset: 0;
        background: rgba($color-accent, 0.12);
        pointer-events: none;
        z-index: 1;
      }

      .column-resize-handle {
        position: absolute;
        right: -2px;
        top: 0;
        bottom: 0;
        width: 4px;
        background: $color-accent;
        pointer-events: none;
      }

      &.resize-cursor {
        cursor: col-resize;
      }
    }
  }

  &__textarea {
    width: 100%;
    border: 0;
    padding: 10px;
    resize: vertical;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    color: $color-ink;
    background: $color-surface;

    &:focus {
      outline: none;
    }

    &:focus-visible {
      box-shadow: inset 0 0 0 2px $color-accent;
    }
  }
}
</style>
